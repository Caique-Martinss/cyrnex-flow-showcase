-- Multi-tenant isolation and role-aware Row Level Security.
-- Authorization uses business_members, not user-editable JWT user_metadata.

create schema if not exists app_private;

create or replace function app_private.is_business_member(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.business_members bm
    where bm.business_id = p_business_id
      and bm.user_id = (select auth.uid())
      and bm.active = true
  );
$$;

create or replace function app_private.has_business_role(
  p_business_id uuid,
  p_roles public.member_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.business_members bm
    where bm.business_id = p_business_id
      and bm.user_id = (select auth.uid())
      and bm.active = true
      and bm.role = any(p_roles)
  );
$$;

create or replace function app_private.is_own_professional(
  p_business_id uuid,
  p_professional_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.professionals p
    join public.business_members bm
      on bm.business_id = p.business_id
     and bm.id = p.member_id
    where p.business_id = p_business_id
      and p.id = p_professional_id
      and bm.user_id = (select auth.uid())
      and bm.active = true
      and p.active = true
  );
$$;

create or replace function app_private.is_business_member_path(p_business_id text)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.business_members bm
    where bm.business_id::text = p_business_id
      and bm.user_id = (select auth.uid())
      and bm.active = true
  );
$$;

create or replace function app_private.has_business_role_path(
  p_business_id text,
  p_roles public.member_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.business_members bm
    where bm.business_id::text = p_business_id
      and bm.user_id = (select auth.uid())
      and bm.active = true
      and bm.role = any(p_roles)
  );
$$;

revoke all on schema app_private from public;
grant usage on schema app_private to authenticated;
grant execute on function app_private.is_business_member(uuid) to authenticated;
grant execute on function app_private.has_business_role(uuid, public.member_role[]) to authenticated;
grant execute on function app_private.is_own_professional(uuid, uuid) to authenticated;
grant execute on function app_private.is_business_member_path(text) to authenticated;
grant execute on function app_private.has_business_role_path(text, public.member_role[])
  to authenticated;

alter table public.businesses enable row level security;
alter table public.business_members enable row level security;

create policy businesses_insert_owner
on public.businesses
for insert
to authenticated
with check ((select auth.uid()) = created_by);

create policy businesses_select_member
on public.businesses
for select
to authenticated
using (
  created_by = (select auth.uid())
  or app_private.is_business_member(id)
);

create policy businesses_update_manager
on public.businesses
for update
to authenticated
using (app_private.has_business_role(id, array['owner', 'manager']::public.member_role[]))
with check (app_private.has_business_role(id, array['owner', 'manager']::public.member_role[]));

create policy business_members_select_member
on public.business_members
for select
to authenticated
using (app_private.is_business_member(business_id));

create policy business_members_bootstrap_owner
on public.business_members
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and role = 'owner'
  and exists (
    select 1 from public.businesses b
    where b.id = business_id
      and b.created_by = (select auth.uid())
  )
);

create policy business_members_manage_owner
on public.business_members
for all
to authenticated
using (app_private.has_business_role(business_id, array['owner']::public.member_role[]))
with check (app_private.has_business_role(business_id, array['owner']::public.member_role[]));

-- Administrative configuration: readable by members, writable by owner/manager.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'business_settings',
    'business_modules',
    'business_rules',
    'business_hours',
    'business_payment_methods',
    'professionals',
    'services',
    'service_addons',
    'service_addon_links',
    'professional_services',
    'professional_hours',
    'commission_rules',
    'expense_categories',
    'products',
    'partnerships',
    'partnership_products',
    'business_public_profiles',
    'public_highlights',
    'media_mentions',
    'message_templates'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using (app_private.is_business_member(business_id))',
      table_name || '_member_read',
      table_name
    );
    execute format(
      'create policy %I on public.%I for all to authenticated using '
      || '(app_private.has_business_role(business_id, array[''owner'', ''manager'']::public.member_role[])) '
      || 'with check (app_private.has_business_role(business_id, array[''owner'', ''manager'']::public.member_role[]))',
      table_name || '_manager_write',
      table_name
    );
  end loop;
end $$;

