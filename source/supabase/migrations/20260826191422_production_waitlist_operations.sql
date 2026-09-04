-- Production operations for waitlist and retroactive services.
-- Direct table mutations are blocked; authenticated writes go through validated RPCs.

-- Waitlist visibility follows the API: owner, manager and receptionist operate it.
drop policy if exists waiting_list_entries_member_read on public.waiting_list_entries;
drop policy if exists waiting_list_entries_staff_insert on public.waiting_list_entries;
drop policy if exists waiting_list_entries_staff_update on public.waiting_list_entries;
drop policy if exists waiting_list_entries_manager_delete on public.waiting_list_entries;

create policy waiting_list_entries_operator_read
on public.waiting_list_entries
for select
to authenticated
using (
  app_private.has_business_role(
    business_id,
    array['owner','manager','receptionist']::public.member_role[]
  )
);

revoke insert, update, delete on public.waiting_list_entries from authenticated;

create or replace function app_private.create_waitlist_entry_internal(
  p_business_id uuid,
  p_client_id uuid,
  p_service_id uuid,
  p_professional_id uuid,
  p_desired_from timestamptz,
  p_desired_to timestamptz,
  p_notes text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, auth, app_private, extensions
set row_security = off
as $$
declare
  v_entry_id uuid := extensions.gen_random_uuid();
  v_actor_name text;
begin
  if not app_private.has_business_role(
    p_business_id,
    array['owner','manager','receptionist']::public.member_role[]
  ) then
    raise exception 'Sem permissão para operar a lista de espera.'
      using errcode = '42501';
  end if;

  if p_desired_from is null
    or p_desired_to is null
    or p_desired_to <= p_desired_from then
    raise exception 'Informe cliente, serviço e uma janela de interesse válida.'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.business_settings s
    where s.business_id = p_business_id
      and s.allow_waitlist
  ) then
    raise exception 'A lista de espera está desativada nas regras de agendamento.'
      using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.clients c
    where c.business_id = p_business_id
      and c.id = p_client_id
      and c.status <> 'archived'
  ) then
    raise exception 'Cliente não encontrado nesta barbearia.'
      using errcode = '23503';
  end if;

  if not exists (
    select 1
    from public.services s
    where s.business_id = p_business_id
      and s.id = p_service_id
      and s.active
  ) then
    raise exception 'Serviço indisponível nesta barbearia.'
      using errcode = '23503';
  end if;

  if p_professional_id is not null then
    if not exists (
      select 1
      from public.professionals p
      where p.business_id = p_business_id
        and p.id = p_professional_id
        and p.active
        and p.serves_clients
    ) then
      raise exception 'O profissional escolhido não está disponível.'
        using errcode = '23503';
    end if;

    if not app_private.service_allowed_for_professional(
      p_business_id,
      p_service_id,
      p_professional_id
    ) then
      raise exception 'O profissional escolhido não realiza esse serviço.'
        using errcode = '23514';
    end if;
  end if;

  if exists (
    select 1
    from public.waiting_list_entries w
    where w.business_id = p_business_id
      and w.client_id = p_client_id
      and w.service_id = p_service_id
      and w.professional_id is not distinct from p_professional_id
      and w.status in ('waiting','contacted')
      and tstzrange(w.desired_from, w.desired_to, '[)')
        && tstzrange(p_desired_from, p_desired_to, '[)')
  ) then
    raise exception 'Esse cliente já está na lista de espera para uma janela compatível.'
      using errcode = '23505';
  end if;

  v_actor_name := app_private.agenda_actor_name(p_business_id);

  insert into public.waiting_list_entries (
    id,
    business_id,
    client_id,
    service_id,
    professional_id,
    desired_from,
    desired_to,
    notes,
    status,
    created_by
  ) values (
    v_entry_id,
    p_business_id,
    p_client_id,
    p_service_id,
    p_professional_id,
    p_desired_from,
    p_desired_to,
    nullif(trim(coalesce(p_notes, '')), ''),
    'waiting',
    auth.uid()
  );

  insert into public.audit_logs (
    business_id,
    action,
    entity_type,
    entity_id,
    actor_user_id,
    actor_name,
    metadata
  ) values (
    p_business_id,
    'waitlist.created',
    'waitlist_entry',
    v_entry_id,
    auth.uid(),
    v_actor_name,
    jsonb_build_object(
      'clientId', p_client_id,
      'serviceId', p_service_id,
      'professionalId', p_professional_id
    )
  );

  return v_entry_id;
