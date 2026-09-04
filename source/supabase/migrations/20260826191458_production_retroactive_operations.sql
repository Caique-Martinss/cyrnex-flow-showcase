-- Retroactive request visibility is private to the requester unless the user is owner/manager.
drop policy if exists retroactive_member_read on public.retroactive_service_requests;
drop policy if exists retroactive_staff_insert on public.retroactive_service_requests;
drop policy if exists retroactive_manager_update on public.retroactive_service_requests;
drop policy if exists retroactive_manager_delete on public.retroactive_service_requests;

create policy retroactive_scoped_read
on public.retroactive_service_requests
for select
to authenticated
using (
  app_private.has_business_role(
    business_id,
    array['owner','manager']::public.member_role[]
  )
  or requested_by = (select auth.uid())
);

revoke insert, update, delete on public.retroactive_service_requests from authenticated;

create or replace function app_private.retroactive_conflict_internal(
  p_business_id uuid,
  p_professional_id uuid,
  p_starts_at timestamptz,
  p_duration_minutes integer,
  p_buffer_minutes integer
)
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
set row_security = off
as $$
  select a.id
  from public.appointments a
  where a.business_id = p_business_id
    and a.professional_id = p_professional_id
    and a.status not in ('cancelled','missed')
    and not a.recurrence_paused
    and tstzrange(a.starts_at, a.occupied_until, '[)')
      && tstzrange(
        p_starts_at,
        p_starts_at + make_interval(
          mins => p_duration_minutes + p_buffer_minutes
        ),
        '[)'
      )
  order by a.starts_at
  limit 1;
$$;

create or replace function app_private.create_retroactive_request_internal(
  p_business_id uuid,
  p_client_id uuid,
  p_service_id uuid,
  p_professional_id uuid,
  p_starts_at timestamptz,
  p_price numeric,
  p_payment_method public.payment_method,
  p_notes text,
  p_reason text,
  p_proof_type public.retroactive_proof_type,
  p_proof_reference text,
  p_proof_description text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, auth, app_private, extensions
set row_security = off
as $$
declare
  v_request_id uuid := extensions.gen_random_uuid();
  v_role public.member_role;
  v_actor_name text;
  v_service public.services%rowtype;
  v_conflict_id uuid;
begin
  select bm.role, bm.display_name
  into v_role, v_actor_name
  from public.business_members bm
  where bm.business_id = p_business_id
    and bm.user_id = auth.uid()
    and bm.active
    and bm.role in ('owner','manager','professional','receptionist')
  limit 1;

  if not found then
    raise exception 'Sem permissão para registrar atendimento passado.'
      using errcode = '42501';
  end if;

  if p_starts_at is null or p_starts_at >= now() then
    raise exception 'O atendimento passado precisa ter uma data e hora anteriores ao momento atual.'
      using errcode = '22023';
  end if;

  if p_price is null or p_price < 0 then
    raise exception 'Informe o valor real cobrado no atendimento.'
      using errcode = '22023';
  end if;

  if char_length(trim(coalesce(p_proof_description, ''))) < 5 then
    raise exception 'Informe como esse atendimento pode ser comprovado e descreva a evidência.'
      using errcode = '22023';
  end if;

  if char_length(trim(coalesce(p_proof_reference, ''))) < 3 then
    raise exception 'Informe uma referência verificável da comprovação.'
      using errcode = '22023';
  end if;

  if char_length(trim(coalesce(p_reason, ''))) < 5 then
    raise exception 'Explique por que o atendimento não foi registrado no momento correto.'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.clients c
    where c.business_id = p_business_id
      and c.id = p_client_id
      and c.status <> 'archived'
  ) then
    raise exception 'Selecione cliente, serviço e profissional cadastrados.'
      using errcode = '23503';
  end if;

  select *
  into v_service
  from public.services s
  where s.business_id = p_business_id
    and s.id = p_service_id
    and s.active;

  if not found then
    raise exception 'Selecione cliente, serviço e profissional cadastrados.'
      using errcode = '23503';
  end if;

  if not exists (
    select 1
    from public.professionals p
    where p.business_id = p_business_id
      and p.id = p_professional_id
      and p.active
      and p.serves_clients
  ) then
    raise exception 'Selecione cliente, serviço e profissional cadastrados.'
      using errcode = '23503';
  end if;

  if not app_private.service_allowed_for_professional(
    p_business_id,
    p_service_id,
    p_professional_id
  ) then
    raise exception 'Esse profissional não está habilitado para realizar o serviço escolhido.'
      using errcode = '23514';
  end if;

  v_conflict_id := app_private.retroactive_conflict_internal(
    p_business_id,
    p_professional_id,
    p_starts_at,
    v_service.duration_minutes,
    v_service.buffer_after_minutes
  );

  insert into public.retroactive_service_requests (
    id,
    business_id,
    client_id,
    service_id,
    professional_id,
    starts_at,
    price,
    payment_method,
    notes,
    reason,
    proof_type,
    proof_reference,
    proof_description,
    status,
    requested_by,
    requested_by_name,
    requested_by_role,
    conflict_appointment_id
  ) values (
    v_request_id,
    p_business_id,
    p_client_id,
    p_service_id,
    p_professional_id,
    p_starts_at,
    p_price,
    p_payment_method,
    nullif(trim(coalesce(p_notes, '')), ''),
    trim(p_reason),
    p_proof_type,
    trim(p_proof_reference),
    trim(p_proof_description),
    'pending',
    auth.uid(),
    v_actor_name,
    v_role,
    v_conflict_id
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
    'retroactive_service.requested',
    'retroactive_service_request',
    v_request_id,
    auth.uid(),
    v_actor_name,
    jsonb_build_object(
      'startsAt', p_starts_at,
      'price', p_price,
      'proofType', p_proof_type,
      'professionalId', p_professional_id,
      'conflictAppointmentId', v_conflict_id
    )
  );

  return v_request_id;
