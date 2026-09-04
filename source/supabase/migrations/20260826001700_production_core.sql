-- CYRNEX FLOW v0.12.0 - Production Core Baseline
-- Canonical PostgreSQL/Supabase schema for the launch path.
-- This migration is intentionally focused on the MVP core: multi-tenant identity,
-- catalog, clients, scheduling, public profile, expenses, audit and RLS.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists btree_gist with schema extensions;

create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;

create type public.business_status as enum ('active', 'suspended', 'archived');
create type public.operation_mode as enum ('solo', 'team');
create type public.onboarding_status as enum ('not_started', 'in_progress', 'completed');
create type public.member_role as enum ('owner', 'manager', 'professional', 'receptionist');
create type public.payment_method as enum ('cash', 'pix', 'debit', 'credit', 'other');
create type public.fee_type as enum ('none', 'percent', 'fixed');
create type public.client_origin as enum ('public', 'manual', 'walk_in', 'imported');
create type public.client_status as enum ('active', 'blocked', 'archived');
create type public.appointment_status as enum (
  'scheduled', 'confirmed', 'arrived', 'in_service', 'completed', 'missed', 'cancelled'
);
create type public.appointment_source as enum (
  'admin', 'public', 'retroactive', 'fit_in', 'recurrence', 'waitlist', 'walk_in'
);
create type public.deposit_status as enum ('pending', 'paid', 'waived');
create type public.schedule_block_type as enum ('break', 'closed', 'personal', 'maintenance', 'other');
create type public.recurrence_frequency as enum ('weekly', 'biweekly', 'monthly', 'custom');
create type public.recurrence_status as enum ('active', 'paused', 'ended', 'cancelled');
create type public.waitlist_status as enum ('waiting', 'contacted', 'booked', 'cancelled');
create type public.retroactive_request_status as enum ('pending', 'approved', 'rejected');
create type public.retroactive_proof_type as enum ('payment_record', 'receipt', 'client_confirmation', 'other');
create type public.appointment_event_type as enum (
  'created', 'confirmed', 'arrived', 'started', 'completed', 'rescheduled',
  'cancelled', 'missed', 'fit_in_confirmed'
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.normalize_phone(value text)
returns text
language sql
immutable
strict
set search_path = pg_catalog, public
as $$
  select nullif(regexp_replace(value, '[^0-9]', '', 'g'), '');
$$;

create table public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (username ~ '^[a-z0-9._-]{3,40}$'),
  display_name text not null check (char_length(trim(display_name)) between 2 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index user_profiles_username_unique_idx on public.user_profiles (lower(username));
create trigger user_profiles_set_updated_at before update on public.user_profiles
for each row execute function public.set_updated_at();

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  status public.business_status not null default 'active',
  timezone text not null default 'America/Sao_Paulo',
  currency char(3) not null default 'BRL' check (currency = upper(currency)),
  operation_mode public.operation_mode not null default 'solo',
  onboarding_status public.onboarding_status not null default 'not_started',
  onboarding_step smallint not null default 0 check (onboarding_step between 0 and 30),
  onboarding_completed_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint businesses_onboarding_completion_check
    check (onboarding_status <> 'completed' or onboarding_completed_at is not null)
);
create unique index businesses_slug_unique_idx on public.businesses (lower(slug));
create index businesses_status_idx on public.businesses(status) where archived_at is null;
create trigger businesses_set_updated_at before update on public.businesses
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
create index business_members_user_idx on public.business_members(user_id, business_id) where active;
create index business_members_business_role_idx on public.business_members(business_id, role) where active;
create trigger business_members_set_updated_at before update on public.business_members
for each row execute function public.set_updated_at();

create table public.business_settings (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  booking_slot_interval_minutes smallint not null default 15 check (booking_slot_interval_minutes between 5 and 120),
  min_booking_notice_minutes integer not null default 30 check (min_booking_notice_minutes between 0 and 10080),
  max_booking_days_ahead integer not null default 60 check (max_booking_days_ahead between 1 and 730),
  cancellation_notice_minutes integer not null default 360 check (cancellation_notice_minutes between 0 and 43200),
  allow_client_reschedule boolean not null default true,
  allow_client_cancel boolean not null default true,
  allow_waitlist boolean not null default true,
  require_deposit boolean not null default false,
  default_deposit_percent numeric(5,2) not null default 0 check (default_deposit_percent between 0 and 100),
  confirmation_mode text not null default 'automatic' check (confirmation_mode in ('automatic','manual')),
  require_client_name boolean not null default true,
  require_client_phone boolean not null default true,
  require_client_email boolean not null default false,
  allow_client_notes boolean not null default true,
  allow_manual_overtime boolean not null default true,
  cancellation_policy text,
  booking_confirmation_message text,
  payment_preferences jsonb not null default '{}'::jsonb check (jsonb_typeof(payment_preferences) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger business_settings_set_updated_at before update on public.business_settings
for each row execute function public.set_updated_at();

create table public.business_modules (
  business_id uuid not null references public.businesses(id) on delete cascade,
  module_key text not null check (module_key ~ '^[a-z][a-z0-9_]{1,49}$'),
  enabled boolean not null default false,
  settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_id, module_key)
);
create trigger business_modules_set_updated_at before update on public.business_modules
for each row execute function public.set_updated_at();

create table public.business_rules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  rule_key text not null check (rule_key ~ '^[a-z][a-z0-9_]{1,79}$'),
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, rule_key),
  unique (business_id, id)
);
create trigger business_rules_set_updated_at before update on public.business_rules
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
  unique (business_id, id),
  constraint business_hours_time_order_check check (closes_at > opens_at),
  constraint business_hours_date_order_check check (valid_until is null or valid_from is null or valid_until >= valid_from)
);
create index business_hours_lookup_idx on public.business_hours(business_id, weekday, valid_from, valid_until);
create trigger business_hours_set_updated_at before update on public.business_hours
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
create trigger business_payment_methods_set_updated_at before update on public.business_payment_methods
for each row execute function public.set_updated_at();

