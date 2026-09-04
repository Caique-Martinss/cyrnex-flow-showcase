revoke execute on function public.rls_auto_enable() from public,anon,authenticated;

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
set search_path = pg_catalog,public,auth,app_private
set row_security = off
as $$
declare
  v_timezone text;
  v_local_start timestamp;
  v_local_end timestamp;
  v_weekday smallint;
  v_date date;
begin
  if not app_private.is_business_member(p_business_id) then return false; end if;
  if p_ends_at <= p_starts_at then return false; end if;
  if not exists (
    select 1 from public.professionals p
    where p.business_id=p_business_id
      and p.id=p_professional_id
      and p.active
      and p.serves_clients
  ) then return false; end if;

  select timezone into v_timezone
  from public.businesses
  where id=p_business_id and status='active';
  if v_timezone is null then return false; end if;

  v_local_start := p_starts_at at time zone v_timezone;
  v_local_end := p_ends_at at time zone v_timezone;
  if v_local_start::date <> v_local_end::date then return false; end if;
  v_weekday := extract(dow from v_local_start)::smallint;
  v_date := v_local_start::date;

  if not exists (
    select 1 from public.business_hours h
    where h.business_id=p_business_id
      and h.weekday=v_weekday
      and (h.valid_from is null or h.valid_from<=v_date)
      and (h.valid_until is null or h.valid_until>=v_date)
      and h.opens_at<=v_local_start::time
      and h.closes_at>=v_local_end::time
  ) then return false; end if;

  if exists (
    select 1 from public.professional_hours ph
    where ph.business_id=p_business_id
      and ph.professional_id=p_professional_id
      and ph.weekday=v_weekday
      and (ph.valid_from is null or ph.valid_from<=v_date)
      and (ph.valid_until is null or ph.valid_until>=v_date)
  ) and not exists (
    select 1 from public.professional_hours ph
    where ph.business_id=p_business_id
      and ph.professional_id=p_professional_id
      and ph.weekday=v_weekday
      and (ph.valid_from is null or ph.valid_from<=v_date)
      and (ph.valid_until is null or ph.valid_until>=v_date)
      and ph.starts_at<=v_local_start::time
      and ph.ends_at>=v_local_end::time
  ) then return false; end if;

  if exists (
    select 1 from public.appointments a
    where a.business_id=p_business_id
      and a.professional_id=p_professional_id
      and a.status in ('scheduled','confirmed','arrived','in_service')
      and not a.recurrence_paused
      and (p_exclude_appointment_id is null or a.id<>p_exclude_appointment_id)
      and tstzrange(a.starts_at,a.occupied_until,'[)')
        && tstzrange(p_starts_at,p_ends_at,'[)')
  ) then return false; end if;

  if exists (
    select 1 from public.schedule_blocks b
    where b.business_id=p_business_id
      and (b.professional_id is null or b.professional_id=p_professional_id)
      and tstzrange(b.starts_at,b.ends_at,'[)')
        && tstzrange(p_starts_at,p_ends_at,'[)')
  ) then return false; end if;

  return true;
end;
$$;
revoke all on function app_private.is_time_slot_available_internal(
  uuid,uuid,timestamptz,timestamptz,uuid
) from public,anon;
grant execute on function app_private.is_time_slot_available_internal(
  uuid,uuid,timestamptz,timestamptz,uuid
) to authenticated;

create or replace function public.is_time_slot_available(
  p_business_id uuid,
  p_professional_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_exclude_appointment_id uuid default null
)
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog,public,app_private
as $$
  select app_private.is_time_slot_available_internal(
    p_business_id,p_professional_id,p_starts_at,p_ends_at,p_exclude_appointment_id
  );
$$;
revoke all on function public.is_time_slot_available(
  uuid,uuid,timestamptz,timestamptz,uuid
) from public,anon;
grant execute on function public.is_time_slot_available(
  uuid,uuid,timestamptz,timestamptz,uuid
) to authenticated;