end;
$$;

create or replace function public.create_retroactive_request(
  p_business_id uuid,
  p_client_id uuid,
  p_service_id uuid,
  p_professional_id uuid,
  p_starts_at timestamptz,
  p_price numeric,
  p_payment_method public.payment_method,
  p_notes text,
  p_reason text,
  p_proof_type public.retroactive_proof_type,
  p_proof_reference text,
  p_proof_description text
)
returns uuid
language sql
volatile
security invoker
set search_path = pg_catalog, public, app_private
as $$
  select app_private.create_retroactive_request_internal(
    p_business_id,
    p_client_id,
    p_service_id,
    p_professional_id,
    p_starts_at,
    p_price,
    p_payment_method,
    p_notes,
    p_reason,
    p_proof_type,
    p_proof_reference,
    p_proof_description
  );
$$;

create or replace function app_private.approve_retroactive_request_internal(
  p_business_id uuid,
  p_request_id uuid,
  p_evidence_confirmed boolean,
  p_confirm_conflict boolean,
  p_conflict_justification text,
  p_review_note text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, auth, app_private, extensions
set row_security = off
as $$
declare
  v_request public.retroactive_service_requests%rowtype;
  v_reviewer_role public.member_role;
  v_reviewer_name text;
  v_service public.services%rowtype;
  v_professional public.professionals%rowtype;
  v_conflict_id uuid;
  v_appointment_id uuid := extensions.gen_random_uuid();
  v_completed_at timestamptz;
  v_commission numeric(12,2);
  v_net numeric(12,2);
begin
  select bm.role, bm.display_name
  into v_reviewer_role, v_reviewer_name
  from public.business_members bm
  where bm.business_id = p_business_id
    and bm.user_id = auth.uid()
    and bm.active
    and bm.role in ('owner','manager')
  limit 1;

  if not found then
    raise exception 'Somente dono ou gerente pode aprovar um atendimento lançado depois.'
      using errcode = '42501';
  end if;

  if not p_evidence_confirmed then
    raise exception 'Confirme que a evidência foi realmente conferida antes de aprovar o lançamento.'
      using errcode = '22023';
  end if;

  select *
  into v_request
  from public.retroactive_service_requests r
  where r.business_id = p_business_id
    and r.id = p_request_id
  for update;

  if not found then
    raise exception 'Solicitação não encontrada.' using errcode = 'P0002';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Essa solicitação já foi analisada.' using errcode = '23514';
  end if;

  if v_reviewer_role = 'manager'
    and v_request.requested_by_role not in ('professional','receptionist') then
    raise exception
      'Gerentes só podem aprovar lançamentos feitos por profissionais ou recepcionistas.'
      using errcode = '42501';
  end if;

  if v_request.requested_by = auth.uid() and v_reviewer_role <> 'owner' then
    raise exception 'Você não pode aprovar o próprio lançamento.'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.clients c
    where c.business_id = p_business_id
      and c.id = v_request.client_id
      and c.status <> 'archived'
  ) then
    raise exception 'Os dados originais mudaram. Revise cliente, serviço e profissional antes de aprovar.'
      using errcode = '23514';
  end if;

  select *
  into v_service
  from public.services s
  where s.business_id = p_business_id
    and s.id = v_request.service_id
    and s.active;

  if not found then
    raise exception 'Os dados originais mudaram. Revise cliente, serviço e profissional antes de aprovar.'
      using errcode = '23514';
  end if;

  select *
  into v_professional
  from public.professionals p
  where p.business_id = p_business_id
    and p.id = v_request.professional_id
    and p.active
    and p.serves_clients;

  if not found then
    raise exception 'Os dados originais mudaram. Revise cliente, serviço e profissional antes de aprovar.'
      using errcode = '23514';
  end if;

  if not app_private.service_allowed_for_professional(
    p_business_id,
    v_request.service_id,
    v_request.professional_id
  ) then
    raise exception 'Os dados originais mudaram. Revise cliente, serviço e profissional antes de aprovar.'
      using errcode = '23514';
  end if;

  v_conflict_id := app_private.retroactive_conflict_internal(
    p_business_id,
    v_request.professional_id,
    v_request.starts_at,
    v_service.duration_minutes,
    v_service.buffer_after_minutes
  );

  if v_conflict_id is not null and (
    not p_confirm_conflict
    or char_length(trim(coalesce(p_conflict_justification, ''))) < 5
  ) then
    raise exception
      'Existe outro atendimento no mesmo período. Confirme o conflito e registre uma justificativa.'
      using errcode = '23P01', detail = v_conflict_id::text;
  end if;

  v_completed_at := v_request.starts_at
    + make_interval(mins => v_service.duration_minutes);
  v_commission := round(
    v_request.price
      * case
        when v_professional.receives_commission
          then v_professional.commission_percent
        else 0
      end
      / 100,
    2
  );
  v_net := greatest(0, round(v_request.price - v_commission, 2));

  insert into public.appointments (
    id,
    business_id,
    client_id,
    professional_id,
    service_id,
    starts_at,
    ends_at,
    occupied_until,
    status,
    source,
    service_name_snapshot,
    professional_name_snapshot,
    duration_minutes_snapshot,
    buffer_after_minutes_snapshot,
    base_price,
    deposit_percent,
    deposit_amount,
    deposit_status,
    payment_method,
    commission_percent_snapshot,
    commission_amount,
    net_amount,
    notes,
    created_by,
    actual_started_at,
    completed_at,
    fit_in_conflict_appointment_id,
    fit_in_reason
  ) values (
    v_appointment_id,
    p_business_id,
    v_request.client_id,
    v_request.professional_id,
    v_request.service_id,
    v_request.starts_at,
    v_completed_at,
    v_completed_at + make_interval(mins => v_service.buffer_after_minutes),
    'completed',
    'retroactive',
    v_service.name,
    v_professional.name,
    v_service.duration_minutes,
    v_service.buffer_after_minutes,
    v_request.price,
    0,
    0,
    'waived',
    v_request.payment_method,
    case
      when v_professional.receives_commission
        then v_professional.commission_percent
      else 0
    end,
    v_commission,
    v_net,
    v_request.notes,
    v_request.requested_by,
    v_request.starts_at,
    v_completed_at,
    v_conflict_id,
    case
      when v_conflict_id is null then null
      else trim(p_conflict_justification)
    end
  );

  insert into public.appointment_events (
    business_id,
    appointment_id,
    event_type,
    notes,
    actor_user_id,
    actor_name,
    created_at
  ) values
  (
    p_business_id,
    v_appointment_id,
    'created',
    'Atendimento passado solicitado para revisão.',
    v_request.requested_by,
    v_request.requested_by_name,
    v_request.requested_at
  ),
  (
    p_business_id,
    v_appointment_id,
    'started',
    'Horário real informado no lançamento retroativo.',
    v_request.requested_by,
    v_request.requested_by_name,
    v_request.starts_at
  ),
  (
    p_business_id,
    v_appointment_id,
    'completed',
    'Atendimento passado aprovado e concluído.',
    auth.uid(),
    v_reviewer_name,
    v_completed_at
  );

  if v_conflict_id is not null then
    insert into public.appointment_events (
      business_id,
      appointment_id,
      event_type,
      notes,
      actor_user_id,
      actor_name
    ) values (
      p_business_id,
      v_appointment_id,
      'fit_in_confirmed',
      'Conflito retroativo aprovado: ' || trim(p_conflict_justification),
      auth.uid(),
      v_reviewer_name
    );
  end if;

  update public.retroactive_service_requests
  set status = 'approved',
      evidence_confirmed = true,
      reviewed_by = auth.uid(),
      reviewed_by_name = v_reviewer_name,
      reviewed_at = now(),
      review_note = nullif(trim(coalesce(p_review_note, '')), ''),
      created_appointment_id = v_appointment_id,
      conflict_appointment_id = v_conflict_id,
      conflict_confirmed = v_conflict_id is not null,
      conflict_justification = case
        when v_conflict_id is null then null
        else trim(p_conflict_justification)
      end
  where business_id = p_business_id
    and id = p_request_id;

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
    'retroactive_service.approved',
    'retroactive_service_request',
    p_request_id,
    auth.uid(),
    v_reviewer_name,
    jsonb_build_object(
      'appointmentId', v_appointment_id,
      'selfApproval', v_request.requested_by = auth.uid(),
      'evidenceConfirmed', true,
      'conflictAppointmentId', v_conflict_id,
      'conflictConfirmed', v_conflict_id is not null
    )
  );

  return jsonb_build_object(
    'requestId', p_request_id,
    'appointmentId', v_appointment_id
  );
