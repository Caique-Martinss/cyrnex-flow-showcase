create or replace function app_private.create_public_booking_with_access_internal(
  p_slug text,
  p_name text,
  p_phone text,
  p_email text,
  p_service_id uuid,
  p_professional_id uuid,
  p_starts_at timestamptz,
  p_notes text,
  p_access_token_hash text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, app_private
set row_security = off
as $$
declare
  v_result jsonb;
  v_appointment_id uuid;
  v_business_id uuid;
  v_expires_at timestamptz;
begin
  if p_access_token_hash is null
    or p_access_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Token de gerenciamento inválido.' using errcode = '22023';
  end if;

  v_result := app_private.create_public_booking_internal(
    p_slug,
    p_name,
    p_phone,
    p_email,
    p_service_id,
    p_professional_id,
    p_starts_at,
    p_notes
  );

  v_appointment_id := (v_result ->> 'appointmentId')::uuid;
  v_business_id := app_private.resolve_public_business_id(p_slug);
  v_expires_at := p_starts_at + interval '365 days';

  insert into public.booking_access_tokens (
    business_id,
    appointment_id,
    token_hash,
    expires_at
  ) values (
    v_business_id,
    v_appointment_id,
    p_access_token_hash,
    v_expires_at
  );

  return v_result || jsonb_build_object(
    'managementExpiresAt', v_expires_at
  );
end;
$$;

create or replace function public.create_public_booking_with_access(
  p_slug text,
  p_name text,
  p_phone text,
  p_email text,
  p_service_id uuid,
  p_professional_id uuid,
  p_starts_at timestamptz,
  p_notes text,
  p_access_token_hash text
)
returns jsonb
language sql
volatile
security invoker
set search_path = pg_catalog, public, app_private
as $$
  select app_private.create_public_booking_with_access_internal(
    p_slug,
    p_name,
    p_phone,
    p_email,
    p_service_id,
    p_professional_id,
    p_starts_at,
    p_notes,
    p_access_token_hash
  );
$$;

create or replace function app_private.get_public_booking_management_internal(
  p_slug text,
  p_token_hash text
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

  return app_private.public_booking_management_payload_internal(
    v_access.business_id,
    v_access.appointment_id,
    v_access.expires_at
  );
end;
$$;

create or replace function public.get_public_booking_management(
  p_slug text,
  p_token_hash text
)
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, public, app_private
as $$
  select app_private.get_public_booking_management_internal(
    p_slug,
    p_token_hash
  );
$$;
