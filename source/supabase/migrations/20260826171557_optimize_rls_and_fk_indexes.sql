drop policy if exists user_profiles_own_select on public.user_profiles;
drop policy if exists user_profiles_own_insert on public.user_profiles;
drop policy if exists user_profiles_own_update on public.user_profiles;
create policy user_profiles_own_select on public.user_profiles
for select to authenticated using (user_id=(select auth.uid()));
create policy user_profiles_own_insert on public.user_profiles
for insert to authenticated with check (user_id=(select auth.uid()));
create policy user_profiles_own_update on public.user_profiles
for update to authenticated
using (user_id=(select auth.uid()))
with check (user_id=(select auth.uid()));

drop policy if exists businesses_insert_self on public.businesses;
drop policy if exists businesses_select_member on public.businesses;
create policy businesses_insert_self on public.businesses
for insert to authenticated with check (created_by=(select auth.uid()));
create policy businesses_select_member on public.businesses
for select to authenticated
using (created_by=(select auth.uid()) or app_private.is_business_member(id));

drop policy if exists business_members_bootstrap_owner on public.business_members;
drop policy if exists business_members_owner_manage on public.business_members;
create policy business_members_insert on public.business_members
for insert to authenticated
with check (
  (
    user_id=(select auth.uid())
    and role='owner'
    and exists (
      select 1 from public.businesses b
      where b.id=business_id and b.created_by=(select auth.uid())
    )
  )
  or app_private.has_business_role(
    business_id,array['owner']::public.member_role[]
  )
);
create policy business_members_owner_update on public.business_members
for update to authenticated
using (app_private.has_business_role(business_id,array['owner']::public.member_role[]))
with check (app_private.has_business_role(business_id,array['owner']::public.member_role[]));
create policy business_members_owner_delete on public.business_members
for delete to authenticated
using (app_private.has_business_role(business_id,array['owner']::public.member_role[]));

create index if not exists businesses_created_by_idx on public.businesses(created_by);
create index if not exists clients_created_by_idx on public.clients(created_by)
where created_by is not null;
create index if not exists file_assets_uploaded_by_idx on public.file_assets(uploaded_by)
where uploaded_by is not null;
create index if not exists appointments_created_by_idx on public.appointments(created_by)
where created_by is not null;
create index if not exists appointments_service_fk_idx
on public.appointments(business_id,service_id);
create index if not exists appointments_recurrence_fk_idx
on public.appointments(business_id,recurrence_series_id)
where recurrence_series_id is not null;
create index if not exists appointments_fit_in_conflict_fk_idx
on public.appointments(business_id,fit_in_conflict_appointment_id)
where fit_in_conflict_appointment_id is not null;
create index if not exists appointment_events_actor_user_idx
on public.appointment_events(actor_user_id)
where actor_user_id is not null;
create index if not exists recurrence_series_client_fk_idx
on public.recurrence_series(business_id,client_id);
create index if not exists recurrence_series_professional_fk_idx
on public.recurrence_series(business_id,professional_id);
create index if not exists recurrence_series_created_by_idx
on public.recurrence_series(created_by)
where created_by is not null;
create index if not exists schedule_blocks_created_by_idx
on public.schedule_blocks(created_by)
where created_by is not null;
create index if not exists waiting_list_client_fk_idx
on public.waiting_list_entries(business_id,client_id);
create index if not exists waiting_list_service_fk_idx
on public.waiting_list_entries(business_id,service_id);
create index if not exists waiting_list_professional_fk_idx
on public.waiting_list_entries(business_id,professional_id)
where professional_id is not null;
create index if not exists waiting_list_created_by_idx
on public.waiting_list_entries(created_by)
where created_by is not null;