end;
$$;

create or replace function public.approve_retroactive_request(
  p_business_id uuid,
  p_request_id uuid,
  p_evidence_confirmed boolean,
  p_confirm_conflict boolean,
  p_conflict_justification text,
  p_review_note text default null
)
returns jsonb
language sql
volatile
security invoker
set search_path = pg_catalog, public, app_private
as $$
  select app_private.approve_retroactive_request_internal(
    p_business_id,
    p_request_id,
    p_evidence_confirmed,
    p_confirm_conflict,
    p_conflict_justification,
    p_review_note
  );
$$;

create or replace function app_private.reject_retroactive_request_internal(
  p_business_id uuid,
  p_request_id uuid,
  p_review_note text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, auth, app_private
set row_security = off
as $$
declare
  v_request public.retroactive_service_requests%rowtype;
  v_reviewer_role public.member_role;
  v_reviewer_name text;
begin
  select bm.role, bm.display_name
  into v_reviewer_role, v_reviewer_name
  from public.business_members bm
  where bm.business_id = p_business_id
    and bm.user_id = auth.uid()
    and bm.active
    and bm.role in ('owner','manager')
  limit 1;

  if not found then
    raise exception 'Somente dono ou gerente pode rejeitar esse lançamento.'
      using errcode = '42501';
  end if;

  if char_length(trim(coalesce(p_review_note, ''))) < 3 then
    raise exception 'Explique brevemente por que o lançamento foi rejeitado.'
      using errcode = '22023';
  end if;

  select *
  into v_request
  from public.retroactive_service_requests r
  where r.business_id = p_business_id
    and r.id = p_request_id
  for update;

  if not found then
    raise exception 'Solicitação não encontrada.' using errcode = 'P0002';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Essa solicitação já foi analisada.' using errcode = '23514';
  end if;

  if v_reviewer_role = 'manager'
    and v_request.requested_by_role not in ('professional','receptionist') then
    raise exception
      'Gerentes só podem revisar lançamentos feitos por profissionais ou recepcionistas.'
      using errcode = '42501';
  end if;

  if v_request.requested_by = auth.uid() and v_reviewer_role <> 'owner' then
    raise exception 'Você não pode revisar o próprio lançamento.'
      using errcode = '42501';
  end if;

  update public.retroactive_service_requests
  set status = 'rejected',
      reviewed_by = auth.uid(),
      reviewed_by_name = v_reviewer_name,
      reviewed_at = now(),
      review_note = trim(p_review_note)
  where business_id = p_business_id
    and id = p_request_id;

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
    'retroactive_service.rejected',
    'retroactive_service_request',
    p_request_id,
    auth.uid(),
    v_reviewer_name,
    jsonb_build_object('reviewNote', trim(p_review_note))
  );

  return p_request_id;