create table public.file_assets (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  storage_bucket text not null,
  storage_path text not null,
  original_name text,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (storage_bucket, storage_path),
  unique (business_id, id)
);
create index file_assets_business_created_idx on public.file_assets(business_id, created_at desc);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 2 and 160),
  phone_raw text,
  phone_normalized text generated always as (public.normalize_phone(phone_raw)) stored,
  email text,
  birth_date date,
  internal_notes text,
  origin public.client_origin not null default 'manual',
  status public.client_status not null default 'active',
  marketing_consent_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (business_id, id),
  constraint clients_phone_format_check check (phone_normalized is null or phone_normalized ~ '^[0-9]{10,15}$'),
  constraint clients_email_format_check check (email is null or position('@' in email) > 1)
);
create unique index clients_business_phone_unique_idx on public.clients(business_id, phone_normalized)
  where phone_normalized is not null and status <> 'archived';
create index clients_business_name_idx on public.clients(business_id, lower(full_name));
create index clients_business_status_idx on public.clients(business_id, status);
create trigger clients_set_updated_at before update on public.clients
for each row execute function public.set_updated_at();

create table public.professionals (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  member_id uuid,
  name text not null check (char_length(trim(name)) between 2 and 120),
  professional_name text,
  onboarding_role text not null default 'barber' check (onboarding_role in ('owner','barber','manager','receptionist','assistant','other')),
  phone text,
  email text,
  bio text,
  serves_clients boolean not null default true,
  receives_commission boolean not null default false,
  commission_percent numeric(5,2) not null default 0 check (commission_percent between 0 and 100),
  accepts_online_booking boolean not null default true,
  public_visible boolean not null default true,
  is_owner boolean not null default false,
  active boolean not null default true,
  display_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  constraint professionals_member_fk foreign key (business_id, member_id)
    references public.business_members(business_id, id) on delete set null (member_id)
);
create unique index professionals_member_unique_idx on public.professionals(business_id, member_id) where member_id is not null;
create index professionals_active_idx on public.professionals(business_id, active, display_order);
create trigger professionals_set_updated_at before update on public.professionals
for each row execute function public.set_updated_at();

create table public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  category text,
  name text not null check (char_length(trim(name)) between 2 and 120),
  description text,
  duration_minutes smallint not null check (duration_minutes between 5 and 720),
  buffer_after_minutes smallint not null default 0 check (buffer_after_minutes between 0 and 180),
  base_price numeric(12,2) not null check (base_price >= 0),
  price_type text not null default 'fixed' check (price_type in ('fixed','from','consult')),
  public_price_visible boolean not null default true,
  deposit_percent_override numeric(5,2) check (deposit_percent_override is null or deposit_percent_override between 0 and 100),
  online_booking_enabled boolean not null default true,
  recommended_return_days smallint check (recommended_return_days is null or recommended_return_days between 1 and 3650),
  active boolean not null default true,
  display_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id)
);
create unique index services_business_name_unique_idx on public.services(business_id, lower(name)) where active;
create index services_catalog_idx on public.services(business_id, active, online_booking_enabled, display_order);
create trigger services_set_updated_at before update on public.services
for each row execute function public.set_updated_at();

