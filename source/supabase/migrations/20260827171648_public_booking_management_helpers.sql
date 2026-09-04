create or replace function app_private.resolve_public_booking_access_internal(
  p_slug text,
  p_token_hash text
)
returns table (
  token_id uuid,
  business_id uuid,
  appointment_id uuid,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, public
set row_security = off
as $$
  select
    t.id,
    t.business_id,
    t.appointment_id,
    t.expires_at
  from public.booking_access_tokens t
  join public.businesses b on b.id = t.business_id
  where b.slug = lower(trim(p_slug))
    and b.status = 'active'
    and t.token_hash = lower(trim(p_token_hash))
    and t.revoked_at is null
    and t.expires_at > now()
  limit 1;
$$;

create or replace function app_private.public_booking_management_payload_internal(
  p_business_id uuid,
  p_appointment_id uuid,
  p_management_expires_at timestamptz
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, app_private
set row_security = off
as $$
declare
  v_appointment public.appointments%rowtype;
  v_settings public.business_settings%rowtype;
  v_service public.services%rowtype;
  v_client public.clients%rowtype;
  v_deadline timestamptz;
  v_can_change boolean;
  v_can_reschedule boolean;
  v_can_cancel boolean;
begin
  select * into v_appointment
  from public.appointments a
  where a.business_id = p_business_id
    and a.id = p_appointment_id;

  if not found then
    raise exception 'Agendamento não encontrado ou link expirado.'
      using errcode = 'P0002';
  end if;

  select * into v_settings
  from public.business_settings s
  where s.business_id = p_business_id;

  if not found then
    raise exception 'Configuração da barbearia indisponível.'
      using errcode = 'P0002';
  end if;

  select * into v_service
  from public.services s
  where s.business_id = p_business_id
    and s.id = v_appointment.service_id;

  if v_appointment.client_id is not null then
    select * into v_client
    from public.clients c
    where c.business_id = p_business_id
      and c.id = v_appointment.client_id;
  end if;

  v_deadline := v_appointment.starts_at
    - make_interval(mins => v_settings.cancellation_notice_minutes);
  v_can_change := v_appointment.status in ('scheduled', 'confirmed')
    and v_appointment.starts_at > now()
    and now() <= v_deadline;
  v_can_reschedule := v_can_change and v_settings.allow_client_reschedule;
  v_can_cancel := v_can_change and v_settings.allow_client_cancel;

  return jsonb_build_object(
    'appointmentId', v_appointment.id,
    'clientId', v_appointment.client_id,
    'serviceId', v_appointment.service_id,
    'professionalId', v_appointment.professional_id,
    'serviceName', v_appointment.service_name_snapshot,
    'professionalName', v_appointment.professional_name_snapshot,
    'durationMinutes', v_appointment.duration_minutes_snapshot,
    'bufferAfterMinutes', v_appointment.buffer_after_minutes_snapshot,
    'startsAt', v_appointment.starts_at,
    'status', v_appointment.status,
    'price', v_appointment.base_price,
    'publicPriceVisible', coalesce(v_service.public_price_visible, true),
    'depositPercent', v_appointment.deposit_percent,
    'depositAmount', v_appointment.deposit_amount,
    'depositStatus', v_appointment.deposit_status,
    'notes', v_appointment.notes,
    'createdAt', v_appointment.created_at,
    'confirmedAt', v_appointment.confirmed_at,
    'clientName', coalesce(v_client.full_name, v_appointment.guest_name, 'Cliente'),
    'clientPhone', coalesce(v_client.phone_raw, v_appointment.guest_phone, ''),
    'clientEmail', v_client.email,
    'existingClient', v_appointment.client_id is not null,
    'cancellationPolicy', coalesce(v_settings.cancellation_policy, ''),
    'canReschedule', v_can_reschedule,
    'canCancel', v_can_cancel,
    'changeDeadline', v_deadline,
    'managementExpiresAt', p_management_expires_at
  );
end;
$$;

create or replace function app_private.get_public_booking_availability_scoped_internal(
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
    and s.active
    and s.online_booking_enabled;

  if not found then
    raise exception 'Serviço indisponível para agendamento online.'
      using errcode = '23503';
  end if;

  select p.uses_custom_schedule
  into v_custom
  from public.professionals p
  where p.business_id = p_business_id
    and p.id = p_professional_id
    and p.active
    and p.serves_clients
    and p.accepts_online_booking;

  if not found then
    raise exception 'Profissional indisponível para agendamento online.'
      using errcode = '23503';
  end if;

  if not app_private.service_allowed_for_professional(
    p_business_id,
    p_service_id,
    p_professional_id
  ) then
    raise exception 'Esse profissional não realiza o serviço escolhido.'
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
        v_segment_start := greatest(
          v_business.opens_at,
          v_professional.starts_at
        );
        v_segment_end := least(
          v_business.closes_at,
          v_professional.ends_at
        );
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
            v_reason := case
              when v_status = 'available' then null
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
        v_reason := case
          when v_status = 'available' then null
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
set search_path = pg_catalog, public, app_private
set row_security = off
as $$
declare
  v_business_id uuid;
begin
  v_business_id := app_private.resolve_public_business_id(p_slug);
  if v_business_id is null then
    raise exception 'Página de agendamento indisponível.' using errcode = 'P0002';
  end if;

  return app_private.get_public_booking_availability_scoped_internal(
    v_business_id,
    p_service_id,
    p_professional_id,
    p_date,
    null
  );
end;
$$;