end;
$$;

create or replace function public.reject_retroactive_request(
  p_business_id uuid,
  p_request_id uuid,
  p_review_note text
)
returns uuid
language sql
volatile
security invoker
set search_path = pg_catalog, public, app_private
as $$
  select app_private.reject_retroactive_request_internal(
    p_business_id,
    p_request_id,
    p_review_note
  );
$$;

revoke all on function app_private.retroactive_conflict_internal(
  uuid, uuid, timestamptz, integer, integer
) from public, anon, authenticated;
revoke all on function app_private.create_retroactive_request_internal(
  uuid, uuid, uuid, uuid, timestamptz, numeric, public.payment_method,
  text, text, public.retroactive_proof_type, text, text
) from public, anon, authenticated;
revoke all on function app_private.approve_retroactive_request_internal(
  uuid, uuid, boolean, boolean, text, text
) from public, anon, authenticated;
revoke all on function app_private.reject_retroactive_request_internal(
  uuid, uuid, text
) from public, anon, authenticated;
revoke all on function public.create_retroactive_request(
  uuid, uuid, uuid, uuid, timestamptz, numeric, public.payment_method,
  text, text, public.retroactive_proof_type, text, text
) from public, anon;
revoke all on function public.approve_retroactive_request(
  uuid, uuid, boolean, boolean, text, text
) from public, anon;
revoke all on function public.reject_retroactive_request(
  uuid, uuid, text
) from public, anon;
grant execute on function public.create_retroactive_request(
  uuid, uuid, uuid, uuid, timestamptz, numeric, public.payment_method,
  text, text, public.retroactive_proof_type, text, text
) to authenticated;
grant execute on function public.approve_retroactive_request(
  uuid, uuid, boolean, boolean, text, text
) to authenticated;
grant execute on function public.reject_retroactive_request(
  uuid, uuid, text
) to authenticated;