-- Operational customer and scheduling data.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'clients',
    'client_preferences',
    'file_assets',
    'client_media',
    'recurrence_series',
    'recurrence_pattern_items',
    'appointment_addons',
    'appointment_adjustments',
    'schedule_blocks',
    'waiting_list_entries',
    'waiting_list_offers',
    'orders',
    'order_items',
    'inventory_reservations',
    'notifications',
    'quotes',
    'quote_items'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using (app_private.is_business_member(business_id))',
      table_name || '_member_read',
      table_name
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check '
      || '(app_private.has_business_role(business_id, ' 
      || 'array[''owner'', ''manager'', ''professional'', ''receptionist'']::public.member_role[]))',
      table_name || '_staff_insert',
      table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using '
      || '(app_private.has_business_role(business_id, ' 
      || 'array[''owner'', ''manager'', ''professional'', ''receptionist'']::public.member_role[])) ' 
      || 'with check (app_private.has_business_role(business_id, ' 
      || 'array[''owner'', ''manager'', ''professional'', ''receptionist'']::public.member_role[]))',
      table_name || '_staff_update',
      table_name
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using '
      || '(app_private.has_business_role(business_id, array[''owner'', ''manager'']::public.member_role[]))',
      table_name || '_manager_delete',
      table_name
    );
  end loop;
end $$;

alter table public.appointments enable row level security;
create policy appointments_manager_or_reception_read
on public.appointments
for select
to authenticated
using (
  app_private.has_business_role(
    business_id,
    array['owner', 'manager', 'receptionist']::public.member_role[]
  )
  or app_private.is_own_professional(business_id, professional_id)
);
create policy appointments_staff_insert
on public.appointments
for insert
to authenticated
with check (
  app_private.has_business_role(
    business_id,
    array['owner', 'manager', 'professional', 'receptionist']::public.member_role[]
  )
);
create policy appointments_update
on public.appointments
for update
to authenticated
using (
  app_private.has_business_role(
    business_id,
    array['owner', 'manager', 'receptionist']::public.member_role[]
  )
  or app_private.is_own_professional(business_id, professional_id)
)
with check (
  app_private.has_business_role(
    business_id,
    array['owner', 'manager', 'receptionist']::public.member_role[]
  )
  or app_private.is_own_professional(business_id, professional_id)
);
create policy appointments_manager_delete
on public.appointments
for delete
to authenticated
using (app_private.has_business_role(business_id, array['owner', 'manager']::public.member_role[]));

-- Appointment history is append-only for application users.
alter table public.appointment_events enable row level security;
create policy appointment_events_read
on public.appointment_events
for select
to authenticated
using (
  exists (
    select 1
    from public.appointments a
    where a.business_id = appointment_events.business_id
      and a.id = appointment_events.appointment_id
      and (
        app_private.has_business_role(
          a.business_id,
          array['owner', 'manager', 'receptionist']::public.member_role[]
        )
        or app_private.is_own_professional(a.business_id, a.professional_id)
      )
  )
);
create policy appointment_events_staff_insert
on public.appointment_events
for insert
to authenticated
with check (
  exists (
    select 1
    from public.appointments a
    where a.business_id = appointment_events.business_id
      and a.id = appointment_events.appointment_id
      and (
        app_private.has_business_role(
          a.business_id,
          array['owner', 'manager', 'receptionist']::public.member_role[]
        )
        or app_private.is_own_professional(a.business_id, a.professional_id)
      )
  )
);

-- Public booking management tokens are backend-only secrets.
alter table public.booking_access_tokens enable row level security;

-- Financial data is intentionally restricted to owners/managers.
alter table public.receivables enable row level security;
create policy receivables_manager_read
on public.receivables
for select
to authenticated
using (app_private.has_business_role(business_id, array['owner', 'manager']::public.member_role[]));
create policy receivables_manager_insert
on public.receivables
for insert
to authenticated
with check (app_private.has_business_role(business_id, array['owner', 'manager']::public.member_role[]));
create policy receivables_manager_update
on public.receivables
for update
to authenticated
using (app_private.has_business_role(business_id, array['owner', 'manager']::public.member_role[]))
with check (app_private.has_business_role(business_id, array['owner', 'manager']::public.member_role[]));

alter table public.payments enable row level security;
create policy payments_manager_read
on public.payments
for select
to authenticated
using (app_private.has_business_role(business_id, array['owner', 'manager']::public.member_role[]));
create policy payments_manager_insert
on public.payments
for insert
to authenticated
with check (app_private.has_business_role(business_id, array['owner', 'manager']::public.member_role[]));
create policy payments_manager_update
on public.payments
for update
to authenticated
using (app_private.has_business_role(business_id, array['owner', 'manager']::public.member_role[]))
with check (app_private.has_business_role(business_id, array['owner', 'manager']::public.member_role[]));

