-- Read models and database helpers. Views use invoker security so RLS still applies.

create or replace view public.client_metrics
with (security_invoker = true)
as
with appointment_stats as (
  select
    business_id,
    client_id,
    max(completed_at) filter (where status = 'completed') as last_completed_at,
    count(*) filter (where status = 'completed')::integer as completed_appointments,
    count(*) filter (where status = 'no_show')::integer as no_show_count
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

create or replace view public.clients_due_for_return
with (security_invoker = true)
as
with latest_completed as (
  select distinct on (a.business_id, a.client_id)
    a.business_id,
    a.client_id,
    a.service_id,
    a.completed_at,
    a.starts_at
  from public.appointments a
  where a.client_id is not null
    and a.status = 'completed'
    and a.completed_at is not null
  order by a.business_id, a.client_id, a.starts_at desc
)
select
  c.business_id,
  c.id as client_id,
  c.full_name,
  lc.service_id,
  s.name as last_service_name,
  lc.completed_at as last_completed_at,
  s.recommended_return_days,
  (
    (lc.completed_at at time zone b.timezone)::date
      + s.recommended_return_days
  ) as due_on,
  greatest(
    (now() at time zone b.timezone)::date
      - (
          (lc.completed_at at time zone b.timezone)::date
            + s.recommended_return_days
        ),
    0
  ) as days_overdue
from latest_completed lc
join public.clients c
  on c.business_id = lc.business_id
 and c.id = lc.client_id
join public.services s
  on s.business_id = lc.business_id
 and s.id = lc.service_id
join public.businesses b on b.id = lc.business_id
where s.recommended_return_days is not null
  and c.status = 'active'
  and (
    (lc.completed_at at time zone b.timezone)::date
      + s.recommended_return_days
  ) <= (now() at time zone b.timezone)::date;

create or replace view public.product_stock
with (security_invoker = true)
as
select
  p.business_id,
  p.id as product_id,
  coalesce(sum(m.quantity_delta), 0)::bigint as stock_on_hand,
  p.low_stock_threshold,
  (
    p.track_stock
    and coalesce(sum(m.quantity_delta), 0) <= p.low_stock_threshold
  ) as low_stock
from public.products p
left join public.inventory_movements m
  on m.business_id = p.business_id
 and m.product_id = p.id
group by p.business_id, p.id, p.low_stock_threshold, p.track_stock;

create or replace view public.product_available_stock
with (security_invoker = true)
as
with reserved as (
  select
    business_id,
    product_id,
    sum(quantity)::bigint as reserved_quantity
  from public.inventory_reservations
  where status = 'active'
    and expires_at > now()
  group by business_id, product_id
)
select
  ps.business_id,
  ps.product_id,
  ps.stock_on_hand,
  coalesce(r.reserved_quantity, 0)::bigint as reserved_quantity,
  greatest(ps.stock_on_hand - coalesce(r.reserved_quantity, 0), 0)::bigint
    as available_stock,
  ps.low_stock_threshold,
  (
    greatest(ps.stock_on_hand - coalesce(r.reserved_quantity, 0), 0)
      <= ps.low_stock_threshold
  ) as low_available_stock
from public.product_stock ps
left join reserved r
  on r.business_id = ps.business_id
 and r.product_id = ps.product_id;

create or replace view public.receivable_balances
with (security_invoker = true)
as
select
  r.business_id,
  r.id as receivable_id,
  r.client_id,
  r.original_amount,
  coalesce(
    sum(e.amount) filter (where e.entry_type in ('payment', 'forgiveness', 'decrease')),
    0
  )::numeric(12,2) as settled_amount,
  coalesce(sum(e.amount) filter (where e.entry_type = 'increase'), 0)::numeric(12,2)
    as increased_amount,
  greatest(
    r.original_amount
      + coalesce(sum(e.amount) filter (where e.entry_type = 'increase'), 0)
      - coalesce(
          sum(e.amount) filter (where e.entry_type in ('payment', 'forgiveness', 'decrease')),
          0
        ),
    0
  )::numeric(12,2) as open_balance,
  r.status,
  r.due_date,
  r.created_at
from public.receivables r
left join public.receivable_entries e
  on e.business_id = r.business_id
 and e.receivable_id = r.id
group by r.business_id, r.id;

create or replace view public.professional_commission_ledger
with (security_invoker = true)
as
select
  a.business_id,
  a.professional_id,
  a.id as appointment_id,
  a.starts_at,
  a.completed_at,
  a.service_name_snapshot,
  a.status,
  a.commission_amount
from public.appointments a
where a.status = 'completed';

create or replace view public.daily_financial_summary
with (security_invoker = true)
as
with payment_days as (
  select
    business_id,
    (p.paid_at at time zone b.timezone)::date as summary_date,
    sum(gross_amount)::numeric(14,2) as gross_revenue,
    sum(fee_amount)::numeric(14,2) as payment_fees,
    sum(net_amount)::numeric(14,2) as net_received
  from public.payments p
  join public.businesses b on b.id = p.business_id
  where p.status = 'paid' and p.paid_at is not null
  group by p.business_id, (p.paid_at at time zone b.timezone)::date
),
expense_days as (
  select
    business_id,
    expense_date as summary_date,
    sum(amount)::numeric(14,2) as expenses
  from public.expenses
  group by business_id, expense_date
),
all_days as (
  select business_id, summary_date from payment_days
  union
  select business_id, summary_date from expense_days
)
select
  d.business_id,
  d.summary_date,
  coalesce(p.gross_revenue, 0)::numeric(14,2) as gross_revenue,
  coalesce(p.payment_fees, 0)::numeric(14,2) as payment_fees,
  coalesce(p.net_received, 0)::numeric(14,2) as net_received,
  coalesce(e.expenses, 0)::numeric(14,2) as expenses,
  (
    coalesce(p.net_received, 0) - coalesce(e.expenses, 0)
  )::numeric(14,2) as operating_result
from all_days d
left join payment_days p using (business_id, summary_date)
left join expense_days e using (business_id, summary_date);

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
        and a.status in ('pending_deposit', 'confirmed', 'in_progress')
        and (p_exclude_appointment_id is null or a.id <> p_exclude_appointment_id)
        and tstzrange(a.starts_at, a.ends_at, '[)')
          && tstzrange(p_starts_at, p_ends_at, '[)')
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

create or replace function public.expire_pending_appointment_holds(
  p_business_id uuid
)
returns integer
language plpgsql
as $$
declare
  affected integer;
begin
  update public.appointments
  set
    status = 'cancelled',
    cancelled_at = now(),
    cancellation_reason = 'Tempo para pagamento do sinal expirado.'
  where business_id = p_business_id
    and status = 'pending_deposit'
    and hold_expires_at is not null
    and hold_expires_at <= now();

  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke execute on function public.expire_pending_appointment_holds(uuid) from public;
revoke execute on function public.expire_pending_appointment_holds(uuid) from authenticated;
grant execute on function public.expire_pending_appointment_holds(uuid) to service_role;