end;
$$;

create or replace function public.create_waitlist_entry(
  p_business_id uuid,
  p_client_id uuid,
  p_service_id uuid,
  p_professional_id uuid,
  p_desired_from timestamptz,
  p_desired_to timestamptz,
  p_notes text default null
)
returns uuid
language sql
volatile
security invoker
set search_path = pg_catalog, public, app_private
as $$
  select app_private.create_waitlist_entry_internal(
    p_business_id,
    p_client_id,
    p_service_id,
    p_professional_id,
    p_desired_from,
    p_desired_to,
    p_notes
  );
$$;

create or replace function app_private.set_waitlist_status_internal(
  p_business_id uuid,
  p_entry_id uuid,
  p_status public.waitlist_status
)
returns uuid
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, auth, app_private
set row_security = off
as $$
declare
  v_entry public.waiting_list_entries%rowtype;
  v_previous public.waitlist_status;
  v_allowed boolean := false;
  v_actor_name text;
begin
  if not app_private.has_business_role(
    p_business_id,
    array['owner','manager','receptionist']::public.member_role[]
  ) then
    raise exception 'Sem permissão para operar a lista de espera.'
      using errcode = '42501';
  end if;

  select *
  into v_entry
  from public.waiting_list_entries w
  where w.business_id = p_business_id
    and w.id = p_entry_id
  for update;

  if not found then
    raise exception 'Entrada da lista de espera não encontrada.'
      using errcode = 'P0002';
  end if;

  v_previous := v_entry.status;
  if v_previous = p_status then
    raise exception 'Essa entrada já está nesse status.'
      using errcode = '23514';
  end if;

  v_allowed :=
    (v_previous = 'waiting' and p_status in ('contacted','booked','cancelled'))
    or (v_previous = 'contacted' and p_status in ('waiting','booked','cancelled'));

  if not v_allowed then
    raise exception 'Essa mudança não faz parte do fluxo da lista de espera.'
      using errcode = '23514';
  end if;

  update public.waiting_list_entries
  set status = p_status
  where business_id = p_business_id
    and id = p_entry_id;

  v_actor_name := app_private.agenda_actor_name(p_business_id);
  insert into public.audit_logs (
    business_id,
    action,
    entity_type,
    entity_id,
    actor_user_id,
    actor_name,
    metadata
  ) values (
    p_business_id,
    'waitlist.status_changed',
    'waitlist_entry',
    p_entry_id,
    auth.uid(),
    v_actor_name,
    jsonb_build_object('previousStatus', v_previous, 'status', p_status)
  );

  return p_entry_id;
end;
$$;

create or replace function public.set_waitlist_status(
  p_business_id uuid,
  p_entry_id uuid,
  p_status public.waitlist_status
)
returns uuid
language sql
volatile
security invoker
set search_path = pg_catalog, public, app_private
as $$
  select app_private.set_waitlist_status_internal(
    p_business_id,
    p_entry_id,
    p_status
  );
$$;

revoke all on function app_private.create_waitlist_entry_internal(
  uuid, uuid, uuid, uuid, timestamptz, timestamptz, text
) from public, anon, authenticated;
revoke all on function app_private.set_waitlist_status_internal(
  uuid, uuid, public.waitlist_status
) from public, anon, authenticated;
revoke all on function public.create_waitlist_entry(
  uuid, uuid, uuid, uuid, timestamptz, timestamptz, text
) from public, anon;
revoke all on function public.set_waitlist_status(
  uuid, uuid, public.waitlist_status
) from public, anon;
grant execute on function public.create_waitlist_entry(
  uuid, uuid, uuid, uuid, timestamptz, timestamptz, text
) to authenticated;
grant execute on function public.set_waitlist_status(
  uuid, uuid, public.waitlist_status
) to authenticated;
