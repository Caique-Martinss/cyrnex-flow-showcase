create or replace function app_private.get_agenda_availability_internal(
  p_business_id uuid,
  p_service_id uuid,
  p_professional_id uuid,
  p_date date,
  p_ignored_appointment_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth, app_private
set row_security = off
as $$
declare
  v_timezone text;
  v_interval integer;
  v_duration integer;
  v_buffer integer;
  v_custom boolean;
  v_weekday smallint;
  v_business record;
  v_professional record;
  v_segment_start time;
  v_segment_end time;
  v_slot_time time;
  v_slot_start timestamptz;
  v_slot_end timestamptz;
  v_validation jsonb;
  v_status text;
  v_reason text;
  v_slots jsonb := '[]'::jsonb;
  v_has_segment boolean := false;
  v_ignored uuid[] := '{}'::uuid[];
begin
  if not app_private.is_business_member(p_business_id) then
    raise exception 'Sem acesso a esta barbearia.' using errcode = '42501';
  end if;

  select
    b.timezone,
    greatest(5, s.booking_slot_interval_minutes)
  into v_timezone, v_interval
  from public.businesses b
  join public.business_settings s on s.business_id = b.id
  where b.id = p_business_id
    and b.status = 'active';

  if not found then
    raise exception 'Barbearia indisponível.' using errcode = 'P0002';
  end if;

  select s.duration_minutes, s.buffer_after_minutes
  into v_duration, v_buffer
  from public.services s
  where s.business_id = p_business_id
    and s.id = p_service_id
    and s.active;

  if not found then
    raise exception 'Serviço indisponível nesta barbearia.' using errcode = '23503';
  end if;

  select p.uses_custom_schedule
  into v_custom
  from public.professionals p
  where p.business_id = p_business_id
    and p.id = p_professional_id
    and p.active
    and p.serves_clients;

  if not found then
    raise exception 'Profissional indisponível nesta barbearia.' using errcode = '23503';
  end if;

  if not app_private.service_allowed_for_professional(
    p_business_id,
    p_service_id,
    p_professional_id
  ) then
    raise exception 'Esse profissional não está habilitado para realizar o serviço escolhido.'
      using errcode = '23514';
  end if;

  if p_ignored_appointment_id is not null then
    v_ignored := array[p_ignored_appointment_id];
  end if;

  v_weekday := extract(dow from p_date)::smallint;

  for v_business in
    select h.opens_at, h.closes_at
    from public.business_hours h
    where h.business_id = p_business_id
      and h.weekday = v_weekday
      and (h.valid_from is null or h.valid_from <= p_date)
      and (h.valid_until is null or h.valid_until >= p_date)
    order by h.opens_at
  loop
    if v_custom then
      for v_professional in
        select ph.starts_at, ph.ends_at
        from public.professional_hours ph
        where ph.business_id = p_business_id
          and ph.professional_id = p_professional_id
          and ph.weekday = v_weekday
          and (ph.valid_from is null or ph.valid_from <= p_date)
          and (ph.valid_until is null or ph.valid_until >= p_date)
        order by ph.starts_at
      loop
        v_segment_start := greatest(v_business.opens_at, v_professional.starts_at);
        v_segment_end := least(v_business.closes_at, v_professional.ends_at);
        if v_segment_start < v_segment_end then
          v_has_segment := true;
          v_slot_time := v_segment_start;
          while v_slot_time + make_interval(mins => v_duration + v_buffer)
            <= v_segment_end loop
            v_slot_start := (p_date + v_slot_time) at time zone v_timezone;
            v_slot_end := v_slot_start + make_interval(mins => v_duration);
            v_validation := app_private.agenda_slot_validation_internal(
              p_business_id,
              p_professional_id,
              v_slot_start,
              v_duration,
              v_buffer,
              v_ignored,
              true
            );
            v_status := case v_validation ->> 'kind'
              when 'available' then 'available'
              when 'occupied' then 'occupied'
              when 'past' then 'past'
              else 'blocked'
            end;
            v_reason := case when v_status = 'available'
              then null
              else v_validation ->> 'message'
            end;
            v_slots := v_slots || jsonb_build_array(jsonb_build_object(
              'start', v_slot_start,
              'end', v_slot_end,
              'label', to_char(v_slot_time, 'HH24:MI'),
              'status', v_status,
              'reason', v_reason
            ));
            v_slot_time := v_slot_time + make_interval(mins => v_interval);
          end loop;
        end if;
      end loop;
    else
      v_segment_start := v_business.opens_at;
      v_segment_end := v_business.closes_at;
      v_has_segment := true;
      v_slot_time := v_segment_start;
      while v_slot_time + make_interval(mins => v_duration + v_buffer)
        <= v_segment_end loop
        v_slot_start := (p_date + v_slot_time) at time zone v_timezone;
        v_slot_end := v_slot_start + make_interval(mins => v_duration);
        v_validation := app_private.agenda_slot_validation_internal(
          p_business_id,
          p_professional_id,
          v_slot_start,
          v_duration,
          v_buffer,
          v_ignored,
          true
        );
        v_status := case v_validation ->> 'kind'
          when 'available' then 'available'
          when 'occupied' then 'occupied'
          when 'past' then 'past'
          else 'blocked'
        end;
        v_reason := case when v_status = 'available'
          then null
          else v_validation ->> 'message'
        end;
        v_slots := v_slots || jsonb_build_array(jsonb_build_object(
          'start', v_slot_start,
          'end', v_slot_end,
          'label', to_char(v_slot_time, 'HH24:MI'),
          'status', v_status,
          'reason', v_reason
        ));
        v_slot_time := v_slot_time + make_interval(mins => v_interval);
      end loop;
    end if;
  end loop;

  return jsonb_build_object(
    'date', p_date::text,
    'closed', not v_has_segment,
    'slots', v_slots
  );
end;
$$;

create or replace function public.get_agenda_availability(
  p_business_id uuid,
  p_service_id uuid,
  p_professional_id uuid,
  p_date date,
  p_ignored_appointment_id uuid default null
)
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, public, app_private
as $$
  select app_private.get_agenda_availability_internal(
    p_business_id,
    p_service_id,
    p_professional_id,
    p_date,
    p_ignored_appointment_id
  );
$$;

create or replace function app_private.create_schedule_block_internal(
  p_business_id uuid,
  p_professional_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_block_type public.schedule_block_type,
  p_reason text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, auth, app_private, extensions
set row_security = off
as $$
declare
  v_block_id uuid := extensions.gen_random_uuid();
  v_actor_name text;
begin
  if not app_private.has_business_role(
    p_business_id,
    array['owner','manager','receptionist']::public.member_role[]
  ) then
    raise exception 'Sem permissão para criar bloqueios.' using errcode = '42501';
  end if;

  if p_ends_at <= p_starts_at or char_length(trim(coalesce(p_reason, ''))) < 3 then
    raise exception 'Informe início, fim, tipo e motivo do bloqueio corretamente.'
      using errcode = '22023';
  end if;

  if p_professional_id is not null and not exists (
    select 1
    from public.professionals p
    where p.business_id = p_business_id
      and p.id = p_professional_id
      and p.active
  ) then
    raise exception 'Profissional não encontrado.' using errcode = '23503';
  end if;

  if exists (
    select 1
    from public.appointments a
    where a.business_id = p_business_id
      and a.status in ('scheduled','confirmed','arrived','in_service')
      and not a.recurrence_paused
      and (p_professional_id is null or a.professional_id = p_professional_id)
      and tstzrange(a.starts_at, a.occupied_until, '[)')
        && tstzrange(p_starts_at, p_ends_at, '[)')
  ) then
    raise exception 'Já existe atendimento nesse período. Reagende ou cancele antes de bloquear.'
      using errcode = '23P01';
  end if;

  if exists (
    select 1
    from public.schedule_blocks b
    where b.business_id = p_business_id
      and (
        p_professional_id is null
        or b.professional_id is null
        or b.professional_id = p_professional_id
      )
      and tstzrange(b.starts_at, b.ends_at, '[)')
        && tstzrange(p_starts_at, p_ends_at, '[)')
  ) then
    raise exception 'Esse período já possui um bloqueio. Ajuste o horário ou remova o existente.'
      using errcode = '23P01';
  end if;

  v_actor_name := app_private.agenda_actor_name(p_business_id);
  insert into public.schedule_blocks (
    id,
    business_id,
    professional_id,
    starts_at,
    ends_at,
    block_type,
    reason,
    created_by,
    created_by_name
  ) values (
    v_block_id,
    p_business_id,
    p_professional_id,
    p_starts_at,
    p_ends_at,
    p_block_type,
    trim(p_reason),
    auth.uid(),
    v_actor_name
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
    'schedule_block.created',
    'schedule_block',
    v_block_id,
    auth.uid(),
    v_actor_name,
    jsonb_build_object(
      'professionalId', p_professional_id,
      'blockType', p_block_type,
      'reason', trim(p_reason)
    )
  );

  return v_block_id;
end;
$$;

create or replace function public.create_schedule_block(
  p_business_id uuid,
  p_professional_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_block_type public.schedule_block_type,
  p_reason text
)
returns uuid
language sql
volatile
security invoker
set search_path = pg_catalog, public, app_private
as $$
  select app_private.create_schedule_block_internal(
    p_business_id,
    p_professional_id,
    p_starts_at,
    p_ends_at,
    p_block_type,
    p_reason
  );
$$;

create or replace function app_private.delete_schedule_block_internal(
  p_business_id uuid,
  p_block_id uuid
)
returns void
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, auth, app_private
set row_security = off
as $$
declare
  v_reason text;
  v_actor_name text;
begin
  if not app_private.has_business_role(
    p_business_id,
    array['owner','manager','receptionist']::public.member_role[]
  ) then
    raise exception 'Sem permissão para remover bloqueios.' using errcode = '42501';
  end if;

  select b.reason
  into v_reason
  from public.schedule_blocks b
  where b.business_id = p_business_id
    and b.id = p_block_id
  for update;

  if not found then
    raise exception 'Bloqueio não encontrado.' using errcode = 'P0002';
  end if;

  delete from public.schedule_blocks
  where business_id = p_business_id
    and id = p_block_id;

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
    'schedule_block.deleted',
    'schedule_block',
    p_block_id,
    auth.uid(),
    v_actor_name,
    jsonb_build_object('reason', v_reason)
  );
end;
$$;

create or replace function public.delete_schedule_block(
  p_business_id uuid,
  p_block_id uuid
)
returns void
language sql
volatile
security invoker
set search_path = pg_catalog, public, app_private
as $$
  select app_private.delete_schedule_block_internal(p_business_id, p_block_id);
$$;

revoke insert, update, delete on public.schedule_blocks from authenticated;

revoke all on function app_private.get_agenda_availability_internal(
  uuid, uuid, uuid, date, uuid
) from public, anon;
revoke all on function app_private.create_schedule_block_internal(
  uuid, uuid, timestamptz, timestamptz, public.schedule_block_type, text
) from public, anon;
revoke all on function app_private.delete_schedule_block_internal(uuid, uuid)
  from public, anon;

revoke all on function public.get_agenda_availability(uuid, uuid, uuid, date, uuid)
  from public, anon;
revoke all on function public.create_schedule_block(
  uuid, uuid, timestamptz, timestamptz, public.schedule_block_type, text
) from public, anon;
revoke all on function public.delete_schedule_block(uuid, uuid) from public, anon;

grant execute on function app_private.get_agenda_availability_internal(
  uuid, uuid, uuid, date, uuid
) to authenticated;
grant execute on function app_private.create_schedule_block_internal(
  uuid, uuid, timestamptz, timestamptz, public.schedule_block_type, text
) to authenticated;
grant execute on function app_private.delete_schedule_block_internal(uuid, uuid)
  to authenticated;

grant execute on function public.get_agenda_availability(uuid, uuid, uuid, date, uuid)
  to authenticated;
grant execute on function public.create_schedule_block(
  uuid, uuid, timestamptz, timestamptz, public.schedule_block_type, text
) to authenticated;
grant execute on function public.delete_schedule_block(uuid, uuid) to authenticated;
