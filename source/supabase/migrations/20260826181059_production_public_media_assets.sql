alter table public.business_public_profiles
  add column if not exists logo_asset_id uuid;

alter table public.business_public_profiles
  add constraint business_public_profiles_logo_asset_fk
  foreign key (business_id, logo_asset_id)
  references public.file_assets(business_id, id)
  on delete set null (logo_asset_id);

alter table public.business_public_media
  alter column asset_id drop not null;

alter table public.business_public_media
  drop constraint if exists business_public_media_asset_fk;

alter table public.business_public_media
  add constraint business_public_media_asset_fk
  foreign key (business_id, asset_id)
  references public.file_assets(business_id, id)
  on delete set null (asset_id);

create index if not exists business_public_profiles_logo_asset_idx
  on public.business_public_profiles(business_id, logo_asset_id)
  where logo_asset_id is not null;
