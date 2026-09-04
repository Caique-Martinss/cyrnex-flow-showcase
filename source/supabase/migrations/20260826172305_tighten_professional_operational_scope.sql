drop policy if exists appointments_insert on public.appointments;
create policy appointments_insert on public.appointments for insert to authenticated
with check (
  app_private.has_business_role(
    business_id,array['owner','manager','receptionist']::public.member_role[]
  )
  or app_private.is_own_professional(business_id,professional_id)
);

drop policy if exists recurrence_staff_insert on public.recurrence_series;
drop policy if exists recurrence_staff_update on public.recurrence_series;
create policy recurrence_staff_insert on public.recurrence_series for insert to authenticated
with check (
  app_private.has_business_role(
    business_id,array['owner','manager','receptionist']::public.member_role[]
  )
  or app_private.is_own_professional(business_id,professional_id)
);
create policy recurrence_staff_update on public.recurrence_series for update to authenticated
using (
  app_private.has_business_role(
    business_id,array['owner','manager','receptionist']::public.member_role[]
  )
  or app_private.is_own_professional(business_id,professional_id)
)
with check (
  app_private.has_business_role(
    business_id,array['owner','manager','receptionist']::public.member_role[]
  )
  or app_private.is_own_professional(business_id,professional_id)
);

drop policy if exists schedule_blocks_staff_insert on public.schedule_blocks;
drop policy if exists schedule_blocks_staff_update on public.schedule_blocks;
create policy schedule_blocks_staff_insert on public.schedule_blocks for insert to authenticated
with check (
  app_private.has_business_role(
    business_id,array['owner','manager','receptionist']::public.member_role[]
  )
  or (
    professional_id is not null
    and app_private.is_own_professional(business_id,professional_id)
  )
);
create policy schedule_blocks_staff_update on public.schedule_blocks for update to authenticated
using (
  app_private.has_business_role(
    business_id,array['owner','manager','receptionist']::public.member_role[]
  )
  or (
    professional_id is not null
    and app_private.is_own_professional(business_id,professional_id)
  )
)
with check (
  app_private.has_business_role(
    business_id,array['owner','manager','receptionist']::public.member_role[]
  )
  or (
    professional_id is not null
    and app_private.is_own_professional(business_id,professional_id)
  )
);

drop policy if exists waiting_list_entries_staff_insert on public.waiting_list_entries;
drop policy if exists waiting_list_entries_staff_update on public.waiting_list_entries;
create policy waiting_list_entries_staff_insert on public.waiting_list_entries
for insert to authenticated
with check (
  app_private.has_business_role(
    business_id,array['owner','manager','receptionist']::public.member_role[]
  )
  or (
    professional_id is not null
    and app_private.is_own_professional(business_id,professional_id)
  )
);
create policy waiting_list_entries_staff_update on public.waiting_list_entries
for update to authenticated
using (
  app_private.has_business_role(
    business_id,array['owner','manager','receptionist']::public.member_role[]
  )
  or (
    professional_id is not null
    and app_private.is_own_professional(business_id,professional_id)
  )
)
with check (
  app_private.has_business_role(
    business_id,array['owner','manager','receptionist']::public.member_role[]
  )
  or (
    professional_id is not null
    and app_private.is_own_professional(business_id,professional_id)
  )
);
