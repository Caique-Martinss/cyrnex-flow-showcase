-- Scheduling, recurrence, waitlist, no-shows and booking history.

create type public.appointment_status as enum (
  'draft',
  'pending_deposit',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show'
);
create type public.booking_source as enum ('online', 'admin', 'walk_in', 'waitlist', 'recurrence');
create type public.deposit_status as enum ('not_required', 'pending', 'paid', 'waived', 'refunded');
create type public.adjustment_type as enum ('discount', 'courtesy', 'surcharge');
create type public.recurrence_frequency as enum ('weekly', 'monthly');
create type public.recurrence_status as enum ('active', 'paused', 'ended', 'cancelled');
create type public.schedule_block_type as enum ('break', 'closed', 'personal', 'maintenance', 'other');
create type public.waitlist_status as enum ('waiting', 'offered', 'booked', 'expired', 'cancelled');
create type public.waitlist_offer_status as enum ('pending', 'accepted', 'declined', 'expired', 'cancelled');
create type public.preferred_period as enum ('any', 'morning', 'afternoon', 'evening');

create table public.recurrence_series (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_id uuid not null,
  professional_id uuid not null,
  frequency public.recurrence_frequency not null default 'weekly',
  interval_count smallint not null default 1 check (interval_count between 1 and 52),
  weekday smallint check (weekday is null or weekday between 0 and 6),
  start_date date not null,
  start_time time not null,
  ends_on date,
  max_occurrences integer check (max_occurrences is null or max_occurrences > 0),
  status public.recurrence_status not null default 'active',
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  constraint recurrence_series_client_fk
    foreign key (business_id, client_id)
    references public.clients (business_id, id)
    on delete restrict,
  constraint recurrence_series_professional_fk
    foreign key (business_id, professional_id)
    references public.professionals (business_id, id)
    on delete restrict,
  constraint recurrence_series_date_order_check
    check (ends_on is null or ends_on >= start_date)
);

create index recurrence_series_generation_idx
  on public.recurrence_series (business_id, status, start_date, ends_on);

create trigger recurrence_series_set_updated_at
before update on public.recurrence_series
for each row execute function public.set_updated_at();

create table public.recurrence_pattern_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  recurrence_series_id uuid not null,
  sequence_position smallint not null check (sequence_position >= 1),
  service_id uuid not null,
  notes text,
  created_at timestamptz not null default now(),
  unique (business_id, recurrence_series_id, sequence_position),
  unique (business_id, id),
  constraint recurrence_pattern_series_fk
    foreign key (business_id, recurrence_series_id)
    references public.recurrence_series (business_id, id)
    on delete cascade,
  constraint recurrence_pattern_service_fk
    foreign key (business_id, service_id)
    references public.services (business_id, id)
    on delete restrict
);

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
  status public.appointment_status not null default 'confirmed',
  source public.booking_source not null default 'admin',
  guest_name text,
  guest_phone text,
  service_name_snapshot text not null,
  professional_name_snapshot text not null,
  base_price numeric(12,2) not null check (base_price >= 0),
  addons_total numeric(12,2) not null default 0 check (addons_total >= 0),
  discount_total numeric(12,2) not null default 0 check (discount_total >= 0),
  surcharge_total numeric(12,2) not null default 0 check (surcharge_total >= 0),
  final_price numeric(12,2) not null check (final_price >= 0),
  deposit_required numeric(12,2) not null default 0 check (deposit_required >= 0),
  deposit_status public.deposit_status not null default 'not_required',
  commission_percent_snapshot numeric(5,2) not null default 0
    check (commission_percent_snapshot between 0 and 100),
  commission_amount numeric(12,2) not null default 0 check (commission_amount >= 0),
  client_note text,
  internal_note text,
  created_by uuid references auth.users(id) on delete set null,
  cancelled_at timestamptz,
  cancellation_reason text,
  completed_at timestamptz,
  no_show_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  constraint appointments_client_fk
    foreign key (business_id, client_id)
    references public.clients (business_id, id)
    on delete set null (client_id),
  constraint appointments_professional_fk
    foreign key (business_id, professional_id)
    references public.professionals (business_id, id)
    on delete restrict,
  constraint appointments_service_fk
    foreign key (business_id, service_id)
    references public.services (business_id, id)
    on delete restrict,
  constraint appointments_recurrence_fk
    foreign key (business_id, recurrence_series_id)
    references public.recurrence_series (business_id, id)
    on delete set null (recurrence_series_id),
  constraint appointments_time_order_check check (ends_at > starts_at),
  constraint appointments_guest_or_client_check
    check (client_id is not null or char_length(trim(coalesce(guest_name, ''))) >= 2),
  constraint appointments_discount_not_excessive_check
    check (discount_total <= base_price + addons_total + surcharge_total),
  constraint appointments_final_price_check
    check (final_price = base_price + addons_total + surcharge_total - discount_total),
  constraint appointments_deposit_limit_check check (deposit_required <= final_price),
  constraint appointments_commission_limit_check check (commission_amount <= final_price)
);

