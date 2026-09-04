-- CYRNEX FLOW - Database Foundation
-- Source of truth: versioned migrations in this directory.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists btree_gist with schema extensions;

create type public.business_status as enum ('active', 'suspended', 'archived');
create type public.operation_mode as enum ('solo', 'team');
create type public.onboarding_status as enum ('not_started', 'in_progress', 'completed');
create type public.member_role as enum ('owner', 'manager', 'professional', 'receptionist');
create type public.payment_method as enum ('cash', 'pix', 'debit', 'credit', 'other');
create type public.fee_type as enum ('none', 'percent', 'fixed');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  slug text not null,
  status public.business_status not null default 'active',
  timezone text not null default 'America/Sao_Paulo',
  currency char(3) not null default 'BRL',
  operation_mode public.operation_mode not null default 'solo',
  onboarding_status public.onboarding_status not null default 'not_started',
  onboarding_step smallint not null default 0 check (onboarding_step between 0 and 30),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint businesses_slug_format_check
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint businesses_currency_uppercase_check
    check (currency = upper(currency))
);

create unique index businesses_slug_unique_idx on public.businesses (lower(slug));
create index businesses_status_idx on public.businesses (status) where archived_at is null;

create trigger businesses_set_updated_at
before update on public.businesses
for each row execute function public.set_updated_at();

create table public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null,
  display_name text not null check (char_length(trim(display_name)) between 2 and 120),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, user_id),
  unique (business_id, id)
);

create index business_members_user_idx
  on public.business_members (user_id, business_id)
  where active = true;
create index business_members_business_role_idx
  on public.business_members (business_id, role)
  where active = true;

create trigger business_members_set_updated_at
before update on public.business_members
for each row execute function public.set_updated_at();

create table public.business_settings (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  booking_slot_interval_minutes smallint not null default 15
    check (booking_slot_interval_minutes between 5 and 120),
  min_booking_notice_minutes integer not null default 30
    check (min_booking_notice_minutes between 0 and 10080),
  max_booking_days_ahead integer not null default 60
    check (max_booking_days_ahead between 1 and 730),
  cancellation_notice_minutes integer not null default 360
    check (cancellation_notice_minutes between 0 and 43200),
  allow_client_reschedule boolean not null default true,
  allow_client_cancel boolean not null default true,
  allow_waitlist boolean not null default true,
  require_deposit boolean not null default false,
  default_deposit_percent numeric(5,2) not null default 0
    check (default_deposit_percent between 0 and 100),
  cancellation_policy text,
  booking_confirmation_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger business_settings_set_updated_at
before update on public.business_settings
for each row execute function public.set_updated_at();

create table public.business_modules (
  business_id uuid not null references public.businesses(id) on delete cascade,
  module_key text not null check (module_key ~ '^[a-z][a-z0-9_]{1,49}$'),
  enabled boolean not null default false,
  settings jsonb not null default '{}'::jsonb
    check (jsonb_typeof(settings) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_id, module_key)
);

create trigger business_modules_set_updated_at
before update on public.business_modules
for each row execute function public.set_updated_at();

create table public.business_rules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  rule_key text not null check (rule_key ~ '^[a-z][a-z0-9_]{1,79}$'),
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb
    check (jsonb_typeof(config) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, rule_key),
  unique (business_id, id)
);

create trigger business_rules_set_updated_at
before update on public.business_rules
for each row execute function public.set_updated_at();

create table public.business_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  opens_at time not null,
  closes_at time not null,
  label text,
  valid_from date,
  valid_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_hours_time_order_check check (closes_at > opens_at),
  constraint business_hours_date_order_check
    check (valid_until is null or valid_from is null or valid_until >= valid_from),
  unique (business_id, id)
);

create unique index business_hours_unique_interval_idx
  on public.business_hours (
    business_id,
    weekday,
    opens_at,
    closes_at,
    coalesce(valid_from, '0001-01-01'::date)
  );
create index business_hours_lookup_idx
  on public.business_hours (business_id, weekday, valid_from, valid_until);

create trigger business_hours_set_updated_at
before update on public.business_hours
for each row execute function public.set_updated_at();

create table public.business_payment_methods (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  method public.payment_method not null,
  label text not null,
  active boolean not null default true,
  fee_type public.fee_type not null default 'none',
  fee_value numeric(8,4) not null default 0 check (fee_value >= 0),
  display_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, method, label),
  unique (business_id, id)
);

create trigger business_payment_methods_set_updated_at
before update on public.business_payment_methods
for each row execute function public.set_updated_at();

create table public.professionals (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  member_id uuid,
  name text not null check (char_length(trim(name)) between 2 and 120),
  phone text,
  bio text,
  commission_percent numeric(5,2) not null default 0
    check (commission_percent between 0 and 100),
  accepts_online_booking boolean not null default true,
  active boolean not null default true,
  display_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  constraint professionals_member_fk
    foreign key (business_id, member_id)
    references public.business_members (business_id, id)
    on delete set null (member_id)
);

create unique index professionals_member_unique_idx
  on public.professionals (business_id, member_id)
  where member_id is not null;
create index professionals_active_idx
  on public.professionals (business_id, active, display_order);

create trigger professionals_set_updated_at
before update on public.professionals
for each row execute function public.set_updated_at();
