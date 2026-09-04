-- Supabase Storage bucket for business-owned images and files.
-- File paths must start with the business UUID: <business_id>/...

insert into storage.buckets (id, name, public)
values ('business-assets', 'business-assets', false)
on conflict (id) do nothing;

create policy business_assets_member_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'business-assets'
  and app_private.is_business_member_path((storage.foldername(name))[1])
);

create policy business_assets_staff_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'business-assets'
  and app_private.has_business_role_path(
    (storage.foldername(name))[1],
    array['owner', 'manager', 'professional', 'receptionist']::public.member_role[]
  )
);

create policy business_assets_staff_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'business-assets'
  and app_private.has_business_role_path(
    (storage.foldername(name))[1],
    array['owner', 'manager', 'professional', 'receptionist']::public.member_role[]
  )
)
with check (
  bucket_id = 'business-assets'
  and app_private.has_business_role_path(
    (storage.foldername(name))[1],
    array['owner', 'manager', 'professional', 'receptionist']::public.member_role[]
  )
);

create policy business_assets_manager_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'business-assets'
  and app_private.has_business_role_path(
    (storage.foldername(name))[1],
    array['owner', 'manager']::public.member_role[]
  )
);