create table public.professional_services (
  business_id uuid not null,
  professional_id uuid not null,
  service_id uuid not null,
  custom_price numeric(12,2) check (custom_price is null or custom_price >= 0),
  custom_duration_minutes smallint check (custom_duration_minutes is null or custom_duration_minutes between 5 and 720),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_id, professional_id, service_id),
  constraint professional_services_professional_fk foreign key (business_id, professional_id)
    references public.professionals(business_id, id) on delete cascade,
  constraint professional_services_service_fk foreign key (business_id, service_id)
    references public.services(business_id, id) on delete cascade
);
create index professional_services_lookup_idx on public.professional_services(business_id, service_id, active);
create trigger professional_services_set_updated_at before update on public.professional_services
for each row execute function public.set_updated_at();

create table public.professional_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  professional_id uuid not null,
  weekday smallint not null check (weekday between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  valid_from date,
  valid_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  constraint professional_hours_professional_fk foreign key (business_id, professional_id)
    references public.professionals(business_id, id) on delete cascade,
  constraint professional_hours_time_order_check check (ends_at > starts_at),
  constraint professional_hours_date_order_check check (valid_until is null or valid_from is null or valid_until >= valid_from)
);
create index professional_hours_lookup_idx on public.professional_hours(business_id, professional_id, weekday, valid_from, valid_until);
create trigger professional_hours_set_updated_at before update on public.professional_hours
for each row execute function public.set_updated_at();

