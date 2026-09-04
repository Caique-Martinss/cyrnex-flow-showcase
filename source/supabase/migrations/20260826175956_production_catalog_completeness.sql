-- Completes the production catalog model used by the current MVP UI.
-- Service add-ons were already present in the application domain and professional
-- schedules need an explicit flag to distinguish inheritance from a custom week.

alter table public.professionals
  add column if not exists uses_custom_schedule boolean not null default false;

create table public.service_addons (
  id uuid primary key default extensions.gen_random_uuid(),
  business_id uuid not null,
  service_id uuid not null,
  name text not null check (char_length(trim(name)) between 2 and 120),
  price_delta numeric(12,2) not null default 0,
  duration_delta_minutes smallint not null default 0
    check (duration_delta_minutes between -720 and 720),
  active boolean not null default true,
  display_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  constraint service_addons_service_fk foreign key (business_id, service_id)
    references public.services(business_id, id) on delete cascade
);

create index if not exists service_addons_service_idx
  on public.service_addons(business_id, service_id, active, display_order);

create trigger service_addons_set_updated_at
before update on public.service_addons
for each row execute function public.set_updated_at();

alter table public.service_addons enable row level security;
alter table public.service_addons force row level security;

create policy service_addons_member_read on public.service_addons
for select to authenticated
using (app_private.is_business_member(business_id));

create policy service_addons_manager_insert on public.service_addons
for insert to authenticated
with check (
  app_private.has_business_role(
    business_id,
    array['owner', 'manager']::public.member_role[]
  )
);

create policy service_addons_manager_update on public.service_addons
for update to authenticated
using (
  app_private.has_business_role(
    business_id,
    array['owner', 'manager']::public.member_role[]
  )
)
with check (
  app_private.has_business_role(
    business_id,
    array['owner', 'manager']::public.member_role[]
  )
);

create policy service_addons_manager_delete on public.service_addons
for delete to authenticated
using (
  app_private.has_business_role(
    business_id,
    array['owner', 'manager']::public.member_role[]
  )
);

grant select, insert, update, delete on public.service_addons to authenticated;
revoke all on public.service_addons from anon;
