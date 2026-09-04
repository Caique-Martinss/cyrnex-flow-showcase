-- CYRNEX FLOW v0.11.1 — stabilization/security alignment.
-- Aligns the PostgreSQL scheduling rules with the operational lifecycle already used by the app.

alter table public.appointments
  add column if not exists buffer_after_minutes_snapshot smallint not null default 0,
  add column if not exists recurrence_paused boolean not null default false;

alter table public.appointments
  drop constraint if exists appointments_buffer_snapshot_check;
alter table public.appointments
  add constraint appointments_buffer_snapshot_check
  check (buffer_after_minutes_snapshot between 0 and 180);

-- Existing appointments keep a snapshot of the service buffer so later service edits
-- do not retroactively change the occupied interval of an old booking.
update public.appointments a
set buffer_after_minutes_snapshot = s.buffer_after_minutes
from public.services s
where s.business_id = a.business_id
  and s.id = a.service_id
  and a.buffer_after_minutes_snapshot = 0
  and s.buffer_after_minutes <> 0;

-- Canonical runtime states are scheduled/confirmed/arrived/in_service/completed/
-- cancelled/missed. Legacy pending_deposit/in_progress/no_show remain in the enum
-- for migration compatibility and are still handled safely by constraints/views.
alter table public.appointments
  drop constraint if exists appointments_no_professional_overlap;

alter table public.appointments
  add constraint appointments_no_professional_overlap
  exclude using gist (
    business_id with =,
    professional_id with =,
    tstzrange(
      starts_at,
      ends_at + make_interval(mins => buffer_after_minutes_snapshot),
      '[)'
    ) with &&
  )
  where (
    status in (
      'pending_deposit', 'confirmed', 'in_progress',
      'scheduled', 'arrived', 'in_service'
    )
    and not is_fit_in
    and not recurrence_paused
  );

-- Keep the partial index aligned with every state that still represents an active booking.
drop index if exists public.appointments_upcoming_idx;
create index appointments_upcoming_idx
  on public.appointments (business_id, starts_at)
  where status in (
    'pending_deposit', 'confirmed', 'in_progress',
    'scheduled', 'arrived', 'in_service'
  ) and not recurrence_paused;

create or replace view public.client_metrics
with (security_invoker = true)
as
with appointment_stats as (
  select
    business_id,
    client_id,
    max(completed_at) filter (where status = 'completed') as last_completed_at,
    count(*) filter (where status = 'completed')::integer as completed_appointments,
    count(*) filter (where status in ('no_show', 'missed'))::integer as no_show_count
  from public.appointments
  where client_id is not null
  group by business_id, client_id
),
payment_stats as (
  select
    business_id,
    client_id,
    sum(gross_amount) filter (where status = 'paid')::numeric(12,2) as total_paid
  from public.payments
  where client_id is not null
  group by business_id, client_id
)
select
  c.business_id,
  c.id as client_id,
  a.last_completed_at,
  coalesce(a.completed_appointments, 0) as completed_appointments,
  coalesce(a.no_show_count, 0) as no_show_count,
  coalesce(p.total_paid, 0)::numeric(12,2) as total_paid
from public.clients c
left join appointment_stats a
  on a.business_id = c.business_id
 and a.client_id = c.id
left join payment_stats p
  on p.business_id = c.business_id
 and p.client_id = c.id;

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
as $$
  with local_slot as (
    select
      b.timezone,
      p_starts_at at time zone b.timezone as local_start,
      p_ends_at at time zone b.timezone as local_end
    from public.businesses b
    where b.id = p_business_id
      and b.status = 'active'
  ),
  slot_context as (
    select
      timezone,
      local_start,
      local_end,
      local_start::date as local_date,
      extract(dow from local_start)::smallint as weekday
    from local_slot
  )
  select exists (select 1 from slot_context)
    and p_ends_at > p_starts_at
    and (
      select local_start::date = local_end::date
      from slot_context
    )
    and exists (
      select 1
      from public.business_hours h
      cross join slot_context c
      where h.business_id = p_business_id
        and h.weekday = c.weekday
        and (h.valid_from is null or h.valid_from <= c.local_date)
        and (h.valid_until is null or h.valid_until >= c.local_date)
        and h.opens_at <= c.local_start::time
        and h.closes_at >= c.local_end::time
    )
    and (
      not exists (
        select 1
        from public.professional_hours ph
        cross join slot_context c
        where ph.business_id = p_business_id
          and ph.professional_id = p_professional_id
          and ph.weekday = c.weekday
          and (ph.valid_from is null or ph.valid_from <= c.local_date)
          and (ph.valid_until is null or ph.valid_until >= c.local_date)
      )
      or exists (
        select 1
        from public.professional_hours ph
        cross join slot_context c
        where ph.business_id = p_business_id
          and ph.professional_id = p_professional_id
          and ph.weekday = c.weekday
          and (ph.valid_from is null or ph.valid_from <= c.local_date)
          and (ph.valid_until is null or ph.valid_until >= c.local_date)
          and ph.starts_at <= c.local_start::time
          and ph.ends_at >= c.local_end::time
      )
    )
    and not exists (
      select 1
      from public.appointments a
      where a.business_id = p_business_id
        and a.professional_id = p_professional_id
        and a.status in (
          'pending_deposit', 'confirmed', 'in_progress',
          'scheduled', 'arrived', 'in_service'
        )
        and not a.recurrence_paused
        and (p_exclude_appointment_id is null or a.id <> p_exclude_appointment_id)
        and tstzrange(
          a.starts_at,
          a.ends_at + make_interval(mins => a.buffer_after_minutes_snapshot),
          '[)'
        ) && tstzrange(p_starts_at, p_ends_at, '[)')
    )
    and not exists (
      select 1
      from public.schedule_blocks b
      where b.business_id = p_business_id
        and (b.professional_id is null or b.professional_id = p_professional_id)
        and tstzrange(b.starts_at, b.ends_at, '[)')
          && tstzrange(p_starts_at, p_ends_at, '[)')
    );
$$;