create table public.business_public_profiles (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  headline text,
  about_text text,
  founded_year smallint check (founded_year is null or founded_year between 1900 and 2200),
  phone_public text,
  email_public text,
  address_line text,
  city text,
  state text,
  postal_code text,
  instagram_url text,
  whatsapp_public text,
  website_url text,
  public_page_enabled boolean not null default true,
  origin_story text,
  experience_text text,
  style_description text,
  differentiator_text text,
  specialties jsonb not null default '[]'::jsonb check (jsonb_typeof(specialties) = 'array'),
  differentials jsonb not null default '[]'::jsonb check (jsonb_typeof(differentials) = 'array'),
  public_sections jsonb not null default '[]'::jsonb check (jsonb_typeof(public_sections) = 'array'),
  section_order jsonb not null default '[]'::jsonb check (jsonb_typeof(section_order) = 'array'),
  primary_action text not null default 'booking' check (primary_action in ('booking','whatsapp','services')),
  location_visibility text not null default 'full' check (location_visibility in ('full','area','hidden')),
  page_theme text not null default 'auto' check (page_theme in ('light','dark','auto')),
  accent_color text not null default '#b78945',
  publish_on_complete boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger business_public_profiles_set_updated_at before update on public.business_public_profiles
for each row execute function public.set_updated_at();

create table public.business_public_media (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  media_kind text not null check (media_kind in ('space','portfolio')),
  media_type text not null default 'image' check (media_type in ('image','video')),
  asset_id uuid not null,
  service_id uuid,
  title text,
  description text,
  category text,
  public_visible boolean not null default true,
  display_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  constraint business_public_media_asset_fk foreign key (business_id, asset_id)
    references public.file_assets(business_id, id) on delete cascade,
  constraint business_public_media_service_fk foreign key (business_id, service_id)
    references public.services(business_id, id) on delete set null (service_id)
);
create index business_public_media_page_idx on public.business_public_media(business_id, media_kind, public_visible, display_order);
create trigger business_public_media_set_updated_at before update on public.business_public_media
for each row execute function public.set_updated_at();

create table public.recurrence_series (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_id uuid not null,
  professional_id uuid not null,
  service_ids uuid[] not null default '{}'::uuid[],
  frequency public.recurrence_frequency not null default 'weekly',
  interval_weeks smallint not null default 1 check (interval_weeks between 1 and 52),
  weekdays smallint[] not null default '{}'::smallint[],
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.recurrence_status not null default 'active',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  constraint recurrence_series_client_fk foreign key (business_id, client_id)
    references public.clients(business_id, id) on delete restrict,
  constraint recurrence_series_professional_fk foreign key (business_id, professional_id)
    references public.professionals(business_id, id) on delete restrict,
  constraint recurrence_series_time_order_check check (ends_at > starts_at),
  constraint recurrence_series_weekdays_check check (
    weekdays <@ array[0,1,2,3,4,5,6]::smallint[]
  )
);
create index recurrence_series_generation_idx on public.recurrence_series(business_id, status, starts_at, ends_at);
create trigger recurrence_series_set_updated_at before update on public.recurrence_series
for each row execute function public.set_updated_at();

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_id uuid,
  professional_id uuid not null,
  service_id uuid not null,
  recurrence_series_id uuid,
  recurrence_sequence_number integer,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.appointment_status not null default 'scheduled',
  source public.appointment_source not null default 'admin',
  guest_name text,
  guest_phone text,
  service_name_snapshot text not null,
  professional_name_snapshot text not null,
  duration_minutes_snapshot smallint not null check (duration_minutes_snapshot between 5 and 720),
  buffer_after_minutes_snapshot smallint not null default 0 check (buffer_after_minutes_snapshot between 0 and 180),
  base_price numeric(12,2) not null check (base_price >= 0),
  deposit_percent numeric(5,2) not null default 0 check (deposit_percent between 0 and 100),
  deposit_amount numeric(12,2) not null default 0 check (deposit_amount >= 0 and deposit_amount <= base_price),
  deposit_status public.deposit_status not null default 'waived',
  payment_method public.payment_method,
  card_fee numeric(12,2) not null default 0 check (card_fee >= 0),
  commission_percent_snapshot numeric(5,2) not null default 0 check (commission_percent_snapshot between 0 and 100),
  commission_amount numeric(12,2) not null default 0 check (commission_amount >= 0),
  net_amount numeric(12,2) not null default 0 check (net_amount >= 0),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  confirmed_at timestamptz,
  arrived_at timestamptz,
  actual_started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  missed_at timestamptz,
  rescheduled_at timestamptz,
  is_fit_in boolean not null default false,
  fit_in_conflict_appointment_id uuid,
  fit_in_reason text,
  recurrence_paused boolean not null default false,
  unique (business_id, id),
  constraint appointments_client_fk foreign key (business_id, client_id)
    references public.clients(business_id, id) on delete set null (client_id),
  constraint appointments_professional_fk foreign key (business_id, professional_id)
    references public.professionals(business_id, id) on delete restrict,
  constraint appointments_service_fk foreign key (business_id, service_id)
    references public.services(business_id, id) on delete restrict,
  constraint appointments_recurrence_fk foreign key (business_id, recurrence_series_id)
    references public.recurrence_series(business_id, id) on delete set null (recurrence_series_id),
  constraint appointments_fit_in_conflict_fk foreign key (business_id, fit_in_conflict_appointment_id)
    references public.appointments(business_id, id) on delete set null (fit_in_conflict_appointment_id),
  constraint appointments_time_order_check check (ends_at > starts_at),
  constraint appointments_guest_or_client_check check (client_id is not null or char_length(trim(coalesce(guest_name,''))) >= 2),
  constraint appointments_commission_limit_check check (commission_amount <= base_price + card_fee)
);

alter table public.appointments add constraint appointments_no_professional_overlap
exclude using gist (
  business_id with =,
  professional_id with =,
  tstzrange(starts_at, ends_at + make_interval(mins => buffer_after_minutes_snapshot), '[)') with &&
)
where (
  status in ('scheduled','confirmed','arrived','in_service')
  and not is_fit_in
  and not recurrence_paused
);
create index appointments_business_start_idx on public.appointments(business_id, starts_at);
create index appointments_professional_start_idx on public.appointments(business_id, professional_id, starts_at);
create index appointments_client_history_idx on public.appointments(business_id, client_id, starts_at desc) where client_id is not null;
create index appointments_upcoming_idx on public.appointments(business_id, starts_at)
  where status in ('scheduled','confirmed','arrived','in_service') and not recurrence_paused;
create index appointments_status_idx on public.appointments(business_id, status, starts_at desc);
create trigger appointments_set_updated_at before update on public.appointments
for each row execute function public.set_updated_at();

