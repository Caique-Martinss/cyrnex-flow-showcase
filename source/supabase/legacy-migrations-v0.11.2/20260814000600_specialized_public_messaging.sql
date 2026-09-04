-- Quotes, hair prosthesis, public page, media and messaging.

create type public.quote_status as enum ('draft', 'sent', 'approved', 'rejected', 'expired', 'cancelled');
create type public.quote_item_type as enum ('service', 'product', 'custom');
create type public.prosthesis_case_status as enum (
  'evaluation',
  'quote_pending',
  'approved',
  'applied',
  'maintenance',
  'inactive'
);
create type public.public_highlight_type as enum ('statistic', 'achievement', 'notable_client', 'other');
create type public.media_mention_type as enum ('tv', 'youtube', 'instagram', 'tiktok', 'podcast', 'article', 'other');
create type public.message_channel as enum ('whatsapp', 'email', 'sms', 'in_app');
create type public.notification_status as enum ('queued', 'sent', 'failed', 'cancelled');

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_id uuid not null,
  status public.quote_status not null default 'draft',
  valid_until date,
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  discount_total numeric(12,2) not null default 0 check (discount_total >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  constraint quotes_client_fk
    foreign key (business_id, client_id)
    references public.clients (business_id, id)
    on delete restrict,
  constraint quotes_total_check check (total = subtotal - discount_total)
);

create index quotes_client_idx on public.quotes (business_id, client_id, created_at desc);
create index quotes_status_idx on public.quotes (business_id, status, created_at desc);

create trigger quotes_set_updated_at
before update on public.quotes
for each row execute function public.set_updated_at();

create table public.quote_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  quote_id uuid not null,
  item_type public.quote_item_type not null,
  service_id uuid,
  product_id uuid,
  description text not null,
  quantity integer not null default 1 check (quantity between 1 and 10000),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  line_total numeric(12,2) generated always as (quantity * unit_price) stored,
  created_at timestamptz not null default now(),
  unique (business_id, id),
  constraint quote_items_quote_fk
    foreign key (business_id, quote_id)
    references public.quotes (business_id, id)
    on delete cascade,
  constraint quote_items_service_fk
    foreign key (business_id, service_id)
    references public.services (business_id, id)
    on delete set null (service_id),
  constraint quote_items_product_fk
    foreign key (business_id, product_id)
    references public.products (business_id, id)
    on delete set null (product_id),
  constraint quote_items_reference_check
    check (
      (item_type = 'service' and service_id is not null and product_id is null)
      or (item_type = 'product' and product_id is not null and service_id is null)
      or (item_type = 'custom' and service_id is null and product_id is null)
    )
);

create index quote_items_quote_idx on public.quote_items (business_id, quote_id);

create table public.prosthesis_cases (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_id uuid not null,
  professional_id uuid,
  quote_id uuid,
  status public.prosthesis_case_status not null default 'evaluation',
  model_reference text,
  color_tone text,
  base_type text,
  density text,
  measurements jsonb not null default '{}'::jsonb check (jsonb_typeof(measurements) = 'object'),
  applied_on date,
  next_recommended_maintenance_on date,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  constraint prosthesis_cases_client_fk
    foreign key (business_id, client_id)
    references public.clients (business_id, id)
    on delete restrict,
  constraint prosthesis_cases_professional_fk
    foreign key (business_id, professional_id)
    references public.professionals (business_id, id)
    on delete set null (professional_id),
  constraint prosthesis_cases_quote_fk
    foreign key (business_id, quote_id)
    references public.quotes (business_id, id)
    on delete set null (quote_id)
);

create index prosthesis_cases_client_idx
  on public.prosthesis_cases (business_id, client_id, status, created_at desc);
create index prosthesis_cases_maintenance_due_idx
  on public.prosthesis_cases (business_id, next_recommended_maintenance_on)
  where status in ('applied', 'maintenance');

create trigger prosthesis_cases_set_updated_at
before update on public.prosthesis_cases
for each row execute function public.set_updated_at();

