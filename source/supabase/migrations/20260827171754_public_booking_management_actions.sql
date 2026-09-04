create or replace function app_private.get_public_booking_management_availability_internal(
  p_slug text,
  p_token_hash text,
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
  v_access record;
  v_appointment public.appointments%rowtype;
  v_settings public.business_settings%rowtype;
  v_deadline timestamptz;
begin
  select * into v_access
  from app_private.resolve_public_booking_access_internal(
    p_slug,
    p_token_hash
  );

  if not found then
    raise exception 'Agendamento não encontrado ou link expirado.'
      using errcode = 'P0002';
  end if;

  select * into v_appointment
  from public.appointments a
  where a.business_id = v_access.business_id
    and a.id = v_access.appointment_id;

  select * into v_settings
  from public.business_settings s
  where s.business_id = v_access.business_id;

  v_deadline := v_appointment.starts_at
    - make_interval(mins => v_settings.cancellation_notice_minutes);

  if not v_settings.allow_client_reschedule then
    raise exception 'A barbearia não permite reagendamento online.'
      using errcode = 'P0003';
  end if;
  if v_appointment.status not in ('scheduled', 'confirmed') then
    raise exception 'Este agendamento não pode mais ser reagendado.'
      using errcode = 'P0003';
  end if;
  if now() > v_deadline then
    raise exception 'O prazo para reagendar este atendimento já terminou.'
      using errcode = 'P0003';
  end if;

  return app_private.get_public_booking_availability_scoped_internal(
    v_access.business_id,
    v_appointment.service_id,
    v_appointment.professional_id,
    p_date,
    v_appointment.id
  );
end;
$$;

create or replace function public.get_public_booking_management_availability(
  p_slug text,
  p_token_hash text,
  p_date date
)
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, public, app_private
as $$
  select app_private.get_public_booking_management_availability_internal(
    p_slug,
    p_token_hash,
    p_date
  );
$$;

create or replace function app_private.reschedule_public_booking_internal(
  p_slug text,
  p_token_hash text,
  p_new_starts_at timestamptz
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, app_private
set row_security = off
as $$
declare
  v_access record;
  v_appointment public.appointments%rowtype;
  v_settings public.business_settings%rowtype;
  v_validation jsonb;
  v_deadline timestamptz;
  v_old_start timestamptz;
begin
  select * into v_access
  from app_private.resolve_public_booking_access_internal(
    p_slug,
    p_token_hash
  );

  if not found then
    raise exception 'Agendamento não encontrado ou link expirado.'
      using errcode = 'P0002';
  end if;

  select * into v_appointment
  from public.appointments a
  where a.business_id = v_access.business_id
    and a.id = v_access.appointment_id
  for update;

  select * into v_settings
  from public.business_settings s
  where s.business_id = v_access.business_id;

  v_deadline := v_appointment.starts_at
    - make_interval(mins => v_settings.cancellation_notice_minutes);

  if not v_settings.allow_client_reschedule then
    raise exception 'A barbearia não permite reagendamento online.'
      using errcode = 'P0003';
  end if;
  if v_appointment.status not in ('scheduled', 'confirmed') then
    raise exception 'Este agendamento não pode mais ser reagendado.'
      using errcode = 'P0003';
  end if;
  if now() > v_deadline then
    raise exception 'O prazo para reagendar este atendimento já terminou.'
      using errcode = 'P0003';
  end if;
  if p_new_starts_at = v_appointment.starts_at then
    raise exception 'Escolha um horário diferente do atual.'
      using errcode = 'P0003';
  end if;

  v_validation := app_private.agenda_slot_validation_internal(
    v_access.business_id,
    v_appointment.professional_id,
    p_new_starts_at,
    v_appointment.duration_minutes_snapshot,
    v_appointment.buffer_after_minutes_snapshot,
    array[v_appointment.id],
    true
  );

  if not coalesce((v_validation ->> 'ok')::boolean, false) then
    raise exception '%', coalesce(
      v_validation ->> 'message',
      'Horário indisponível.'
    ) using errcode = case
      when v_validation ->> 'kind' = 'occupied' then '23P01'
      else '23514'
    end;
  end if;

  v_old_start := v_appointment.starts_at;

  update public.appointments
  set starts_at = p_new_starts_at,
      ends_at = p_new_starts_at
        + make_interval(mins => v_appointment.duration_minutes_snapshot),
      occupied_until = p_new_starts_at + make_interval(
        mins => v_appointment.duration_minutes_snapshot
          + v_appointment.buffer_after_minutes_snapshot
      ),
      rescheduled_at = now()
  where business_id = v_access.business_id
    and id = v_appointment.id;

  insert into public.appointment_events (
    business_id,
    appointment_id,
    event_type,
    notes,
    actor_user_id,
    actor_name
  ) values (
    v_access.business_id,
    v_appointment.id,
    'rescheduled',
    v_old_start::text || ' → ' || p_new_starts_at::text,
    null,
    'Cliente — Página pública'
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
    v_access.business_id,
    'appointment.public_rescheduled',
    'appointment',
    v_appointment.id,
    null,
    'Cliente — Página pública',
    jsonb_build_object(
      'previousDate', v_old_start,
      'newDate', p_new_starts_at
    )
  );

  return app_private.public_booking_management_payload_internal(
    v_access.business_id,
    v_appointment.id,
    v_access.expires_at
  );
exception
  when exclusion_violation then
    raise exception 'Esse horário acabou de ser reservado. Escolha outro.'
      using errcode = '23P01';
end;
$$;

create or replace function public.reschedule_public_booking(
  p_slug text,
  p_token_hash text,
  p_new_starts_at timestamptz
)
returns jsonb
language sql
volatile
security invoker
set search_path = pg_catalog, public, app_private
as $$
  select app_private.reschedule_public_booking_internal(
    p_slug,
    p_token_hash,
    p_new_starts_at
  );
$$;

create or replace function app_private.cancel_public_booking_internal(
  p_slug text,
  p_token_hash text,
  p_reason text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, app_private
set row_security = off
as $$
declare
  v_access record;
  v_appointment public.appointments%rowtype;
  v_settings public.business_settings%rowtype;
  v_deadline timestamptz;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  select * into v_access
  from app_private.resolve_public_booking_access_internal(
    p_slug,
    p_token_hash
  );

  if not found then
    raise exception 'Agendamento não encontrado ou link expirado.'
      using errcode = 'P0002';
  end if;

  select * into v_appointment
  from public.appointments a
  where a.business_id = v_access.business_id
    and a.id = v_access.appointment_id
  for update;

  select * into v_settings
  from public.business_settings s
  where s.business_id = v_access.business_id;

  v_deadline := v_appointment.starts_at
    - make_interval(mins => v_settings.cancellation_notice_minutes);

  if not v_settings.allow_client_cancel then
    raise exception 'A barbearia não permite cancelamento online.'
      using errcode = 'P0003';
  end if;
  if v_appointment.status not in ('scheduled', 'confirmed') then
    raise exception 'Este agendamento não pode mais ser cancelado.'
      using errcode = 'P0003';
  end if;
  if now() > v_deadline then
    raise exception 'O prazo para cancelar este atendimento já terminou.'
      using errcode = 'P0003';
  end if;
  if char_length(coalesce(v_reason, '')) > 500 then
    raise exception 'O motivo precisa ter no máximo 500 caracteres.'
      using errcode = '22023';
  end if;

  update public.appointments
  set status = 'cancelled',
      cancelled_at = now()
  where business_id = v_access.business_id
    and id = v_appointment.id;

  insert into public.appointment_events (
    business_id,
    appointment_id,
    event_type,
    notes,
    actor_user_id,
    actor_name
  ) values (
    v_access.business_id,
    v_appointment.id,
    'cancelled',
    v_reason,
    null,
    'Cliente — Página pública'
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
    v_access.business_id,
    'appointment.public_cancelled',
    'appointment',
    v_appointment.id,
    null,
    'Cliente — Página pública',
    jsonb_build_object(
      'previousStatus', v_appointment.status,
      'reason', v_reason,
      'depositStatus', v_appointment.deposit_status
    )
  );

  return app_private.public_booking_management_payload_internal(
    v_access.business_id,
    v_appointment.id,
    v_access.expires_at
  );
end;
$$;

create or replace function public.cancel_public_booking(
  p_slug text,
  p_token_hash text,
  p_reason text default null
)
returns jsonb
language sql
volatile
security invoker
set search_path = pg_catalog, public, app_private
as $$
  select app_private.cancel_public_booking_internal(
    p_slug,
    p_token_hash,
    p_reason
  );
$$;

revoke all on function app_private.resolve_public_booking_access_internal(
  text,
  text
) from public, anon, authenticated;

revoke all on function app_private.public_booking_management_payload_internal(
  uuid,
  uuid,
  timestamptz
) from public, anon, authenticated;

revoke all on function app_private.get_public_booking_availability_scoped_internal(
  uuid,
  uuid,
  uuid,
  date,
  uuid
) from public, anon, authenticated;

revoke all on function app_private.create_public_booking_with_access_internal(
  text,
  text,
  text,
  text,
  uuid,
  uuid,
  timestamptz,
  text,
  text
) from public, anon, authenticated;

revoke all on function app_private.get_public_booking_management_internal(
  text,
  text
) from public, anon, authenticated;

revoke all on function app_private.get_public_booking_management_availability_internal(
  text,
  text,
  date
) from public, anon, authenticated;

revoke all on function app_private.reschedule_public_booking_internal(
  text,
  text,
  timestamptz
) from public, anon, authenticated;

revoke all on function app_private.cancel_public_booking_internal(
  text,
  text,
  text
) from public, anon, authenticated;

revoke all on function public.create_public_booking_with_access(
  text,
  text,
  text,
  text,
  uuid,
  uuid,
  timestamptz,
  text,
  text
) from public, anon, authenticated;

revoke all on function public.get_public_booking_management(
  text,
  text
) from public, anon, authenticated;

revoke all on function public.get_public_booking_management_availability(
  text,
  text,
  date
) from public, anon, authenticated;

revoke all on function public.reschedule_public_booking(
  text,
  text,
  timestamptz
) from public, anon, authenticated;

revoke all on function public.cancel_public_booking(
  text,
  text,
  text
) from public, anon, authenticated;

-- The old booking RPC remains private but is no longer callable directly by the backend role.
revoke execute on function public.create_public_booking(
  text,
  text,
  text,
  text,
  uuid,
  uuid,
  timestamptz,
  text
) from service_role;

grant execute on function app_private.resolve_public_booking_access_internal(
  text,
  text
) to service_role;

grant execute on function app_private.public_booking_management_payload_internal(
  uuid,
  uuid,
  timestamptz
) to service_role;

grant execute on function app_private.get_public_booking_availability_scoped_internal(
  uuid,
  uuid,
  uuid,
  date,
  uuid
) to service_role;

grant execute on function app_private.create_public_booking_with_access_internal(
  text,
  text,
  text,
  text,
  uuid,
  uuid,
  timestamptz,
  text,
  text
) to service_role;

grant execute on function app_private.get_public_booking_management_internal(
  text,
  text
) to service_role;

grant execute on function app_private.get_public_booking_management_availability_internal(
  text,
  text,
  date
) to service_role;

grant execute on function app_private.reschedule_public_booking_internal(
  text,
  text,
  timestamptz
) to service_role;

grant execute on function app_private.cancel_public_booking_internal(
  text,
  text,
  text
) to service_role;

grant execute on function public.create_public_booking_with_access(
  text,
  text,
  text,
  text,
  uuid,
  uuid,
  timestamptz,
  text,
  text
) to service_role;

grant execute on function public.get_public_booking_management(
  text,
  text
) to service_role;

grant execute on function public.get_public_booking_management_availability(
  text,
  text,
  date
) to service_role;

grant execute on function public.reschedule_public_booking(
  text,
  text,
  timestamptz
) to service_role;

grant execute on function public.cancel_public_booking(
  text,
  text,
  text
) to service_role;