create table public.appointment_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  appointment_id uuid not null,
  event_type public.appointment_event_type not null,
  notes text,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_name text,
  created_at timestamptz not null default now(),
  unique (business_id, id),
  constraint appointment_events_appointment_fk foreign key (business_id, appointment_id)
    references public.appointments(business_id, id) on delete cascade
);
create index appointment_events_timeline_idx on public.appointment_events(business_id, appointment_id, created_at);

create table public.schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  professional_id uuid,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  block_type public.schedule_block_type not null default 'other',
  reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  constraint schedule_blocks_professional_fk foreign key (business_id, professional_id)
    references public.professionals(business_id, id) on delete cascade,
  constraint schedule_blocks_time_order_check check (ends_at > starts_at)
);
create index schedule_blocks_lookup_idx on public.schedule_blocks(business_id, professional_id, starts_at, ends_at);
create trigger schedule_blocks_set_updated_at before update on public.schedule_blocks
for each row execute function public.set_updated_at();

create table public.waiting_list_entries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_id uuid not null,
  service_id uuid not null,
  professional_id uuid,
  desired_from timestamptz not null,
  desired_to timestamptz not null,
  notes text,
  status public.waitlist_status not null default 'waiting',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  constraint waiting_list_client_fk foreign key (business_id, client_id)
    references public.clients(business_id, id) on delete cascade,
  constraint waiting_list_service_fk foreign key (business_id, service_id)
    references public.services(business_id, id) on delete cascade,
  constraint waiting_list_professional_fk foreign key (business_id, professional_id)
    references public.professionals(business_id, id) on delete set null (professional_id),
  constraint waiting_list_window_check check (desired_to > desired_from)
);
create index waiting_list_lookup_idx on public.waiting_list_entries(business_id, status, desired_from, desired_to);
create trigger waiting_list_entries_set_updated_at before update on public.waiting_list_entries
for each row execute function public.set_updated_at();

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  description text not null check (char_length(trim(description)) between 2 and 200),
  category text not null,
  amount numeric(12,2) not null check (amount >= 0),
  expense_date date not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id)
);
create index expenses_business_date_idx on public.expenses(business_id, expense_date desc);
create trigger expenses_set_updated_at before update on public.expenses
for each row execute function public.set_updated_at();

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_name text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  unique (business_id, id)
);
create index audit_logs_business_created_idx on public.audit_logs(business_id, created_at desc);
create index audit_logs_entity_idx on public.audit_logs(business_id, entity_type, entity_id, created_at desc);

create table public.retroactive_service_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_id uuid not null,
  service_id uuid not null,
  professional_id uuid not null,
  starts_at timestamptz not null,
  price numeric(12,2) not null check (price >= 0),
  payment_method public.payment_method not null,
  notes text,
  reason text not null check (char_length(trim(reason)) >= 5),
  proof_type public.retroactive_proof_type not null,
  proof_reference text not null,
  proof_description text not null,
  evidence_confirmed boolean not null default false,
  status public.retroactive_request_status not null default 'pending',
  requested_by uuid not null references auth.users(id) on delete restrict,
  requested_by_name text not null,
  requested_by_role public.member_role not null,
  requested_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_by_name text,
  reviewed_at timestamptz,
  review_note text,
  created_appointment_id uuid,
  conflict_appointment_id uuid,
  conflict_confirmed boolean not null default false,
  conflict_justification text,
  unique (business_id, id),
  constraint retroactive_client_fk foreign key (business_id, client_id)
    references public.clients(business_id, id) on delete restrict,
  constraint retroactive_service_fk foreign key (business_id, service_id)
    references public.services(business_id, id) on delete restrict,
  constraint retroactive_professional_fk foreign key (business_id, professional_id)
    references public.professionals(business_id, id) on delete restrict,
  constraint retroactive_created_appointment_fk foreign key (business_id, created_appointment_id)
    references public.appointments(business_id, id) on delete set null (created_appointment_id),
  constraint retroactive_conflict_appointment_fk foreign key (business_id, conflict_appointment_id)
    references public.appointments(business_id, id) on delete set null (conflict_appointment_id),
  constraint retroactive_conflict_confirmation_check check (
    conflict_appointment_id is null or not conflict_confirmed or char_length(trim(coalesce(conflict_justification,''))) >= 5
  )
);
create index retroactive_requests_status_idx on public.retroactive_service_requests(business_id, status, requested_at desc);

