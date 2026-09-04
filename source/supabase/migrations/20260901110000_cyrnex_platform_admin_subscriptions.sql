-- CYRNEX platform control plane.
-- This migration is prepared locally and must be reviewed before any remote application.
-- It intentionally keeps platform administration backend-only through service_role.

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'super_admin' check (role in ('super_admin', 'support')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_subscriptions (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  plan_code text not null default 'pilot',
  status text not null default 'trial'
    check (status in ('trial', 'active', 'past_due', 'suspended', 'cancelled')),
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  grace_period_end timestamptz,
  suspended_at timestamptz,
  cancelled_at timestamptz,
  retention_until timestamptz,
  admin_note text,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  business_id uuid references public.businesses(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists business_subscriptions_status_idx
  on public.business_subscriptions(status, updated_at desc);

create index if not exists platform_audit_logs_business_idx
  on public.platform_audit_logs(business_id, created_at desc);

create index if not exists platform_audit_logs_actor_idx
  on public.platform_audit_logs(actor_user_id, created_at desc);

alter table public.platform_admins enable row level security;
alter table public.platform_admins force row level security;
alter table public.business_subscriptions enable row level security;
alter table public.business_subscriptions force row level security;
alter table public.platform_audit_logs enable row level security;
alter table public.platform_audit_logs force row level security;

revoke all on table public.platform_admins from public, anon, authenticated;
revoke all on table public.business_subscriptions from public, anon, authenticated;
revoke all on table public.platform_audit_logs from public, anon, authenticated;

grant select, insert, update, delete on table public.platform_admins to service_role;
grant select, insert, update, delete on table public.business_subscriptions to service_role;
grant select, insert on table public.platform_audit_logs to service_role;

-- Existing businesses are preserved as active so this migration never suspends
-- a staging/pilot business merely because the control plane was introduced.
insert into public.business_subscriptions (
  business_id,
  plan_code,
  status,
  current_period_end
)
select b.id, 'pilot', 'active', null
from public.businesses b
on conflict (business_id) do nothing;

create or replace function app_private.create_default_business_subscription()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
set row_security = off
as $$
begin
  insert into public.business_subscriptions (
    business_id,
    plan_code,
    status,
    trial_ends_at
  ) values (
    new.id,
    'trial',
    'trial',
    now() + interval '14 days'
  ) on conflict (business_id) do nothing;
  return new;
end;
$$;

drop trigger if exists businesses_default_subscription on public.businesses;
create trigger businesses_default_subscription
after insert on public.businesses
for each row execute function app_private.create_default_business_subscription();

create or replace function app_private.touch_platform_control_row()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists platform_admins_touch_updated_at on public.platform_admins;
create trigger platform_admins_touch_updated_at
before update on public.platform_admins
for each row execute function app_private.touch_platform_control_row();

drop trigger if exists business_subscriptions_touch_updated_at on public.business_subscriptions;
create trigger business_subscriptions_touch_updated_at
before update on public.business_subscriptions
for each row execute function app_private.touch_platform_control_row();

revoke all on function app_private.create_default_business_subscription()
  from public, anon, authenticated;
revoke all on function app_private.touch_platform_control_row()
  from public, anon, authenticated;
