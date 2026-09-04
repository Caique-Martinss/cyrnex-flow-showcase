-- Payments, accounts receivable and expenses.

create type public.payment_status as enum ('pending', 'paid', 'failed', 'cancelled', 'refunded');
create type public.payment_purpose as enum ('deposit', 'service', 'product', 'debt', 'other');
create type public.receivable_status as enum ('open', 'partial', 'paid', 'forgiven', 'cancelled');
create type public.receivable_entry_type as enum (
  'payment',
  'forgiveness',
  'increase',
  'decrease'
);

create table public.receivables (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_id uuid not null,
  appointment_id uuid,
  order_id uuid,
  original_amount numeric(12,2) not null check (original_amount > 0),
  status public.receivable_status not null default 'open',
  due_date date,
  reason text,
  authorized_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  constraint receivables_client_fk
    foreign key (business_id, client_id)
    references public.clients (business_id, id)
    on delete restrict,
  constraint receivables_appointment_fk
    foreign key (business_id, appointment_id)
    references public.appointments (business_id, id)
    on delete set null (appointment_id),
  constraint receivables_order_fk
    foreign key (business_id, order_id)
    references public.orders (business_id, id)
    on delete set null (order_id),
  constraint receivables_source_check
    check (num_nonnulls(appointment_id, order_id) <= 1)
);

create index receivables_open_idx
  on public.receivables (business_id, client_id, status, created_at desc)
  where status in ('open', 'partial');

create trigger receivables_set_updated_at
before update on public.receivables
for each row execute function public.set_updated_at();

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_id uuid,
  appointment_id uuid,
  order_id uuid,
  receivable_id uuid,
  purpose public.payment_purpose not null,
  method public.payment_method not null,
  status public.payment_status not null default 'paid',
  gross_amount numeric(12,2) not null check (gross_amount > 0),
  fee_amount numeric(12,2) not null default 0 check (fee_amount >= 0),
  net_amount numeric(12,2) generated always as (gross_amount - fee_amount) stored,
  external_provider text,
  external_reference text,
  paid_at timestamptz,
  recorded_by uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  constraint payments_client_fk
    foreign key (business_id, client_id)
    references public.clients (business_id, id)
    on delete set null (client_id),
  constraint payments_appointment_fk
    foreign key (business_id, appointment_id)
    references public.appointments (business_id, id)
    on delete set null (appointment_id),
  constraint payments_order_fk
    foreign key (business_id, order_id)
    references public.orders (business_id, id)
    on delete set null (order_id),
  constraint payments_receivable_fk
    foreign key (business_id, receivable_id)
    references public.receivables (business_id, id)
    on delete set null (receivable_id),
  constraint payments_source_check
    check (num_nonnulls(appointment_id, order_id, receivable_id) = 1),
  constraint payments_fee_check check (fee_amount <= gross_amount),
  constraint payments_paid_at_check check (status <> 'paid' or paid_at is not null)
);

create unique index payments_external_reference_unique_idx
  on public.payments (business_id, external_provider, external_reference)
  where external_reference is not null;
create index payments_business_paid_idx
  on public.payments (business_id, paid_at desc)
  where status = 'paid';
create index payments_client_idx
  on public.payments (business_id, client_id, created_at desc)
  where client_id is not null;
create index payments_appointment_idx
  on public.payments (business_id, appointment_id)
  where appointment_id is not null;

create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

create table public.receivable_entries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  receivable_id uuid not null,
  entry_type public.receivable_entry_type not null,
  amount numeric(12,2) not null check (amount > 0),
  payment_id uuid,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (business_id, id),
  constraint receivable_entries_receivable_fk
    foreign key (business_id, receivable_id)
    references public.receivables (business_id, id)
    on delete cascade,
  constraint receivable_entries_payment_fk
    foreign key (business_id, payment_id)
    references public.payments (business_id, id)
    on delete set null (payment_id),
  constraint receivable_entries_payment_type_check
    check (
      (entry_type = 'payment' and payment_id is not null)
      or (entry_type <> 'payment' and payment_id is null)
    )
);

create index receivable_entries_ledger_idx
  on public.receivable_entries (business_id, receivable_id, created_at);

create or replace function public.refresh_receivable_status()
returns trigger
language plpgsql
as $$
declare
  target_business_id uuid;
  target_receivable_id uuid;
  original numeric(12,2);
  current_status public.receivable_status;
  paid_total numeric(12,2);
  forgiven_total numeric(12,2);
  increase_total numeric(12,2);
  decrease_total numeric(12,2);
  balance numeric(12,2);
begin
  target_business_id := new.business_id;
  target_receivable_id := new.receivable_id;

  select r.original_amount, r.status
    into original, current_status
  from public.receivables r
  where r.business_id = target_business_id
    and r.id = target_receivable_id;

  if current_status = 'cancelled' then
    return new;
  end if;

  select
    coalesce(sum(amount) filter (where entry_type = 'payment'), 0),
    coalesce(sum(amount) filter (where entry_type = 'forgiveness'), 0),
    coalesce(sum(amount) filter (where entry_type = 'increase'), 0),
    coalesce(sum(amount) filter (where entry_type = 'decrease'), 0)
  into paid_total, forgiven_total, increase_total, decrease_total
  from public.receivable_entries
  where business_id = target_business_id
    and receivable_id = target_receivable_id;

  balance := greatest(
    original + increase_total - paid_total - forgiven_total - decrease_total,
    0
  );

  update public.receivables
  set status = case
    when balance = 0 and paid_total = 0 and forgiven_total > 0 then 'forgiven'
    when balance = 0 then 'paid'
    when balance < original + increase_total then 'partial'
    else 'open'
  end
  where business_id = target_business_id
    and id = target_receivable_id;

  return new;
end;
$$;

create trigger receivable_entries_refresh_status
  after insert on public.receivable_entries
  for each row execute function public.refresh_receivable_status();

create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 100),
  active boolean not null default true,
  display_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id)
);

create unique index expense_categories_name_unique_idx
  on public.expense_categories (business_id, lower(name))
  where active = true;

create trigger expense_categories_set_updated_at
before update on public.expense_categories
for each row execute function public.set_updated_at();

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  category_id uuid,
  description text not null check (char_length(trim(description)) between 2 and 240),
  amount numeric(12,2) not null check (amount > 0),
  expense_date date not null,
  method public.payment_method,
  vendor_name text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  constraint expenses_category_fk
    foreign key (business_id, category_id)
    references public.expense_categories (business_id, id)
    on delete set null (category_id)
);

create index expenses_business_date_idx
  on public.expenses (business_id, expense_date desc);
create index expenses_category_date_idx
  on public.expenses (business_id, category_id, expense_date desc)
  where category_id is not null;

create trigger expenses_set_updated_at
before update on public.expenses
for each row execute function public.set_updated_at();
