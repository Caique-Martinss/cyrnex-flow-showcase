-- Additional foundations needed by the product roadmap before UI implementation.

create type public.commission_type as enum ('percent', 'fixed');
create type public.appointment_event_type as enum (
  'created',
  'rescheduled',
  'cancelled',
  'completed',
  'no_show',
  'deposit_paid',
  'waitlist_moved',
  'note_added',
  'other'
);
create type public.inventory_reservation_status as enum (
  'active',
  'converted',
  'released',
  'expired'
);

alter table public.services
add column recommended_return_days smallint
  check (recommended_return_days is null or recommended_return_days between 1 and 3650);

alter table public.appointments
add column hold_expires_at timestamptz;

create index appointments_pending_hold_idx
  on public.appointments (business_id, hold_expires_at)
  where status = 'pending_deposit' and hold_expires_at is not null;

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
  constraint professional_hours_professional_fk
    foreign key (business_id, professional_id)
    references public.professionals (business_id, id)
    on delete cascade,
  constraint professional_hours_time_order_check check (ends_at > starts_at),
  constraint professional_hours_date_order_check
    check (valid_until is null or valid_from is null or valid_until >= valid_from)
);

create unique index professional_hours_unique_interval_idx
  on public.professional_hours (
    business_id,
    professional_id,
    weekday,
    starts_at,
    ends_at,
    coalesce(valid_from, '0001-01-01'::date)
  );
create index professional_hours_lookup_idx
  on public.professional_hours
  (business_id, professional_id, weekday, valid_from, valid_until);

create trigger professional_hours_set_updated_at
before update on public.professional_hours
for each row execute function public.set_updated_at();

create table public.commission_rules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  professional_id uuid not null,
  service_id uuid,
  commission_type public.commission_type not null default 'percent',
  commission_value numeric(12,2) not null check (commission_value >= 0),
  active boolean not null default true,
  priority smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  constraint commission_rules_professional_fk
    foreign key (business_id, professional_id)
    references public.professionals (business_id, id)
    on delete cascade,
  constraint commission_rules_service_fk
    foreign key (business_id, service_id)
    references public.services (business_id, id)
    on delete cascade,
  constraint commission_rules_value_check
    check (commission_type <> 'percent' or commission_value <= 100)
);

create unique index commission_rules_scope_unique_idx
  on public.commission_rules (
    business_id,
    professional_id,
    coalesce(service_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where active = true;
create index commission_rules_lookup_idx
  on public.commission_rules (business_id, professional_id, service_id, priority desc)
  where active = true;

create trigger commission_rules_set_updated_at
before update on public.commission_rules
for each row execute function public.set_updated_at();

create table public.appointment_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  appointment_id uuid not null,
  event_type public.appointment_event_type not null,
  previous_starts_at timestamptz,
  new_starts_at timestamptz,
  previous_ends_at timestamptz,
  new_ends_at timestamptz,
  notes text,
  actor_user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  unique (business_id, id),
  constraint appointment_events_appointment_fk
    foreign key (business_id, appointment_id)
    references public.appointments (business_id, id)
    on delete cascade
);

create index appointment_events_history_idx
  on public.appointment_events (business_id, appointment_id, created_at desc);

create table public.booking_access_tokens (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  appointment_id uuid not null,
  token_hash text not null check (char_length(token_hash) >= 32),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (token_hash),
  unique (business_id, id),
  constraint booking_access_tokens_appointment_fk
    foreign key (business_id, appointment_id)
    references public.appointments (business_id, id)
    on delete cascade,
  constraint booking_access_tokens_expiry_check check (expires_at > created_at)
);

create index booking_access_tokens_appointment_idx
  on public.booking_access_tokens (business_id, appointment_id, expires_at desc);

create table public.inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  product_id uuid not null,
  order_id uuid not null,
  quantity integer not null check (quantity > 0),
  status public.inventory_reservation_status not null default 'active',
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  constraint inventory_reservations_product_fk
    foreign key (business_id, product_id)
    references public.products (business_id, id)
    on delete restrict,
  constraint inventory_reservations_order_fk
    foreign key (business_id, order_id)
    references public.orders (business_id, id)
    on delete cascade,
  constraint inventory_reservations_expiry_check check (expires_at > created_at)
);

create index inventory_reservations_active_idx
  on public.inventory_reservations (business_id, product_id, expires_at)
  where status = 'active';

create trigger inventory_reservations_set_updated_at
before update on public.inventory_reservations
for each row execute function public.set_updated_at();

alter table public.business_public_profiles
add column logo_asset_id uuid,
add column cover_asset_id uuid,
add constraint business_public_profiles_logo_fk
  foreign key (business_id, logo_asset_id)
  references public.file_assets (business_id, id)
  on delete set null (logo_asset_id),
add constraint business_public_profiles_cover_fk
  foreign key (business_id, cover_asset_id)
  references public.file_assets (business_id, id)
  on delete set null (cover_asset_id);
