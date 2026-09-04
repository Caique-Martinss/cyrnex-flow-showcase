-- CYRNEX FLOW - Agenda transacional de produção.
-- Toda mutação operacional passa por RPCs que preservam RLS, business_id,
-- disponibilidade, buffer, timeline e auditoria em uma única transação.

create or replace function app_private.agenda_actor_name(p_business_id uuid)
returns text
language sql
stable
security definer
set search_path = pg_catalog, public, auth
set row_security = off
as $$
  select coalesce(
    (
      select bm.display_name
      from public.business_members bm
      where bm.business_id = p_business_id
        and bm.user_id = auth.uid()
        and bm.active
      limit 1
    ),
    'Usuário'
  );
$$;

create or replace function app_private.can_operate_professional(
  p_business_id uuid,
  p_professional_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth, app_private
set row_security = off
as $$
  select
    app_private.has_business_role(
      p_business_id,
      array['owner','manager','receptionist']::public.member_role[]
    )
    or app_private.is_own_professional(p_business_id, p_professional_id);
$$;

create or replace function app_private.service_allowed_for_professional(
  p_business_id uuid,
  p_service_id uuid,
  p_professional_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
set row_security = off
as $$
  select
    not exists (
      select 1
      from public.professional_services ps
      where ps.business_id = p_business_id
        and ps.service_id = p_service_id
        and ps.active
    )
    or exists (
      select 1
      from public.professional_services ps
      where ps.business_id = p_business_id
        and ps.service_id = p_service_id
        and ps.professional_id = p_professional_id
        and ps.active
    );
$$;

create or replace function app_private.agenda_slot_validation_internal(
  p_business_id uuid,
  p_professional_id uuid,
  p_starts_at timestamptz,
  p_duration_minutes integer,
  p_buffer_minutes integer,
  p_ignored_appointment_ids uuid[] default '{}'::uuid[],
  p_apply_booking_window boolean default true
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
  v_min_notice integer;
  v_max_days integer;
  v_uses_custom boolean;
  v_occupied_until timestamptz;
  v_local_start timestamp;
  v_local_end timestamp;
  v_local_date date;
  v_weekday smallint;
  v_conflict_id uuid;
  v_block_reason text;
begin
  if p_duration_minutes < 1 or p_buffer_minutes < 0 or p_starts_at is null then
    return jsonb_build_object('ok', false, 'kind', 'invalid', 'message', 'Horário inválido.');
  end if;

  select b.timezone, s.min_booking_notice_minutes, s.max_booking_days_ahead
  into v_timezone, v_min_notice, v_max_days
  from public.businesses b
  join public.business_settings s on s.business_id = b.id
  where b.id = p_business_id
    and b.status = 'active';

  if v_timezone is null then
    return jsonb_build_object('ok', false, 'kind', 'business', 'message', 'Barbearia indisponível.');
  end if;

  select p.uses_custom_schedule
  into v_uses_custom
  from public.professionals p
  where p.business_id = p_business_id
    and p.id = p_professional_id
    and p.active
    and p.serves_clients;

  if not found then
    return jsonb_build_object('ok', false, 'kind', 'professional', 'message', 'Profissional indisponível.');
  end if;

  v_occupied_until := p_starts_at + make_interval(mins => p_duration_minutes + p_buffer_minutes);
  v_local_start := p_starts_at at time zone v_timezone;
  v_local_end := v_occupied_until at time zone v_timezone;
  v_local_date := v_local_start::date;
  v_weekday := extract(dow from v_local_start)::smallint;

  if p_apply_booking_window then
    if p_starts_at < now() then
      return jsonb_build_object(
        'ok', false,
        'kind', 'past',
        'message', 'Esse horário já passou. Escolha uma data e hora futuras.'
      );
    end if;

    if v_local_date > ((now() at time zone v_timezone)::date + v_max_days) then
      return jsonb_build_object(
        'ok', false,
        'kind', 'past',
        'message', format('A barbearia aceita agendamentos até %s dia(s) à frente.', v_max_days)
      );
    end if;

    if p_starts_at < now() + make_interval(mins => v_min_notice) then
      return jsonb_build_object(
        'ok', false,
        'kind', 'past',
        'message', format('Esse horário não respeita a antecedência mínima de %s minuto(s).', v_min_notice)
      );
    end if;
  end if;

  if v_local_start::date <> v_local_end::date then
    return jsonb_build_object(
      'ok', false,
      'kind', 'schedule',
      'message', 'O serviço não cabe por completo no expediente da barbearia e do profissional.'
    );
  end if;

  if not exists (
    select 1
    from public.business_hours h
    where h.business_id = p_business_id
      and h.weekday = v_weekday
      and (h.valid_from is null or h.valid_from <= v_local_date)
      and (h.valid_until is null or h.valid_until >= v_local_date)
      and h.opens_at <= v_local_start::time
      and h.closes_at >= v_local_end::time
  ) then
    return jsonb_build_object(
      'ok', false,
      'kind', 'schedule',
      'message', 'O serviço não cabe por completo no expediente da barbearia e do profissional.'
    );
  end if;

  if v_uses_custom and not exists (
    select 1
    from public.professional_hours ph
    where ph.business_id = p_business_id
      and ph.professional_id = p_professional_id
      and ph.weekday = v_weekday
      and (ph.valid_from is null or ph.valid_from <= v_local_date)
      and (ph.valid_until is null or ph.valid_until >= v_local_date)
      and ph.starts_at <= v_local_start::time
      and ph.ends_at >= v_local_end::time
  ) then
    return jsonb_build_object(
      'ok', false,
      'kind', 'schedule',
      'message', 'O serviço não cabe por completo no expediente da barbearia e do profissional.'
    );
  end if;

  select b.reason
  into v_block_reason
  from public.schedule_blocks b
  where b.business_id = p_business_id
    and (b.professional_id is null or b.professional_id = p_professional_id)
    and tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(p_starts_at, v_occupied_until, '[)')
  order by b.starts_at
  limit 1;

  if found then
    return jsonb_build_object(
      'ok', false,
      'kind', 'blocked',
      'message', coalesce(v_block_reason, 'Horário bloqueado pela barbearia.')
    );
  end if;

  select a.id
  into v_conflict_id
  from public.appointments a
  where a.business_id = p_business_id
    and a.professional_id = p_professional_id
    and a.status in ('scheduled','confirmed','arrived','in_service')
    and not a.recurrence_paused
    and not (a.id = any(coalesce(p_ignored_appointment_ids, '{}'::uuid[])))
    and tstzrange(a.starts_at, a.occupied_until, '[)') && tstzrange(p_starts_at, v_occupied_until, '[)')
  order by a.starts_at
  limit 1;

  if found then
    return jsonb_build_object(
      'ok', false,
      'kind', 'occupied',
      'message', 'Esse profissional já possui um atendimento nesse período.',
      'conflictAppointmentId', v_conflict_id
    );
  end if;

  return jsonb_build_object('ok', true, 'kind', 'available', 'message', null);
end;
$$;

create or replace function app_private.insert_agenda_appointment_internal(
  p_business_id uuid,
  p_client_id uuid,
  p_service_id uuid,
  p_professional_id uuid,
  p_starts_at timestamptz,
  p_notes text,
  p_source public.appointment_source,
  p_is_fit_in boolean default false,
  p_conflict_confirmed boolean default false,
  p_fit_in_reason text default null,
  p_recurrence_series_id uuid default null,
  p_recurrence_sequence_number integer default null,
  p_apply_booking_window boolean default true
)
returns uuid
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, auth, app_private, extensions
set row_security = off
as $$
declare
  v_service record;
  v_professional record;
  v_settings record;
  v_validation jsonb;
  v_conflict_id uuid;
  v_price numeric(12,2);
  v_deposit_percent numeric(5,2);
  v_deposit_amount numeric(12,2);
  v_appointment_id uuid := extensions.gen_random_uuid();
  v_actor_name text;
begin
  if not app_private.can_operate_professional(p_business_id, p_professional_id) then
    raise exception 'Sem permissão para operar a agenda deste profissional.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.clients c
    where c.business_id = p_business_id
      and c.id = p_client_id
      and c.status <> 'archived'
  ) then
    raise exception 'Cliente não encontrado nesta barbearia.' using errcode = '23503';
  end if;

  select s.* into v_service
  from public.services s
  where s.business_id = p_business_id
    and s.id = p_service_id
    and s.active;
  if not found then
    raise exception 'Serviço indisponível nesta barbearia.' using errcode = '23503';
  end if;

  select p.* into v_professional
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

  select bs.* into v_settings
  from public.business_settings bs
  where bs.business_id = p_business_id;

  v_validation := app_private.agenda_slot_validation_internal(
    p_business_id,
    p_professional_id,
    p_starts_at,
    v_service.duration_minutes,
    v_service.buffer_after_minutes,
    '{}'::uuid[],
    p_apply_booking_window
  );

  if not coalesce((v_validation ->> 'ok')::boolean, false) then
    if v_validation ->> 'kind' = 'occupied' and p_is_fit_in then
      v_conflict_id := nullif(v_validation ->> 'conflictAppointmentId', '')::uuid;
      if not p_conflict_confirmed or char_length(trim(coalesce(p_fit_in_reason, ''))) < 5 then
        raise exception 'Este encaixe se sobrepõe a outro atendimento. ' ||
          'Confirme explicitamente o conflito e explique o motivo antes de salvar.'
          using errcode = '23P01', detail = coalesce(v_conflict_id::text, '');
      end if;
    else
      raise exception '%', coalesce(v_validation ->> 'message', 'Horário indisponível.')
        using errcode = case when v_validation ->> 'kind' = 'occupied' then '23P01' else '23514' end,
              detail = coalesce(v_validation ->> 'conflictAppointmentId', '');
    end if;
  end if;

  v_price := v_service.base_price;
  v_deposit_percent := case
    when v_settings.require_deposit then coalesce(
      v_service.deposit_percent_override,
      v_settings.default_deposit_percent
    )
    else 0
  end;
  v_deposit_amount := round(v_price * v_deposit_percent / 100, 2);
  v_actor_name := app_private.agenda_actor_name(p_business_id);

  insert into public.appointments (
    id,
    business_id,
    client_id,
    professional_id,
    service_id,
    recurrence_series_id,
    recurrence_sequence_number,
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
    commission_percent_snapshot,
    notes,
    created_by,
    is_fit_in,
    fit_in_conflict_appointment_id,
    fit_in_reason
  ) values (
    v_appointment_id,
    p_business_id,
    p_client_id,
    p_professional_id,
    p_service_id,
    p_recurrence_series_id,
    p_recurrence_sequence_number,
    p_starts_at,
    p_starts_at + make_interval(mins => v_service.duration_minutes),
    p_starts_at + make_interval(mins => v_service.duration_minutes + v_service.buffer_after_minutes),
    'scheduled',
    p_source,
    v_service.name,
    v_professional.name,
    v_service.duration_minutes,
    v_service.buffer_after_minutes,
    v_price,
    v_deposit_percent,
    v_deposit_amount,
    case when v_deposit_percent > 0 then 'pending'::public.deposit_status else 'waived'::public.deposit_status end,
    case when v_professional.receives_commission then v_professional.commission_percent else 0 end,
    nullif(trim(coalesce(p_notes, '')), ''),
    auth.uid(),
    p_is_fit_in,
    v_conflict_id,
    case when p_is_fit_in then nullif(trim(coalesce(p_fit_in_reason, '')), '') else null end
  );

  insert into public.appointment_events (
    business_id, appointment_id, event_type, actor_user_id, actor_name
  ) values (
    p_business_id, v_appointment_id, 'created', auth.uid(), v_actor_name
  );

  if p_is_fit_in and v_conflict_id is not null then
    insert into public.appointment_events (
      business_id, appointment_id, event_type, notes, actor_user_id, actor_name
    ) values (
      p_business_id, v_appointment_id, 'fit_in_confirmed', p_fit_in_reason, auth.uid(), v_actor_name
    );
  end if;

  insert into public.audit_logs (
    business_id, action, entity_type, entity_id, actor_user_id, actor_name, metadata
  ) values (
    p_business_id,
    case when p_is_fit_in then 'appointment.fit_in_created' else 'appointment.created' end,
    'appointment',
    v_appointment_id,
    auth.uid(),
    v_actor_name,
    jsonb_build_object(
      'startsAt', p_starts_at,
      'professionalId', p_professional_id,
      'serviceId', p_service_id,
      'conflictAppointmentId', v_conflict_id,
      'source', p_source
    )
  );

  return v_appointment_id;
end;
$$;

create or replace function public.create_agenda_appointment(
  p_business_id uuid,
  p_client_id uuid,
  p_service_id uuid,
  p_professional_id uuid,
  p_starts_at timestamptz,
  p_notes text default null,
  p_is_fit_in boolean default false,
  p_conflict_confirmed boolean default false,
  p_fit_in_reason text default null
)
returns uuid
language sql
volatile
security invoker
set search_path = pg_catalog, public, app_private
as $$
  select app_private.insert_agenda_appointment_internal(
    p_business_id,
    p_client_id,
    p_service_id,
    p_professional_id,
    p_starts_at,
    p_notes,
    case when p_is_fit_in then 'fit_in'::public.appointment_source else 'admin'::public.appointment_source end,
    p_is_fit_in,
    p_conflict_confirmed,
    p_fit_in_reason,
    null,
    null,
    true
  );
$$;

create or replace function app_private.create_agenda_recurrence_internal(
  p_business_id uuid,
  p_client_id uuid,
  p_professional_id uuid,
  p_frequency public.recurrence_frequency,
  p_interval_weeks smallint,
  p_weekdays smallint[],
  p_service_ids uuid[],
  p_occurrences jsonb,
  p_notes text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, auth, app_private, extensions
set row_security = off
as $$
declare
  v_series_id uuid := extensions.gen_random_uuid();
  v_occurrence jsonb;
  v_appointment_id uuid;
  v_ids uuid[] := '{}'::uuid[];
  v_count integer;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_service_id uuid;
  v_index integer;
  v_actor_name text;
begin
  if not app_private.can_operate_professional(p_business_id, p_professional_id) then
    raise exception 'Sem permissão para criar recorrência para este profissional.' using errcode = '42501';
  end if;

  if p_frequency not in ('weekly','biweekly','monthly','custom') then
    raise exception 'Frequência de recorrência inválida.' using errcode = '22023';
  end if;

  v_count := jsonb_array_length(coalesce(p_occurrences, '[]'::jsonb));
  if v_count < 2 or v_count > 52 then
    raise exception 'A recorrência deve gerar entre 2 e 52 atendimentos.' using errcode = '22023';
  end if;

  select min((x ->> 'startsAt')::timestamptz), max((x ->> 'startsAt')::timestamptz)
  into v_starts_at, v_ends_at
  from jsonb_array_elements(p_occurrences) x;

  insert into public.recurrence_series (
    id, business_id, client_id, professional_id, service_ids,
    frequency, interval_weeks, weekdays, starts_at, ends_at, status, created_by
  ) values (
    v_series_id, p_business_id, p_client_id, p_professional_id,
    coalesce(p_service_ids, '{}'::uuid[]), p_frequency,
    greatest(1, coalesce(p_interval_weeks, 1)), coalesce(p_weekdays, '{}'::smallint[]),
    v_starts_at, v_ends_at, 'active', auth.uid()
  );

  for v_occurrence in select value from jsonb_array_elements(p_occurrences)
  loop
    v_service_id := (v_occurrence ->> 'serviceId')::uuid;
    v_index := (v_occurrence ->> 'index')::integer;
    v_appointment_id := app_private.insert_agenda_appointment_internal(
      p_business_id,
      p_client_id,
      v_service_id,
      p_professional_id,
      (v_occurrence ->> 'startsAt')::timestamptz,
      p_notes,
      'recurrence',
      false,
      false,
      null,
      v_series_id,
      v_index,
      true
    );
    v_ids := array_append(v_ids, v_appointment_id);
  end loop;

  v_actor_name := app_private.agenda_actor_name(p_business_id);
  insert into public.audit_logs (
    business_id, action, entity_type, entity_id, actor_user_id, actor_name, metadata
  ) values (
    p_business_id,
    'appointment.recurrence_created',
    'recurrence_series',
    v_series_id,
    auth.uid(),
    v_actor_name,
    jsonb_build_object('occurrences', v_count, 'professionalId', p_professional_id)
  );

  return jsonb_build_object(
    'recurrenceId', v_series_id,
    'appointmentIds', to_jsonb(v_ids)
  );
end;
$$;

create or replace function public.create_agenda_recurrence(
  p_business_id uuid,
  p_client_id uuid,
  p_professional_id uuid,
  p_frequency public.recurrence_frequency,
  p_interval_weeks smallint,
  p_weekdays smallint[],
  p_service_ids uuid[],
  p_occurrences jsonb,
  p_notes text default null
)
returns jsonb
language sql
volatile
security invoker
set search_path = pg_catalog, public, app_private
as $$
  select app_private.create_agenda_recurrence_internal(
    p_business_id, p_client_id, p_professional_id, p_frequency,
    p_interval_weeks, p_weekdays, p_service_ids, p_occurrences, p_notes
  );
$$;

create or replace function app_private.reschedule_agenda_appointment_internal(
  p_business_id uuid,
  p_appointment_id uuid,
  p_new_starts_at timestamptz,
  p_scope text default 'this'
)
returns uuid
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, auth, app_private
set row_security = off
as $$
declare
  v_selected record;
  v_target record;
  v_target_ids uuid[];
  v_delta interval;
  v_validation jsonb;
  v_actor_name text;
  v_old_start timestamptz;
begin
  if p_scope not in ('this','future','all') then
    raise exception 'Escopo de reagendamento inválido.' using errcode = '22023';
  end if;

  select * into v_selected
  from public.appointments a
  where a.business_id = p_business_id
    and a.id = p_appointment_id
  for update;

  if not found then
    raise exception 'Agendamento não encontrado.' using errcode = 'P0002';
  end if;
  if not app_private.can_operate_professional(p_business_id, v_selected.professional_id) then
    raise exception 'Sem permissão para reagendar este atendimento.' using errcode = '42501';
  end if;
  if v_selected.status in ('completed','cancelled','missed') then
    raise exception 'Esse atendimento não pode ser reagendado no status atual.' using errcode = '23514';
  end if;

  if v_selected.recurrence_series_id is null or p_scope = 'this' then
    v_target_ids := array[v_selected.id];
  else
    select array_agg(a.id order by a.starts_at)
    into v_target_ids
    from public.appointments a
    where a.business_id = p_business_id
      and a.recurrence_series_id = v_selected.recurrence_series_id
      and a.status not in ('completed','cancelled','missed')
      and (p_scope = 'all' or a.starts_at >= v_selected.starts_at);
  end if;

  v_delta := p_new_starts_at - v_selected.starts_at;

  for v_target in
    select *
    from public.appointments a
    where a.business_id = p_business_id
      and a.id = any(v_target_ids)
    order by a.starts_at
    for update
  loop
    v_validation := app_private.agenda_slot_validation_internal(
      p_business_id,
      v_target.professional_id,
      v_target.starts_at + v_delta,
      v_target.duration_minutes_snapshot,
      v_target.buffer_after_minutes_snapshot,
      v_target_ids,
      true
    );
    if not coalesce((v_validation ->> 'ok')::boolean, false) then
      raise exception 'Não foi possível reagendar: %', coalesce(v_validation ->> 'message', 'horário indisponível.')
        using errcode = case when v_validation ->> 'kind' = 'occupied' then '23P01' else '23514' end,
              detail = coalesce(v_validation ->> 'conflictAppointmentId', '');
    end if;
  end loop;

  v_actor_name := app_private.agenda_actor_name(p_business_id);
  for v_target in
    select *
    from public.appointments a
    where a.business_id = p_business_id
      and a.id = any(v_target_ids)
    order by a.starts_at
    for update
  loop
    v_old_start := v_target.starts_at;
    update public.appointments
    set starts_at = v_target.starts_at + v_delta,
        ends_at = v_target.ends_at + v_delta,
        rescheduled_at = now()
    where id = v_target.id;

    insert into public.appointment_events (
      business_id, appointment_id, event_type, notes, actor_user_id, actor_name
    ) values (
      p_business_id,
      v_target.id,
      'rescheduled',
      v_old_start::text || ' → ' || (v_target.starts_at + v_delta)::text,
      auth.uid(),
      v_actor_name
    );
  end loop;

  if v_selected.recurrence_series_id is not null and p_scope <> 'this' then
    update public.recurrence_series rs
    set starts_at = (
          select min(a.starts_at) from public.appointments a
          where a.business_id = p_business_id and a.recurrence_series_id = rs.id
        ),
        ends_at = (
          select max(a.starts_at) from public.appointments a
          where a.business_id = p_business_id and a.recurrence_series_id = rs.id
        )
    where rs.business_id = p_business_id
      and rs.id = v_selected.recurrence_series_id;
  end if;

  insert into public.audit_logs (
    business_id, action, entity_type, entity_id, actor_user_id, actor_name, metadata
  ) values (
    p_business_id,
    'appointment.rescheduled',
    'appointment',
    p_appointment_id,
    auth.uid(),
    v_actor_name,
    jsonb_build_object('newDate', p_new_starts_at, 'scope', p_scope, 'affected', cardinality(v_target_ids))
  );

  return p_appointment_id;
end;
$$;

create or replace function public.reschedule_agenda_appointment(
  p_business_id uuid,
  p_appointment_id uuid,
  p_new_starts_at timestamptz,
  p_scope text default 'this'
)
returns uuid
language sql
volatile
security invoker
set search_path = pg_catalog, public, app_private
as $$
  select app_private.reschedule_agenda_appointment_internal(
    p_business_id, p_appointment_id, p_new_starts_at, p_scope
  );
$$;

create or replace function app_private.set_agenda_recurrence_state_internal(
  p_business_id uuid,
  p_appointment_id uuid,
  p_action text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, auth, app_private
set row_security = off
as $$
declare
  v_appointment public.appointments%rowtype;
  v_ids uuid[];
  v_item public.appointments%rowtype;
  v_validation jsonb;
  v_actor_name text;
begin
  if p_action not in ('pause','resume') then
    raise exception 'Ação de recorrência inválida.' using errcode = '22023';
  end if;

  select * into v_appointment
  from public.appointments a
  where a.business_id = p_business_id and a.id = p_appointment_id;

  if not found or v_appointment.recurrence_series_id is null then
    raise exception 'Esse atendimento não pertence a uma recorrência.' using errcode = 'P0002';
  end if;
  if not app_private.can_operate_professional(p_business_id, v_appointment.professional_id) then
    raise exception 'Sem permissão para alterar esta recorrência.' using errcode = '42501';
  end if;

  select array_agg(a.id order by a.starts_at)
  into v_ids
  from public.appointments a
  where a.business_id = p_business_id
    and a.recurrence_series_id = v_appointment.recurrence_series_id
    and a.status not in ('completed','cancelled','missed')
    and a.starts_at >= now();

  v_ids := coalesce(v_ids, '{}'::uuid[]);

  if p_action = 'resume' then
    for v_item in
      select * from public.appointments a
      where a.business_id = p_business_id and a.id = any(v_ids)
      order by a.starts_at
    loop
      v_validation := app_private.agenda_slot_validation_internal(
        p_business_id,
        v_item.professional_id,
        v_item.starts_at,
        v_item.duration_minutes_snapshot,
        v_item.buffer_after_minutes_snapshot,
        v_ids,
        true
      );
      if not coalesce((v_validation ->> 'ok')::boolean, false) then
        raise exception 'Não foi possível retomar a recorrência: %',
          coalesce(v_validation ->> 'message', 'horário indisponível.')
          using errcode = case when v_validation ->> 'kind' = 'occupied' then '23P01' else '23514' end;
      end if;
    end loop;
  end if;

  update public.recurrence_series
  set status = case
    when p_action = 'pause' then 'paused'::public.recurrence_status
    else 'active'::public.recurrence_status
  end
  where business_id = p_business_id and id = v_appointment.recurrence_series_id;

  update public.appointments
  set recurrence_paused = (p_action = 'pause')
  where business_id = p_business_id and id = any(v_ids);

  v_actor_name := app_private.agenda_actor_name(p_business_id);
  insert into public.audit_logs (
    business_id, action, entity_type, entity_id, actor_user_id, actor_name, metadata
  ) values (
    p_business_id,
    case when p_action = 'pause' then 'appointment.recurrence_paused' else 'appointment.recurrence_resumed' end,
    'recurrence_series',
    v_appointment.recurrence_series_id,
    auth.uid(),
    v_actor_name,
    jsonb_build_object('appointmentId', p_appointment_id, 'affected', cardinality(v_ids))
  );

  return v_appointment.recurrence_series_id;
end;
$$;

create or replace function public.set_agenda_recurrence_state(
  p_business_id uuid,
  p_appointment_id uuid,
  p_action text
)
returns uuid
language sql
volatile
security invoker
set search_path = pg_catalog, public, app_private
as $$
  select app_private.set_agenda_recurrence_state_internal(p_business_id, p_appointment_id, p_action);
$$;

create or replace function app_private.set_agenda_deposit_internal(
  p_business_id uuid,
  p_appointment_id uuid,
  p_deposit_status public.deposit_status
)
returns uuid
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, auth, app_private
set row_security = off
as $$
declare
  v_appointment record;
  v_previous public.deposit_status;
  v_actor_name text;
begin
  select * into v_appointment
  from public.appointments a
  where a.business_id = p_business_id and a.id = p_appointment_id
  for update;
  if not found then raise exception 'Agendamento não encontrado.' using errcode = 'P0002'; end if;

  if not app_private.has_business_role(
    p_business_id,
    array['owner','manager','receptionist']::public.member_role[]
  ) then
    raise exception 'Sem permissão para alterar o sinal.' using errcode = '42501';
  end if;

  v_previous := v_appointment.deposit_status;
  update public.appointments set deposit_status = p_deposit_status where id = p_appointment_id;

  v_actor_name := app_private.agenda_actor_name(p_business_id);
  insert into public.audit_logs (
    business_id, action, entity_type, entity_id, actor_user_id, actor_name, metadata
  ) values (
    p_business_id, 'appointment.deposit_changed', 'appointment', p_appointment_id,
    auth.uid(), v_actor_name,
    jsonb_build_object('previousStatus', v_previous, 'depositStatus', p_deposit_status)
  );
  return p_appointment_id;
end;
$$;

create or replace function public.set_agenda_deposit(
  p_business_id uuid,
  p_appointment_id uuid,
  p_deposit_status public.deposit_status
)
returns uuid
language sql
volatile
security invoker
set search_path = pg_catalog, public, app_private
as $$
  select app_private.set_agenda_deposit_internal(p_business_id, p_appointment_id, p_deposit_status);
$$;

create or replace function app_private.set_agenda_status_internal(
  p_business_id uuid,
  p_appointment_id uuid,
  p_status public.appointment_status,
  p_confirm_early_start boolean default false,
  p_reason text default null,
  p_payment_method public.payment_method default null,
  p_card_fee numeric default 0,
  p_service_id uuid default null,
  p_price numeric default null,
  p_notes text default null,
  p_notes_provided boolean default false
)
returns uuid
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, auth, app_private
set row_security = off
as $$
declare
  v_appointment public.appointments%rowtype;
  v_previous public.appointment_status;
  v_actor_name text;
  v_event public.appointment_event_type;
  v_event_note text;
  v_service public.services%rowtype;
  v_final_price numeric(12,2);
  v_commission numeric(12,2);
  v_net numeric(12,2);
  v_duration integer;
  v_buffer integer;
begin
  select * into v_appointment
  from public.appointments a
  where a.business_id = p_business_id and a.id = p_appointment_id
  for update;

  if not found then raise exception 'Agendamento não encontrado.' using errcode = 'P0002'; end if;
  if not app_private.can_operate_professional(p_business_id, v_appointment.professional_id) then
    raise exception 'Sem permissão para alterar este atendimento.' using errcode = '42501';
  end if;

  v_previous := v_appointment.status;
  if v_previous = p_status then
    raise exception 'Esse atendimento já está nesse status.' using errcode = '23514';
  end if;
  if v_previous in ('completed','cancelled','missed') then
    raise exception 'Esse atendimento já foi encerrado e não pode avançar para outro status.'
      using errcode = '23514';
  end if;

  if not (
    (v_previous = 'scheduled' and p_status in ('confirmed','arrived','in_service','cancelled','missed')) or
    (v_previous = 'confirmed' and p_status in ('arrived','in_service','cancelled','missed')) or
    (v_previous = 'arrived' and p_status in ('in_service','cancelled','missed')) or
    (v_previous = 'in_service' and p_status in ('completed','cancelled'))
  ) then
    if p_status = 'completed' then
      raise exception 'Antes de concluir, use “Iniciar atendimento”. ' ||
        'Isso registra o horário efetivo de início.'
        using errcode = '23514';
    end if;
    raise exception 'Essa mudança não faz parte do fluxo operacional deste atendimento.' using errcode = '23514';
  end if;

  v_actor_name := app_private.agenda_actor_name(p_business_id);

  if p_status = 'confirmed' then
    update public.appointments set status = p_status, confirmed_at = now() where id = p_appointment_id;
    v_event := 'confirmed';
  elsif p_status = 'arrived' then
    update public.appointments set status = p_status, arrived_at = now() where id = p_appointment_id;
    v_event := 'arrived';
  elsif p_status = 'in_service' then
    if v_appointment.starts_at > now() and not p_confirm_early_start then
      raise exception 'O cliente será atendido antes do horário programado. ' ||
        'Confirme o início antecipado para continuar.'
        using errcode = '23514', detail = 'requiresEarlyStartConfirmation';
    end if;
    update public.appointments set status = p_status, actual_started_at = now() where id = p_appointment_id;
    v_event := 'started';
    if v_appointment.starts_at > now() then v_event_note := 'Início antecipado confirmado.'; end if;
  elsif p_status = 'cancelled' then
    update public.appointments set status = p_status, cancelled_at = now() where id = p_appointment_id;
    v_event := 'cancelled';
    v_event_note := nullif(trim(coalesce(p_reason, '')), '');
  elsif p_status = 'missed' then
    if v_appointment.starts_at > now() then
      raise exception 'Ainda não chegou o horário desse atendimento. ' ||
        'Só marque como não compareceu depois do horário programado.'
        using errcode = '23514';
    end if;
    update public.appointments set status = p_status, missed_at = now() where id = p_appointment_id;
    v_event := 'missed';
  elsif p_status = 'completed' then
    if p_payment_method is null then
      raise exception 'Informe a forma de pagamento.' using errcode = '22023';
    end if;

    v_final_price := coalesce(p_price, v_appointment.base_price);
    if v_final_price < 0 or p_card_fee < 0 or p_card_fee > v_final_price then
      raise exception 'Informe o valor final e a taxa corretamente.' using errcode = '22023';
    end if;

    v_duration := v_appointment.duration_minutes_snapshot;
    v_buffer := v_appointment.buffer_after_minutes_snapshot;

    if p_service_id is not null and p_service_id <> v_appointment.service_id then
      select * into v_service
      from public.services s
      where s.business_id = p_business_id and s.id = p_service_id and s.active;
      if not found then
        raise exception 'O serviço informado na conclusão não está disponível.' using errcode = '23503';
      end if;
      if not app_private.service_allowed_for_professional(
        p_business_id,
        p_service_id,
        v_appointment.professional_id
      ) then
        raise exception 'O profissional deste atendimento não está habilitado para o serviço informado.'
          using errcode = '23514';
      end if;
      v_duration := v_service.duration_minutes;
      v_buffer := v_service.buffer_after_minutes;
    end if;

    v_commission := round(v_final_price * v_appointment.commission_percent_snapshot / 100, 2);
    v_net := greatest(0, round(v_final_price - p_card_fee - v_commission, 2));

    update public.appointments
    set status = 'completed',
        completed_at = now(),
        payment_method = p_payment_method,
        card_fee = p_card_fee,
        base_price = v_final_price,
        commission_amount = v_commission,
        net_amount = v_net,
        notes = case when p_notes_provided then nullif(trim(coalesce(p_notes, '')), '') else notes end,
        service_id = coalesce(p_service_id, service_id),
        service_name_snapshot = case
          when p_service_id is not null and p_service_id <> v_appointment.service_id
            then v_service.name
          else service_name_snapshot
        end,
        duration_minutes_snapshot = v_duration,
        buffer_after_minutes_snapshot = v_buffer,
        ends_at = starts_at + make_interval(mins => v_duration)
    where id = p_appointment_id;
    v_event := 'completed';
  end if;

  insert into public.appointment_events (
    business_id, appointment_id, event_type, notes, actor_user_id, actor_name
  ) values (
    p_business_id, p_appointment_id, v_event, v_event_note, auth.uid(), v_actor_name
  );

  insert into public.audit_logs (
    business_id, action, entity_type, entity_id, actor_user_id, actor_name, metadata
  ) values (
    p_business_id, 'appointment.status_changed', 'appointment', p_appointment_id,
    auth.uid(), v_actor_name,
    jsonb_build_object('previousStatus', v_previous, 'status', p_status)
  );

  return p_appointment_id;
end;
$$;

create or replace function public.set_agenda_status(
  p_business_id uuid,
  p_appointment_id uuid,
  p_status public.appointment_status,
  p_confirm_early_start boolean default false,
  p_reason text default null,
  p_payment_method public.payment_method default null,
  p_card_fee numeric default 0,
  p_service_id uuid default null,
  p_price numeric default null,
  p_notes text default null,
  p_notes_provided boolean default false
)
returns uuid
language sql
volatile
security invoker
set search_path = pg_catalog, public, app_private
as $$
  select app_private.set_agenda_status_internal(
    p_business_id, p_appointment_id, p_status, p_confirm_early_start,
    p_reason, p_payment_method, p_card_fee, p_service_id, p_price,
    p_notes, p_notes_provided
  );
$$;

-- Corrige o helper de disponibilidade anterior para respeitar explicitamente
-- dias de folga quando o profissional usa grade própria.
create or replace function app_private.is_time_slot_available_internal(
  p_business_id uuid,
  p_professional_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_exclude_appointment_id uuid default null
)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth, app_private
set row_security = off
as $$
declare
  v_professional record;
  v_result jsonb;
  v_duration integer;
begin
  if not app_private.is_business_member(p_business_id) then return false; end if;
  if p_ends_at <= p_starts_at then return false; end if;

  select * into v_professional
  from public.professionals p
  where p.business_id = p_business_id and p.id = p_professional_id and p.active and p.serves_clients;
  if not found then return false; end if;

  v_duration := greatest(1, ceil(extract(epoch from (p_ends_at - p_starts_at)) / 60.0)::integer);
  v_result := app_private.agenda_slot_validation_internal(
    p_business_id,
    p_professional_id,
    p_starts_at,
    v_duration,
    0,
    case when p_exclude_appointment_id is null then '{}'::uuid[] else array[p_exclude_appointment_id] end,
    false
  );
  return coalesce((v_result ->> 'ok')::boolean, false);
end;
$$;

-- Mutação direta da Agenda é deliberadamente fechada em produção.
-- O papel autenticado lê por RLS, mas escreve somente por RPC transacional.
revoke insert, update, delete on public.appointments from authenticated;
revoke insert, update, delete on public.appointment_events from authenticated;
revoke insert, update, delete on public.recurrence_series from authenticated;

revoke all on function app_private.agenda_actor_name(uuid) from public, anon;
revoke all on function app_private.can_operate_professional(uuid, uuid) from public, anon;
revoke all on function app_private.service_allowed_for_professional(uuid, uuid, uuid)
  from public, anon;
revoke all on function app_private.agenda_slot_validation_internal(
  uuid, uuid, timestamptz, integer, integer, uuid[], boolean
) from public, anon;
revoke all on function app_private.insert_agenda_appointment_internal(
  uuid, uuid, uuid, uuid, timestamptz, text, public.appointment_source,
  boolean, boolean, text, uuid, integer, boolean
) from public, anon;
revoke all on function app_private.create_agenda_recurrence_internal(
  uuid, uuid, uuid, public.recurrence_frequency, smallint,
  smallint[], uuid[], jsonb, text
) from public, anon;
revoke all on function app_private.reschedule_agenda_appointment_internal(
  uuid, uuid, timestamptz, text
) from public, anon;
revoke all on function app_private.set_agenda_recurrence_state_internal(uuid, uuid, text)
  from public, anon;
revoke all on function app_private.set_agenda_deposit_internal(
  uuid, uuid, public.deposit_status
) from public, anon;
revoke all on function app_private.set_agenda_status_internal(
  uuid, uuid, public.appointment_status, boolean, text,
  public.payment_method, numeric, uuid, numeric, text, boolean
) from public, anon;

grant execute on function app_private.agenda_actor_name(uuid) to authenticated;
grant execute on function app_private.can_operate_professional(uuid, uuid) to authenticated;
grant execute on function app_private.service_allowed_for_professional(uuid, uuid, uuid)
  to authenticated;
grant execute on function app_private.agenda_slot_validation_internal(
  uuid, uuid, timestamptz, integer, integer, uuid[], boolean
) to authenticated;
grant execute on function app_private.insert_agenda_appointment_internal(
  uuid, uuid, uuid, uuid, timestamptz, text, public.appointment_source,
  boolean, boolean, text, uuid, integer, boolean
) to authenticated;
grant execute on function app_private.create_agenda_recurrence_internal(
  uuid, uuid, uuid, public.recurrence_frequency, smallint,
  smallint[], uuid[], jsonb, text
) to authenticated;
grant execute on function app_private.reschedule_agenda_appointment_internal(
  uuid, uuid, timestamptz, text
) to authenticated;
grant execute on function app_private.set_agenda_recurrence_state_internal(uuid, uuid, text)
  to authenticated;
grant execute on function app_private.set_agenda_deposit_internal(
  uuid, uuid, public.deposit_status
) to authenticated;
grant execute on function app_private.set_agenda_status_internal(
  uuid, uuid, public.appointment_status, boolean, text,
  public.payment_method, numeric, uuid, numeric, text, boolean
) to authenticated;

revoke all on function public.create_agenda_appointment(
  uuid, uuid, uuid, uuid, timestamptz, text, boolean, boolean, text
) from public, anon;
revoke all on function public.create_agenda_recurrence(
  uuid, uuid, uuid, public.recurrence_frequency, smallint,
  smallint[], uuid[], jsonb, text
) from public, anon;
revoke all on function public.reschedule_agenda_appointment(uuid, uuid, timestamptz, text)
  from public, anon;
revoke all on function public.set_agenda_recurrence_state(uuid, uuid, text)
  from public, anon;
revoke all on function public.set_agenda_deposit(uuid, uuid, public.deposit_status)
  from public, anon;
revoke all on function public.set_agenda_status(
  uuid, uuid, public.appointment_status, boolean, text,
  public.payment_method, numeric, uuid, numeric, text, boolean
) from public, anon;

grant execute on function public.create_agenda_appointment(
  uuid, uuid, uuid, uuid, timestamptz, text, boolean, boolean, text
) to authenticated;
grant execute on function public.create_agenda_recurrence(
  uuid, uuid, uuid, public.recurrence_frequency, smallint,
  smallint[], uuid[], jsonb, text
) to authenticated;
grant execute on function public.reschedule_agenda_appointment(uuid, uuid, timestamptz, text)
  to authenticated;
grant execute on function public.set_agenda_recurrence_state(uuid, uuid, text)
  to authenticated;
grant execute on function public.set_agenda_deposit(uuid, uuid, public.deposit_status)
  to authenticated;
grant execute on function public.set_agenda_status(
  uuid, uuid, public.appointment_status, boolean, text,
  public.payment_method, numeric, uuid, numeric, text, boolean
) to authenticated;
