-- Clients, assets, services and professional catalog.

create type public.client_origin as enum ('online', 'manual', 'walk_in', 'imported');
create type public.client_status as enum ('active', 'blocked', 'archived');
create type public.client_media_type as enum ('reference', 'before', 'after', 'prosthesis', 'other');

create or replace function public.normalize_phone(value text)
returns text
language sql
immutable
strict
as $$
  select nullif(regexp_replace(value, '[^0-9]', '', 'g'), '');
$$;

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

create index file_assets_business_created_idx
  on public.file_assets (business_id, created_at desc);

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
  constraint clients_phone_format_check
    check (phone_normalized is null or phone_normalized ~ '^[0-9]{10,15}$'),
  constraint clients_email_format_check
    check (email is null or position('@' in email) > 1)
);

create unique index clients_business_phone_unique_idx
  on public.clients (business_id, phone_normalized)
  where phone_normalized is not null and status <> 'archived';
create index clients_business_name_idx on public.clients (business_id, lower(full_name));
create index clients_business_status_idx on public.clients (business_id, status);
create index clients_business_created_idx on public.clients (business_id, created_at desc);

create trigger clients_set_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

create table public.client_preferences (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  client_id uuid not null,
  preference_key text not null,
  preference_value text not null,
  is_private boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, client_id, preference_key),
  unique (business_id, id),
  constraint client_preferences_client_fk
    foreign key (business_id, client_id)
    references public.clients (business_id, id)
    on delete cascade
);

create index client_preferences_client_idx
  on public.client_preferences (business_id, client_id, active);

create trigger client_preferences_set_updated_at
before update on public.client_preferences
for each row execute function public.set_updated_at();

create table public.client_media (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  client_id uuid not null,
  asset_id uuid not null,
  media_type public.client_media_type not null default 'reference',
  caption text,
  visible_to_client boolean not null default false,
  authorized_for_public_use boolean not null default false,
  public_use_consent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (business_id, id),
  constraint client_media_client_fk
    foreign key (business_id, client_id)
    references public.clients (business_id, id)
    on delete cascade,
  constraint client_media_asset_fk
    foreign key (business_id, asset_id)
    references public.file_assets (business_id, id)
    on delete cascade,
  constraint client_media_public_consent_check
    check (not authorized_for_public_use or public_use_consent_at is not null)
);

create index client_media_client_idx
  on public.client_media (business_id, client_id, created_at desc);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  category text,
  name text not null check (char_length(trim(name)) between 2 and 120),
  description text,
  duration_minutes smallint not null check (duration_minutes between 5 and 720),
  buffer_after_minutes smallint not null default 0 check (buffer_after_minutes between 0 and 180),
  base_price numeric(12,2) not null check (base_price >= 0),
  deposit_percent_override numeric(5,2)
    check (deposit_percent_override is null or deposit_percent_override between 0 and 100),
  online_booking_enabled boolean not null default true,
  active boolean not null default true,
  display_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id)
);

create unique index services_business_name_unique_idx
  on public.services (business_id, lower(name))
  where active = true;
create index services_catalog_idx
  on public.services (business_id, active, online_booking_enabled, display_order);

create trigger services_set_updated_at
before update on public.services
for each row execute function public.set_updated_at();

create table public.service_addons (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 120),
  description text,
  price_delta numeric(12,2) not null default 0 check (price_delta >= 0),
  duration_delta_minutes smallint not null default 0
    check (duration_delta_minutes between 0 and 360),
  active boolean not null default true,
  display_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id)
);

create unique index service_addons_business_name_unique_idx
  on public.service_addons (business_id, lower(name))
  where active = true;

create trigger service_addons_set_updated_at
before update on public.service_addons
for each row execute function public.set_updated_at();

create table public.service_addon_links (
  business_id uuid not null,
  service_id uuid not null,
  addon_id uuid not null,
  enabled boolean not null default true,
  display_order smallint not null default 0,
  created_at timestamptz not null default now(),
  primary key (business_id, service_id, addon_id),
  constraint service_addon_links_service_fk
    foreign key (business_id, service_id)
    references public.services (business_id, id)
    on delete cascade,
  constraint service_addon_links_addon_fk
    foreign key (business_id, addon_id)
    references public.service_addons (business_id, id)
    on delete cascade
);

create table public.professional_services (
  business_id uuid not null,
  professional_id uuid not null,
  service_id uuid not null,
  custom_price numeric(12,2) check (custom_price is null or custom_price >= 0),
  custom_duration_minutes smallint
    check (custom_duration_minutes is null or custom_duration_minutes between 5 and 720),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_id, professional_id, service_id),
  constraint professional_services_professional_fk
    foreign key (business_id, professional_id)
    references public.professionals (business_id, id)
    on delete cascade,
  constraint professional_services_service_fk
    foreign key (business_id, service_id)
    references public.services (business_id, id)
    on delete cascade
);

create index professional_services_lookup_idx
  on public.professional_services (business_id, service_id, active);

create trigger professional_services_set_updated_at
before update on public.professional_services
for each row execute function public.set_updated_at();