alter table public.receivable_entries enable row level security;
create policy receivable_entries_manager_read
on public.receivable_entries
for select
to authenticated
using (app_private.has_business_role(business_id, array['owner', 'manager']::public.member_role[]));
create policy receivable_entries_manager_insert
on public.receivable_entries
for insert
to authenticated
with check (app_private.has_business_role(business_id, array['owner', 'manager']::public.member_role[]));

alter table public.expenses enable row level security;
create policy expenses_manager_read
on public.expenses
for select
to authenticated
using (app_private.has_business_role(business_id, array['owner', 'manager']::public.member_role[]));
create policy expenses_manager_insert
on public.expenses
for insert
to authenticated
with check (app_private.has_business_role(business_id, array['owner', 'manager']::public.member_role[]));
create policy expenses_manager_update
on public.expenses
for update
to authenticated
using (app_private.has_business_role(business_id, array['owner', 'manager']::public.member_role[]))
with check (app_private.has_business_role(business_id, array['owner', 'manager']::public.member_role[]));
create policy expenses_manager_delete
on public.expenses
for delete
to authenticated
using (app_private.has_business_role(business_id, array['owner', 'manager']::public.member_role[]));

-- Inventory movements are a ledger: members may read, authorized staff may append,
-- but application users cannot rewrite or delete history.
alter table public.inventory_movements enable row level security;
create policy inventory_movements_member_read
on public.inventory_movements
for select
to authenticated
using (app_private.is_business_member(business_id));
create policy inventory_movements_staff_insert
on public.inventory_movements
for insert
to authenticated
with check (
  app_private.has_business_role(
    business_id,
    array['owner', 'manager', 'receptionist']::public.member_role[]
  )
);

-- Hair prosthesis information: owner/manager plus the assigned professional.
alter table public.prosthesis_cases enable row level security;
create policy prosthesis_cases_read
on public.prosthesis_cases
for select
to authenticated
using (
  app_private.has_business_role(business_id, array['owner', 'manager']::public.member_role[])
  or (
    professional_id is not null
    and app_private.is_own_professional(business_id, professional_id)
  )
);
create policy prosthesis_cases_write
on public.prosthesis_cases
for all
to authenticated
using (
  app_private.has_business_role(business_id, array['owner', 'manager']::public.member_role[])
  or (
    professional_id is not null
    and app_private.is_own_professional(business_id, professional_id)
  )
)
with check (
  app_private.has_business_role(business_id, array['owner', 'manager']::public.member_role[])
  or (
    professional_id is not null
    and app_private.is_own_professional(business_id, professional_id)
  )
);

alter table public.prosthesis_maintenance enable row level security;
create policy prosthesis_maintenance_read
on public.prosthesis_maintenance
for select
to authenticated
using (
  app_private.has_business_role(business_id, array['owner', 'manager']::public.member_role[])
  or exists (
    select 1
    from public.prosthesis_cases pc
    where pc.business_id = prosthesis_maintenance.business_id
      and pc.id = prosthesis_maintenance.prosthesis_case_id
      and pc.professional_id is not null
      and app_private.is_own_professional(pc.business_id, pc.professional_id)
  )
);
create policy prosthesis_maintenance_write
on public.prosthesis_maintenance
for all
to authenticated
using (
  app_private.has_business_role(business_id, array['owner', 'manager']::public.member_role[])
  or exists (
    select 1
    from public.prosthesis_cases pc
    where pc.business_id = prosthesis_maintenance.business_id
      and pc.id = prosthesis_maintenance.prosthesis_case_id
      and pc.professional_id is not null
      and app_private.is_own_professional(pc.business_id, pc.professional_id)
  )
)
with check (
  app_private.has_business_role(business_id, array['owner', 'manager']::public.member_role[])
  or exists (
    select 1
    from public.prosthesis_cases pc
    where pc.business_id = prosthesis_maintenance.business_id
      and pc.id = prosthesis_maintenance.prosthesis_case_id
      and pc.professional_id is not null
      and app_private.is_own_professional(pc.business_id, pc.professional_id)
  )
);

-- Audit is append-only to application users.
alter table public.audit_logs enable row level security;
create policy audit_logs_manager_read
on public.audit_logs
for select
to authenticated
using (app_private.has_business_role(business_id, array['owner', 'manager']::public.member_role[]));

-- Table privileges are broad at the PostgreSQL role level; RLS is the mandatory row barrier.
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Anonymous users never query business tables directly. Public pages/bookings go through the API.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

