-- Product catalog, stock, orders and partner storefront.

create type public.inventory_movement_type as enum (
  'purchase',
  'sale',
  'return',
  'adjustment',
  'internal_use',
  'loss',
  'courtesy'
);
create type public.order_status as enum (
  'draft',
  'pending_payment',
  'paid',
  'ready',
  'collected',
  'cancelled',
  'refunded'
);
create type public.fulfillment_type as enum (
  'pickup_next_appointment',
  'scheduled_pickup',
  'walk_in_pickup'
);
create type public.order_payment_status as enum ('pending', 'partial', 'paid', 'refunded');

create table public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  sku text,
  name text not null check (char_length(trim(name)) between 2 and 160),
  brand text,
  description text,
  cost_price numeric(12,2) check (cost_price is null or cost_price >= 0),
  sale_price numeric(12,2) not null check (sale_price >= 0),
  track_stock boolean not null default true,
  low_stock_threshold integer not null default 0 check (low_stock_threshold >= 0),
  online_sale_enabled boolean not null default false,
  active boolean not null default true,
  primary_image_asset_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (business_id, id),
  constraint products_image_fk
    foreign key (business_id, primary_image_asset_id)
    references public.file_assets (business_id, id)
    on delete set null (primary_image_asset_id)
);

create unique index products_business_sku_unique_idx
  on public.products (business_id, lower(sku))
  where sku is not null and active = true;
create index products_catalog_idx
  on public.products (business_id, active, online_sale_enabled, lower(name));

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_id uuid,
  linked_appointment_id uuid,
  status public.order_status not null default 'draft',
  payment_status public.order_payment_status not null default 'pending',
  fulfillment_type public.fulfillment_type not null default 'walk_in_pickup',
  pickup_at timestamptz,
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  discount_total numeric(12,2) not null default 0 check (discount_total >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  collected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  constraint orders_client_fk
    foreign key (business_id, client_id)
    references public.clients (business_id, id)
    on delete set null (client_id),
  constraint orders_appointment_fk
    foreign key (business_id, linked_appointment_id)
    references public.appointments (business_id, id)
    on delete set null (linked_appointment_id),
  constraint orders_total_check check (total <= subtotal and total = subtotal - discount_total),
  constraint orders_pickup_check
    check (fulfillment_type <> 'scheduled_pickup' or pickup_at is not null)
);

create index orders_business_status_idx
  on public.orders (business_id, status, created_at desc);
create index orders_client_idx
  on public.orders (business_id, client_id, created_at desc)
  where client_id is not null;
create index orders_pickup_idx
  on public.orders (business_id, pickup_at)
  where status in ('paid', 'ready') and pickup_at is not null;

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  order_id uuid not null,
  product_id uuid,
  product_name_snapshot text not null,
  quantity integer not null check (quantity between 1 and 10000),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  unit_cost_snapshot numeric(12,2) check (unit_cost_snapshot is null or unit_cost_snapshot >= 0),
  line_total numeric(12,2) generated always as (quantity * unit_price) stored,
  created_at timestamptz not null default now(),
  unique (business_id, id),
  constraint order_items_order_fk
    foreign key (business_id, order_id)
    references public.orders (business_id, id)
    on delete cascade,
  constraint order_items_product_fk
    foreign key (business_id, product_id)
    references public.products (business_id, id)
    on delete set null (product_id)
);

create index order_items_order_idx on public.order_items (business_id, order_id);
create index order_items_product_idx on public.order_items (business_id, product_id)
  where product_id is not null;

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  product_id uuid not null,
  movement_type public.inventory_movement_type not null,
  quantity_delta integer not null check (quantity_delta <> 0),
  unit_cost numeric(12,2) check (unit_cost is null or unit_cost >= 0),
  order_item_id uuid,
  appointment_id uuid,
  reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (business_id, id),
  constraint inventory_product_fk
    foreign key (business_id, product_id)
    references public.products (business_id, id)
    on delete restrict,
  constraint inventory_order_item_fk
    foreign key (business_id, order_item_id)
    references public.order_items (business_id, id)
    on delete set null (order_item_id),
  constraint inventory_appointment_fk
    foreign key (business_id, appointment_id)
    references public.appointments (business_id, id)
    on delete set null (appointment_id),
  constraint inventory_movement_direction_check
    check (
      movement_type = 'adjustment'
      or (movement_type in ('purchase', 'return') and quantity_delta > 0)
      or (movement_type in ('sale', 'internal_use', 'loss', 'courtesy') and quantity_delta < 0)
    )
);

create index inventory_product_ledger_idx
  on public.inventory_movements (business_id, product_id, created_at);
create index inventory_order_item_idx
  on public.inventory_movements (business_id, order_item_id)
  where order_item_id is not null;

create table public.partnerships (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 160),
  description text,
  logo_asset_id uuid,
  website_url text,
  instagram_url text,
  coupon_code text,
  active boolean not null default true,
  display_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  constraint partnerships_logo_fk
    foreign key (business_id, logo_asset_id)
    references public.file_assets (business_id, id)
    on delete set null (logo_asset_id)
);

create index partnerships_public_idx
  on public.partnerships (business_id, active, display_order);

create trigger partnerships_set_updated_at
before update on public.partnerships
for each row execute function public.set_updated_at();

create table public.partnership_products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  partnership_id uuid not null,
  name text not null,
  description text,
  image_asset_id uuid,
  external_url text not null,
  price_label text,
  active boolean not null default true,
  display_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  constraint partnership_products_partnership_fk
    foreign key (business_id, partnership_id)
    references public.partnerships (business_id, id)
    on delete cascade,
  constraint partnership_products_image_fk
    foreign key (business_id, image_asset_id)
    references public.file_assets (business_id, id)
    on delete set null (image_asset_id)
);

create index partnership_products_public_idx
  on public.partnership_products (business_id, partnership_id, active, display_order);

create trigger partnership_products_set_updated_at
before update on public.partnership_products
for each row execute function public.set_updated_at();