create table public.prosthesis_maintenance (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  prosthesis_case_id uuid not null,
  appointment_id uuid,
  performed_on date not null,
  next_recommended_on date,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (business_id, id),
  constraint prosthesis_maintenance_case_fk
    foreign key (business_id, prosthesis_case_id)
    references public.prosthesis_cases (business_id, id)
    on delete cascade,
  constraint prosthesis_maintenance_appointment_fk
    foreign key (business_id, appointment_id)
    references public.appointments (business_id, id)
    on delete set null (appointment_id),
  constraint prosthesis_maintenance_date_check
    check (next_recommended_on is null or next_recommended_on >= performed_on)
);

create index prosthesis_maintenance_case_idx
  on public.prosthesis_maintenance (business_id, prosthesis_case_id, performed_on desc);

create table public.business_public_profiles (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  headline text,
  about_text text,
  founded_year smallint check (founded_year is null or founded_year between 1900 and 2200),
  address_line text,
  city text,
  state text,
  postal_code text,
  map_url text,
  instagram_url text,
  whatsapp_public text,
  website_url text,
  public_page_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger business_public_profiles_set_updated_at
before update on public.business_public_profiles
for each row execute function public.set_updated_at();

create table public.public_highlights (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  highlight_type public.public_highlight_type not null,
  title text not null,
  subtitle text,
  image_asset_id uuid,
  external_url text,
  active boolean not null default true,
  display_order smallint not null default 0,
  consent_recorded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  constraint public_highlights_image_fk
    foreign key (business_id, image_asset_id)
    references public.file_assets (business_id, id)
    on delete set null (image_asset_id),
  constraint public_highlights_notable_consent_check
    check (highlight_type <> 'notable_client' or consent_recorded_at is not null)
);

create index public_highlights_page_idx
  on public.public_highlights (business_id, active, display_order);

create trigger public_highlights_set_updated_at
before update on public.public_highlights
for each row execute function public.set_updated_at();

create table public.media_mentions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  mention_type public.media_mention_type not null,
  outlet_name text not null,
  title text not null,
  published_on date,
  external_url text not null,
  thumbnail_asset_id uuid,
  active boolean not null default true,
  display_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  constraint media_mentions_thumbnail_fk
    foreign key (business_id, thumbnail_asset_id)
    references public.file_assets (business_id, id)
    on delete set null (thumbnail_asset_id)
);

create index media_mentions_page_idx
  on public.media_mentions (business_id, active, display_order, published_on desc);

create trigger media_mentions_set_updated_at
before update on public.media_mentions
for each row execute function public.set_updated_at();

create table public.message_templates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  channel public.message_channel not null,
  template_key text not null,
  content text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, channel, template_key),
  unique (business_id, id)
);

create trigger message_templates_set_updated_at
before update on public.message_templates
for each row execute function public.set_updated_at();

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_id uuid,
  appointment_id uuid,
  waiting_list_offer_id uuid,
  channel public.message_channel not null,
  purpose text not null,
  content_snapshot text not null,
  status public.notification_status not null default 'queued',
  scheduled_for timestamptz,
  sent_at timestamptz,
  provider_message_id text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  constraint notifications_client_fk
    foreign key (business_id, client_id)
    references public.clients (business_id, id)
    on delete set null (client_id),
  constraint notifications_appointment_fk
    foreign key (business_id, appointment_id)
    references public.appointments (business_id, id)
    on delete set null (appointment_id),
  constraint notifications_waitlist_offer_fk
    foreign key (business_id, waiting_list_offer_id)
    references public.waiting_list_offers (business_id, id)
    on delete set null (waiting_list_offer_id)
);

create index notifications_queue_idx
  on public.notifications (business_id, status, scheduled_for)
  where status = 'queued';

create trigger notifications_set_updated_at
before update on public.notifications
for each row execute function public.set_updated_at();

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_table text not null,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  unique (business_id, id)
);

create index audit_logs_lookup_idx
  on public.audit_logs (business_id, entity_table, entity_id, created_at desc);
create index audit_logs_actor_idx
  on public.audit_logs (business_id, actor_user_id, created_at desc)
  where actor_user_id is not null;
