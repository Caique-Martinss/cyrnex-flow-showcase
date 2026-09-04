-- Secure public booking bridge. The browser never receives Supabase service credentials.

create or replace function app_private.resolve_public_business_id(p_slug text)
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
set row_security = off
as $$
  select b.id
  from public.businesses b
  join public.business_public_profiles p on p.business_id = b.id
  where b.slug = lower(trim(p_slug))
    and b.status = 'active'
    and p.public_page_enabled
    and p.publish_on_complete
    and b.onboarding_status = 'completed'
  limit 1;
$$;

create or replace function app_private.get_public_booking_availability_internal(
  p_slug text,
  p_service_id uuid,
  p_professional_id uuid,
  p_date date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth, app_private
set row_security = off
as $$
declare
  v_business_id uuid;
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
begin
  v_business_id := app_private.resolve_public_business_id(p_slug);
  if v_business_id is null then
    raise exception 'Página de agendamento indisponível.' using errcode = 'P0002';
  end if;

  select b.timezone, greatest(5, s.booking_slot_interval_minutes)
  into v_timezone, v_interval
  from public.businesses b
  join public.business_settings s on s.business_id = b.id
  where b.id = v_business_id;

  select s.duration_minutes, s.buffer_after_minutes
  into v_duration, v_buffer
  from public.services s
  where s.business_id = v_business_id
    and s.id = p_service_id
    and s.active
    and s.online_booking_enabled;

  if not found then
    raise exception 'Serviço indisponível para agendamento online.' using errcode = '23503';
  end if;

  select p.uses_custom_schedule
  into v_custom
  from public.professionals p
  where p.business_id = v_business_id
    and p.id = p_professional_id
    and p.active
    and p.serves_clients
    and p.accepts_online_booking
    and p.public_visible;

  if not found then
    raise exception 'Profissional indisponível para agendamento online.' using errcode = '23503';
  end if;

  if not app_private.service_allowed_for_professional(
    v_business_id,
    p_service_id,
    p_professional_id
  ) then
    raise exception 'Esse profissional não realiza o serviço escolhido.' using errcode = '23514';
  end if;

  v_weekday := extract(dow from p_date)::smallint;

  for v_business in
    select h.opens_at, h.closes_at
    from public.business_hours h
    where h.business_id = v_business_id
      and h.weekday = v_weekday
      and (h.valid_from is null or h.valid_from <= p_date)
      and (h.valid_until is null or h.valid_until >= p_date)
    order by h.opens_at
  loop
    if v_custom then
      for v_professional in
        select ph.starts_at, ph.ends_at
        from public.professional_hours ph
        where ph.business_id = v_business_id
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
          while v_slot_time + make_interval(mins => v_duration + v_buffer) <= v_segment_end loop
            v_slot_start := (p_date + v_slot_time) at time zone v_timezone;
            v_slot_end := v_slot_start + make_interval(mins => v_duration);
            v_validation := app_private.agenda_slot_validation_internal(
              v_business_id,
              p_professional_id,
              v_slot_start,
              v_duration,
              v_buffer,
              '{}'::uuid[],
              true
            );
            v_status := case v_validation ->> 'kind'
              when 'available' then 'available'
              when 'occupied' then 'occupied'
              when 'past' then 'past'
              else 'blocked'
            end;
            v_reason := case when v_status = 'available' then null else v_validation ->> 'message' end;
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
      while v_slot_time + make_interval(mins => v_duration + v_buffer) <= v_segment_end loop
        v_slot_start := (p_date + v_slot_time) at time zone v_timezone;
        v_slot_end := v_slot_start + make_interval(mins => v_duration);
        v_validation := app_private.agenda_slot_validation_internal(
          v_business_id,
          p_professional_id,
          v_slot_start,
          v_duration,
          v_buffer,
          '{}'::uuid[],
          true
        );
        v_status := case v_validation ->> 'kind'
          when 'available' then 'available'
          when 'occupied' then 'occupied'
          when 'past' then 'past'
          else 'blocked'
        end;
        v_reason := case when v_status = 'available' then null else v_validation ->> 'message' end;
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

create or replace function public.get_public_booking_availability(
  p_slug text,
  p_service_id uuid,
  p_professional_id uuid,
  p_date date
)
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, public, app_private
as $$
  select app_private.get_public_booking_availability_internal(
    p_slug,
    p_service_id,
    p_professional_id,
    p_date
  );
$$;

create or replace function app_private.create_public_booking_internal(
  p_slug text,
  p_name text,
  p_phone text,
  p_email text,
  p_service_id uuid,
  p_professional_id uuid,
  p_starts_at timestamptz,
  p_notes text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, auth, app_private, extensions
set row_security = off
as $$
declare
  v_business_id uuid;
  v_name text := trim(coalesce(p_name, ''));
  v_phone_raw text := trim(coalesce(p_phone, ''));
  v_phone text := public.normalize_phone(coalesce(p_phone, ''));
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_notes text := nullif(trim(coalesce(p_notes, '')), '');
  v_settings public.business_settings%rowtype;
  v_service public.services%rowtype;
  v_professional public.professionals%rowtype;
  v_validation jsonb;
  v_client public.clients%rowtype;
  v_client_id uuid;
  v_existing_client boolean := false;
  v_price numeric(12,2);
  v_deposit_percent numeric(5,2);
  v_deposit_amount numeric(12,2);
  v_deposit_status public.deposit_status;
  v_status public.appointment_status := 'scheduled';
  v_confirmed_at timestamptz;
  v_appointment_id uuid := extensions.gen_random_uuid();
begin
  v_business_id := app_private.resolve_public_business_id(p_slug);
  if v_business_id is null then
    raise exception 'Página de agendamento indisponível.' using errcode = 'P0002';
  end if;

  select * into v_settings
  from public.business_settings s
  where s.business_id = v_business_id;

  if v_settings.require_client_name and char_length(v_name) < 2 then
    raise exception 'Informe seu nome para continuar.' using errcode = '22023';
  end if;
  if char_length(v_name) > 160 then
    raise exception 'O nome informado é muito longo.' using errcode = '22023';
  end if;
  if v_settings.require_client_phone and coalesce(char_length(v_phone), 0) < 10 then
    raise exception 'Informe um WhatsApp válido com DDD.' using errcode = '22023';
  end if;
  if v_phone is not null and char_length(v_phone) not between 10 and 15 then
    raise exception 'Informe um telefone válido.' using errcode = '22023';
  end if;
  if v_settings.require_client_email and (v_email is null or position('@' in v_email) <= 1) then
    raise exception 'Informe um e-mail válido para continuar.' using errcode = '22023';
  end if;
  if v_email is not null and position('@' in v_email) <= 1 then
    raise exception 'O e-mail informado não é válido.' using errcode = '22023';
  end if;
  if not v_settings.allow_client_notes then
    v_notes := null;
  elsif char_length(coalesce(v_notes, '')) > 1000 then
    raise exception 'A observação precisa ter no máximo 1000 caracteres.' using errcode = '22023';
  end if;

  select * into v_service
  from public.services s
  where s.business_id = v_business_id
    and s.id = p_service_id
    and s.active
    and s.online_booking_enabled;
  if not found then
    raise exception 'Serviço indisponível para agendamento online.' using errcode = '23503';
  end if;

  select * into v_professional
  from public.professionals p
  where p.business_id = v_business_id
    and p.id = p_professional_id
    and p.active
    and p.serves_clients
    and p.accepts_online_booking
    and p.public_visible;
  if not found then
    raise exception 'Profissional indisponível para agendamento online.' using errcode = '23503';
  end if;

  if not app_private.service_allowed_for_professional(
    v_business_id,
    p_service_id,
    p_professional_id
  ) then
    raise exception 'Esse profissional não realiza o serviço escolhido.' using errcode = '23514';
  end if;

  v_validation := app_private.agenda_slot_validation_internal(
    v_business_id,
    p_professional_id,
    p_starts_at,
    v_service.duration_minutes,
    v_service.buffer_after_minutes,
    '{}'::uuid[],
    true
  );
  if not coalesce((v_validation ->> 'ok')::boolean, false) then
    raise exception '%', coalesce(v_validation ->> 'message', 'Horário indisponível.')
      using errcode = case when v_validation ->> 'kind' = 'occupied' then '23P01' else '23514' end;
  end if;

  if v_phone is not null then
    select * into v_client
    from public.clients c
    where c.business_id = v_business_id
      and c.phone_normalized = v_phone
      and c.status <> 'archived'
    limit 1
    for update;
    if found then
      v_client_id := v_client.id;
      v_existing_client := true;
    end if;
  end if;

  if v_client_id is null and char_length(v_name) >= 2 then
    v_client_id := extensions.gen_random_uuid();
    insert into public.clients (
      id,
      business_id,
      full_name,
      phone_raw,
      phone_normalized,
      email,
      origin,
      created_by
    ) values (
      v_client_id,
      v_business_id,
      v_name,
      nullif(v_phone_raw, ''),
      v_phone,
      v_email,
      'public',
      null
    );
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
  v_deposit_status := case
    when v_deposit_percent > 0 then 'pending'::public.deposit_status
    else 'waived'::public.deposit_status
  end;

  if v_settings.confirmation_mode = 'automatic' and v_deposit_status = 'waived' then
    v_status := 'confirmed';
    v_confirmed_at := now();
  end if;

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
    guest_name,
    guest_phone,
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
    confirmed_at
  ) values (
    v_appointment_id,
    v_business_id,
    v_client_id,
    p_professional_id,
    p_service_id,
    p_starts_at,
    p_starts_at + make_interval(mins => v_service.duration_minutes),
    p_starts_at + make_interval(mins => v_service.duration_minutes + v_service.buffer_after_minutes),
    v_status,
    'public',
    nullif(v_name, ''),
    nullif(v_phone_raw, ''),
    v_service.name,
    v_professional.name,
    v_service.duration_minutes,
    v_service.buffer_after_minutes,
    v_price,
    v_deposit_percent,
    v_deposit_amount,
    v_deposit_status,
    case when v_professional.receives_commission then v_professional.commission_percent else 0 end,
    v_notes,
    null,
    v_confirmed_at
  );

  insert into public.appointment_events (
    business_id,
    appointment_id,
    event_type,
    actor_user_id,
    actor_name
  ) values (
    v_business_id,
    v_appointment_id,
    'created',
    null,
    'Página pública'
  );

  if v_status = 'confirmed' then
    insert into public.appointment_events (
      business_id,
      appointment_id,
      event_type,
      actor_user_id,
      actor_name,
      notes
    ) values (
      v_business_id,
      v_appointment_id,
      'confirmed',
      null,
      'Página pública',
      'Confirmação automática conforme configuração da empresa.'
    );
  end if;

  insert into public.audit_logs (
    business_id,
    action,
    entity_type,
    entity_id,
    actor_user_id,
    actor_name,
    metadata
  ) values (
    v_business_id,
    'appointment.public_created',
    'appointment',
    v_appointment_id,
    null,
    'Página pública',
    jsonb_build_object(
      'startsAt', p_starts_at,
      'professionalId', p_professional_id,
      'serviceId', p_service_id,
      'source', 'public'
    )
  );

  return jsonb_build_object(
    'appointmentId', v_appointment_id,
    'clientId', v_client_id,
    'serviceId', v_service.id,
    'professionalId', v_professional.id,
    'serviceName', v_service.name,
    'professionalName', v_professional.name,
    'durationMinutes', v_service.duration_minutes,
    'bufferAfterMinutes', v_service.buffer_after_minutes,
    'startsAt', p_starts_at,
    'status', v_status,
    'price', v_price,
    'publicPriceVisible', v_service.public_price_visible,
    'depositPercent', v_deposit_percent,
    'depositAmount', v_deposit_amount,
    'depositStatus', v_deposit_status,
    'notes', v_notes,
    'createdAt', now(),
    'confirmedAt', v_confirmed_at,
    'clientName', case when v_existing_client then v_client.full_name else v_name end,
    'clientPhone', case when v_existing_client then coalesce(v_client.phone_raw, v_phone_raw) else v_phone_raw end,
    'clientEmail', case when v_existing_client then v_client.email else v_email end,
    'existingClient', v_existing_client,
    'cancellationPolicy', coalesce(v_settings.cancellation_policy, '')
  );
exception
  when exclusion_violation then
    raise exception 'Esse horário acabou de ser reservado. Escolha outro.' using errcode = '23P01';
end;
$$;

create or replace function public.create_public_booking(
  p_slug text,
  p_name text,
  p_phone text,
  p_email text,
  p_service_id uuid,
  p_professional_id uuid,
  p_starts_at timestamptz,
  p_notes text
)
returns jsonb
language sql
volatile
security invoker
set search_path = pg_catalog, public, app_private
as $$
  select app_private.create_public_booking_internal(
    p_slug,
    p_name,
    p_phone,
    p_email,
    p_service_id,
    p_professional_id,
    p_starts_at,
    p_notes
  );
$$;

revoke all on function app_private.resolve_public_business_id(text) from public, anon, authenticated;
revoke all on function app_private.get_public_booking_availability_internal(
  text, uuid, uuid, date
) from public, anon, authenticated;
revoke all on function app_private.create_public_booking_internal(
  text, text, text, text, uuid, uuid, timestamptz, text
) from public, anon, authenticated;
revoke all on function public.get_public_booking_availability(
  text, uuid, uuid, date
) from public, anon, authenticated;
revoke all on function public.create_public_booking(
  text, text, text, text, uuid, uuid, timestamptz, text
) from public, anon, authenticated;

grant execute on function app_private.resolve_public_business_id(text) to service_role;
grant execute on function app_private.get_public_booking_availability_internal(
  text, uuid, uuid, date
) to service_role;
grant execute on function app_private.create_public_booking_internal(
  text, text, text, text, uuid, uuid, timestamptz, text
) to service_role;
grant execute on function public.get_public_booking_availability(
  text, uuid, uuid, date
) to service_role;
grant execute on function public.create_public_booking(
  text, text, text, text, uuid, uuid, timestamptz, text
) to service_role;