alter table public.appointments
add constraint appointments_no_professional_overlap
exclude using gist (
  business_id with =,
  professional_id with =,
  tstzrange(starts_at, ends_at, '[)') with &&
)
where (status in ('pending_deposit', 'confirmed', 'in_progress'));

create index appointments_business_start_idx
  on public.appointments (business_id, starts_at);
create index appointments_professional_start_idx
  on public.appointments (business_id, professional_id, starts_at);
create index appointments_client_history_idx
  on public.appointments (business_id, client_id, starts_at desc)
  where client_id is not null;
create index appointments_upcoming_idx
  on public.appointments (business_id, starts_at)
  where status in ('pending_deposit', 'confirmed');
create index appointments_status_idx on public.appointments (business_id, status, starts_at desc);

create trigger appointments_set_updated_at
before update on public.appointments
for each row execute function public.set_updated_at();

create table public.appointment_addons (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  appointment_id uuid not null,
  addon_id uuid,
  addon_name_snapshot text not null,
  unit_price_snapshot numeric(12,2) not null check (unit_price_snapshot >= 0),
  duration_minutes_snapshot smallint not null default 0 check (duration_minutes_snapshot >= 0),
  quantity smallint not null default 1 check (quantity between 1 and 100),
  created_at timestamptz not null default now(),
  unique (business_id, id),
  constraint appointment_addons_appointment_fk
    foreign key (business_id, appointment_id)
    references public.appointments (business_id, id)
    on delete cascade,
  constraint appointment_addons_addon_fk
    foreign key (business_id, addon_id)
    references public.service_addons (business_id, id)
    on delete set null (addon_id)
);

create index appointment_addons_appointment_idx
  on public.appointment_addons (business_id, appointment_id);

create table public.appointment_adjustments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  appointment_id uuid not null,
  adjustment_type public.adjustment_type not null,
  reason_code text not null,
  amount numeric(12,2) not null check (amount >= 0),
  percent numeric(5,2) check (percent is null or percent between 0 and 100),
  notes text,
  authorized_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (business_id, id),
  constraint appointment_adjustments_appointment_fk
    foreign key (business_id, appointment_id)
    references public.appointments (business_id, id)
    on delete cascade
);

create index appointment_adjustments_appointment_idx
  on public.appointment_adjustments (business_id, appointment_id);

create table public.schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  professional_id uuid,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  block_type public.schedule_block_type not null default 'other',
  reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  constraint schedule_blocks_professional_fk
    foreign key (business_id, professional_id)
    references public.professionals (business_id, id)
    on delete cascade,
  constraint schedule_blocks_time_order_check check (ends_at > starts_at)
);

create index schedule_blocks_lookup_idx
  on public.schedule_blocks (business_id, professional_id, starts_at, ends_at);

create trigger schedule_blocks_set_updated_at
before update on public.schedule_blocks
for each row execute function public.set_updated_at();

create table public.waiting_list_entries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_id uuid not null,
  service_id uuid not null,
  preferred_professional_id uuid,
  desired_from timestamptz not null,
  desired_to timestamptz not null,
  preferred_period public.preferred_period not null default 'any',
  status public.waitlist_status not null default 'waiting',
  auto_offer_enabled boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  constraint waiting_list_client_fk
    foreign key (business_id, client_id)
    references public.clients (business_id, id)
    on delete cascade,
  constraint waiting_list_service_fk
    foreign key (business_id, service_id)
    references public.services (business_id, id)
    on delete restrict,
  constraint waiting_list_professional_fk
    foreign key (business_id, preferred_professional_id)
    references public.professionals (business_id, id)
    on delete set null (preferred_professional_id),
  constraint waiting_list_window_check check (desired_to > desired_from)
);

create index waiting_list_match_idx
  on public.waiting_list_entries
  (business_id, status, service_id, preferred_professional_id, desired_from, desired_to);

create trigger waiting_list_entries_set_updated_at
before update on public.waiting_list_entries
for each row execute function public.set_updated_at();

create table public.waiting_list_offers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  waiting_list_entry_id uuid not null,
  professional_id uuid not null,
  slot_starts_at timestamptz not null,
  slot_ends_at timestamptz not null,
  status public.waitlist_offer_status not null default 'pending',
  offered_at timestamptz not null default now(),
  expires_at timestamptz not null,
  responded_at timestamptz,
  created_appointment_id uuid,
  created_at timestamptz not null default now(),
  unique (business_id, id),
  constraint waiting_list_offers_entry_fk
    foreign key (business_id, waiting_list_entry_id)
    references public.waiting_list_entries (business_id, id)
    on delete cascade,
  constraint waiting_list_offers_professional_fk
    foreign key (business_id, professional_id)
    references public.professionals (business_id, id)
    on delete restrict,
  constraint waiting_list_offers_appointment_fk
    foreign key (business_id, created_appointment_id)
    references public.appointments (business_id, id)
    on delete set null (created_appointment_id),
  constraint waiting_list_offers_window_check check (slot_ends_at > slot_starts_at),
  constraint waiting_list_offers_expiry_check check (expires_at > offered_at)
);

create index waiting_list_offers_pending_idx
  on public.waiting_list_offers (business_id, status, expires_at)
  where status = 'pending';