-- RLS helpers. They never trust user-editable metadata; membership is database-backed.
create or replace function app_private.is_business_member(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
set row_security = off
as $$
  select exists (
    select 1 from public.business_members bm
    where bm.business_id = p_business_id
      and bm.user_id = auth.uid()
      and bm.active = true
  );
$$;

create or replace function app_private.has_business_role(p_business_id uuid, p_roles public.member_role[])
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
set row_security = off
as $$
  select exists (
    select 1 from public.business_members bm
    where bm.business_id = p_business_id
      and bm.user_id = auth.uid()
      and bm.active = true
      and bm.role = any(p_roles)
  );
$$;

create or replace function app_private.is_own_professional(p_business_id uuid, p_professional_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
set row_security = off
as $$
  select exists (
    select 1
    from public.professionals p
    join public.business_members bm
      on bm.business_id = p.business_id and bm.id = p.member_id
    where p.business_id = p_business_id
      and p.id = p_professional_id
      and p.active = true
      and bm.active = true
      and bm.user_id = auth.uid()
  );
$$;

revoke all on all functions in schema app_private from public, anon;
grant usage on schema app_private to authenticated;
grant execute on function app_private.is_business_member(uuid) to authenticated;
grant execute on function app_private.has_business_role(uuid, public.member_role[]) to authenticated;
grant execute on function app_private.is_own_professional(uuid, uuid) to authenticated;

-- Enable and force RLS for all application-owned tables.
do $$
declare t text;
begin
  foreach t in array array[
    'user_profiles','businesses','business_members','business_settings','business_modules','business_rules',
    'business_hours','business_payment_methods','file_assets','clients','professionals','services',
    'professional_services','professional_hours','business_public_profiles','business_public_media',
    'recurrence_series','appointments','appointment_events','schedule_blocks','waiting_list_entries',
    'expenses','audit_logs','retroactive_service_requests'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
  end loop;
end $$;

create policy user_profiles_own_select on public.user_profiles for select to authenticated
using (user_id = auth.uid());
create policy user_profiles_own_insert on public.user_profiles for insert to authenticated
with check (user_id = auth.uid());
create policy user_profiles_own_update on public.user_profiles for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy businesses_insert_self on public.businesses for insert to authenticated
with check (created_by = auth.uid());
create policy businesses_select_member on public.businesses for select to authenticated
using (created_by = auth.uid() or app_private.is_business_member(id));
create policy businesses_update_manager on public.businesses for update to authenticated
using (app_private.has_business_role(id, array['owner','manager']::public.member_role[]))
with check (app_private.has_business_role(id, array['owner','manager']::public.member_role[]));

create policy business_members_select_member on public.business_members for select to authenticated
using (app_private.is_business_member(business_id));
create policy business_members_bootstrap_owner on public.business_members for insert to authenticated
with check (
  user_id = auth.uid() and role = 'owner' and exists (
    select 1 from public.businesses b where b.id = business_id and b.created_by = auth.uid()
  )
);
create policy business_members_owner_manage on public.business_members for all to authenticated
using (app_private.has_business_role(business_id, array['owner']::public.member_role[]))
with check (app_private.has_business_role(business_id, array['owner']::public.member_role[]));

-- Configuration/catalog: members may read; owner/manager may write.
do $$
declare t text;
begin
  foreach t in array array[
    'business_settings','business_modules','business_rules','business_hours','business_payment_methods',
    'professionals','services','professional_services','professional_hours','business_public_profiles',
    'business_public_media'
  ] loop
    execute format('create policy %I on public.%I for select to authenticated using (app_private.is_business_member(business_id))', t || '_member_read', t);
    execute format('create policy %I on public.%I for all to authenticated using (app_private.has_business_role(business_id, array[''owner'',''manager'']::public.member_role[])) with check (app_private.has_business_role(business_id, array[''owner'',''manager'']::public.member_role[]))', t || '_manager_write', t);
  end loop;
end $$;

create policy file_assets_member_read on public.file_assets for select to authenticated
using (app_private.is_business_member(business_id));
create policy file_assets_staff_insert on public.file_assets for insert to authenticated
with check (app_private.has_business_role(business_id, array['owner','manager','professional','receptionist']::public.member_role[]));
create policy file_assets_manager_delete on public.file_assets for delete to authenticated
using (app_private.has_business_role(business_id, array['owner','manager']::public.member_role[]));

-- Clients are operational data. Every active staff member may read; writes are limited to active staff.
create policy clients_member_read on public.clients for select to authenticated
using (app_private.is_business_member(business_id));
create policy clients_staff_insert on public.clients for insert to authenticated
with check (app_private.has_business_role(business_id, array['owner','manager','professional','receptionist']::public.member_role[]));
create policy clients_staff_update on public.clients for update to authenticated
using (app_private.has_business_role(business_id, array['owner','manager','professional','receptionist']::public.member_role[]))
with check (app_private.has_business_role(business_id, array['owner','manager','professional','receptionist']::public.member_role[]));
create policy clients_manager_delete on public.clients for delete to authenticated
using (app_private.has_business_role(business_id, array['owner','manager']::public.member_role[]));

create policy recurrence_member_read on public.recurrence_series for select to authenticated
using (app_private.is_business_member(business_id));
create policy recurrence_staff_write on public.recurrence_series for all to authenticated
using (app_private.has_business_role(business_id, array['owner','manager','professional','receptionist']::public.member_role[]))
with check (app_private.has_business_role(business_id, array['owner','manager','professional','receptionist']::public.member_role[]));

create policy appointments_read on public.appointments for select to authenticated
using (
  app_private.has_business_role(business_id, array['owner','manager','receptionist']::public.member_role[])
  or app_private.is_own_professional(business_id, professional_id)
);
create policy appointments_insert on public.appointments for insert to authenticated
with check (app_private.has_business_role(business_id, array['owner','manager','professional','receptionist']::public.member_role[]));
create policy appointments_update on public.appointments for update to authenticated
using (
  app_private.has_business_role(business_id, array['owner','manager','receptionist']::public.member_role[])
  or app_private.is_own_professional(business_id, professional_id)
)
with check (
  app_private.has_business_role(business_id, array['owner','manager','receptionist']::public.member_role[])
  or app_private.is_own_professional(business_id, professional_id)
);
create policy appointments_manager_delete on public.appointments for delete to authenticated
using (app_private.has_business_role(business_id, array['owner','manager']::public.member_role[]));

create policy appointment_events_read on public.appointment_events for select to authenticated
using (
  exists (
    select 1 from public.appointments a
    where a.business_id = appointment_events.business_id
      and a.id = appointment_events.appointment_id
      and (
        app_private.has_business_role(a.business_id, array['owner','manager','receptionist']::public.member_role[])
        or app_private.is_own_professional(a.business_id, a.professional_id)
      )
  )
);
create policy appointment_events_append on public.appointment_events for insert to authenticated
with check (
  exists (
    select 1 from public.appointments a
    where a.business_id = appointment_events.business_id
      and a.id = appointment_events.appointment_id
      and (
        app_private.has_business_role(a.business_id, array['owner','manager','receptionist']::public.member_role[])
        or app_private.is_own_professional(a.business_id, a.professional_id)
      )
  )
);

-- Blocks and waitlist are operational; all active staff can use them.
do $$
declare t text;
begin
  foreach t in array array['schedule_blocks','waiting_list_entries'] loop
    execute format('create policy %I on public.%I for select to authenticated using (app_private.is_business_member(business_id))', t || '_member_read', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (app_private.has_business_role(business_id, array[''owner'',''manager'',''professional'',''receptionist'']::public.member_role[]))', t || '_staff_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (app_private.has_business_role(business_id, array[''owner'',''manager'',''professional'',''receptionist'']::public.member_role[])) with check (app_private.has_business_role(business_id, array[''owner'',''manager'',''professional'',''receptionist'']::public.member_role[]))', t || '_staff_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (app_private.has_business_role(business_id, array[''owner'',''manager'']::public.member_role[]))', t || '_manager_delete', t);
  end loop;
end $$;

-- Finance is not exposed to ordinary professionals/receptionists.
create policy expenses_manager_read on public.expenses for select to authenticated
using (app_private.has_business_role(business_id, array['owner','manager']::public.member_role[]));
create policy expenses_manager_insert on public.expenses for insert to authenticated
with check (app_private.has_business_role(business_id, array['owner','manager']::public.member_role[]));
create policy expenses_manager_update on public.expenses for update to authenticated
using (app_private.has_business_role(business_id, array['owner','manager']::public.member_role[]))
with check (app_private.has_business_role(business_id, array['owner','manager']::public.member_role[]));
create policy expenses_manager_delete on public.expenses for delete to authenticated
using (app_private.has_business_role(business_id, array['owner','manager']::public.member_role[]));

-- Audit is append-only to the application. Authenticated users can only read if manager/owner.
create policy audit_logs_manager_read on public.audit_logs for select to authenticated
using (app_private.has_business_role(business_id, array['owner','manager']::public.member_role[]));

create policy retroactive_member_read on public.retroactive_service_requests for select to authenticated
using (app_private.is_business_member(business_id));
create policy retroactive_staff_insert on public.retroactive_service_requests for insert to authenticated
with check (app_private.has_business_role(business_id, array['owner','manager','professional','receptionist']::public.member_role[]));
create policy retroactive_manager_update on public.retroactive_service_requests for update to authenticated
using (app_private.has_business_role(business_id, array['owner','manager']::public.member_role[]))
with check (app_private.has_business_role(business_id, array['owner','manager']::public.member_role[]));
create policy retroactive_manager_delete on public.retroactive_service_requests for delete to authenticated
using (app_private.has_business_role(business_id, array['owner','manager']::public.member_role[]));

-- Direct anonymous table access is deliberately disabled. Public booking/page data goes through the API.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Availability RPC: returns only a boolean and cannot reveal another business' row contents.
create or replace function public.is_time_slot_available(
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
  v_timezone text;
  v_local_start timestamp;
  v_local_end timestamp;
  v_weekday smallint;
  v_date date;
begin
  if not app_private.is_business_member(p_business_id) then
    return false;
  end if;
  if p_ends_at <= p_starts_at then
    return false;
  end if;
  if not exists (
    select 1 from public.professionals p
    where p.business_id = p_business_id and p.id = p_professional_id and p.active and p.serves_clients
  ) then
    return false;
  end if;
  select timezone into v_timezone from public.businesses
    where id = p_business_id and status = 'active';
  if v_timezone is null then return false; end if;
  v_local_start := p_starts_at at time zone v_timezone;
  v_local_end := p_ends_at at time zone v_timezone;
  if v_local_start::date <> v_local_end::date then return false; end if;
  v_weekday := extract(dow from v_local_start)::smallint;
  v_date := v_local_start::date;

  if not exists (
    select 1 from public.business_hours h
    where h.business_id = p_business_id
      and h.weekday = v_weekday
      and (h.valid_from is null or h.valid_from <= v_date)
      and (h.valid_until is null or h.valid_until >= v_date)
      and h.opens_at <= v_local_start::time
      and h.closes_at >= v_local_end::time
  ) then return false; end if;

  if exists (
    select 1 from public.professional_hours ph
    where ph.business_id = p_business_id
      and ph.professional_id = p_professional_id
      and ph.weekday = v_weekday
      and (ph.valid_from is null or ph.valid_from <= v_date)
      and (ph.valid_until is null or ph.valid_until >= v_date)
  ) and not exists (
    select 1 from public.professional_hours ph
    where ph.business_id = p_business_id
      and ph.professional_id = p_professional_id
      and ph.weekday = v_weekday
      and (ph.valid_from is null or ph.valid_from <= v_date)
      and (ph.valid_until is null or ph.valid_until >= v_date)
      and ph.starts_at <= v_local_start::time
      and ph.ends_at >= v_local_end::time
  ) then return false; end if;

  if exists (
    select 1 from public.appointments a
    where a.business_id = p_business_id
      and a.professional_id = p_professional_id
      and a.status in ('scheduled','confirmed','arrived','in_service')
      and not a.recurrence_paused
      and (p_exclude_appointment_id is null or a.id <> p_exclude_appointment_id)
      and tstzrange(a.starts_at, a.ends_at + make_interval(mins => a.buffer_after_minutes_snapshot), '[)')
          && tstzrange(p_starts_at, p_ends_at, '[)')
  ) then return false; end if;

  if exists (
    select 1 from public.schedule_blocks b
    where b.business_id = p_business_id
      and (b.professional_id is null or b.professional_id = p_professional_id)
      and tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')
  ) then return false; end if;

  return true;
end;
$$;
revoke all on function public.is_time_slot_available(uuid,uuid,timestamptz,timestamptz,uuid) from public, anon;
grant execute on function public.is_time_slot_available(uuid,uuid,timestamptz,timestamptz,uuid) to authenticated;

comment on schema app_private is 'Internal authorization helpers for CYRNEX FLOW. Not exposed to anon users.';
comment on table public.appointments is 'Canonical MVP appointment ledger. Active statuses are scheduled, confirmed, arrived and in_service.';
comment on constraint appointments_no_professional_overlap on public.appointments is
  'Database-level protection against double booking, including the service buffer snapshot.';
