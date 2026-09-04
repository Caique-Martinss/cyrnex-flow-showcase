create or replace function app_private.save_business_configuration_with_media_internal(
  p_business_id uuid,
  p_payload jsonb,
  p_completed boolean,
  p_logo_asset_id uuid,
  p_media jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, auth, app_private
set row_security = off
as $$
declare
  v_item jsonb;
  v_asset_id uuid;
  v_service_id uuid;
begin
  perform app_private.save_business_configuration_internal(
    p_business_id,
    p_payload,
    p_completed
  );

  if p_logo_asset_id is not null and not exists (
    select 1
    from public.file_assets f
    where f.business_id = p_business_id
      and f.id = p_logo_asset_id
  ) then
    raise exception 'Logo não pertence a esta barbearia.'
      using errcode = '23503';
  end if;

  update public.business_public_profiles
  set logo_asset_id = p_logo_asset_id
  where business_id = p_business_id;

  delete from public.business_public_media m
  where m.business_id = p_business_id
    and not exists (
      select 1
      from jsonb_array_elements(coalesce(p_media, '[]'::jsonb)) x
      where (x ->> 'id')::uuid = m.id
    );

  for v_item in
    select value
    from jsonb_array_elements(coalesce(p_media, '[]'::jsonb))
  loop
    v_asset_id := nullif(v_item ->> 'assetId', '')::uuid;
    v_service_id := nullif(v_item ->> 'serviceId', '')::uuid;

    if v_asset_id is not null and not exists (
      select 1
      from public.file_assets f
      where f.business_id = p_business_id
        and f.id = v_asset_id
    ) then
      raise exception 'Mídia não pertence a esta barbearia.'
        using errcode = '23503';
    end if;

    insert into public.business_public_media (
      id,
      business_id,
      media_kind,
      media_type,
      asset_id,
      service_id,
      title,
      description,
      category,
      public_visible,
      display_order
    ) values (
      (v_item ->> 'id')::uuid,
      p_business_id,
      v_item ->> 'mediaKind',
      v_item ->> 'mediaType',
      v_asset_id,
      v_service_id,
      nullif(v_item ->> 'title', ''),
      nullif(v_item ->> 'description', ''),
      nullif(v_item ->> 'category', ''),
      coalesce((v_item ->> 'publicVisible')::boolean, true),
      coalesce((v_item ->> 'displayOrder')::smallint, 0)
    )
    on conflict (business_id, id) do update
    set media_kind = excluded.media_kind,
        media_type = excluded.media_type,
        asset_id = excluded.asset_id,
        service_id = excluded.service_id,
        title = excluded.title,
        description = excluded.description,
        category = excluded.category,
        public_visible = excluded.public_visible,
        display_order = excluded.display_order;
  end loop;
end;
$$;

revoke all on function app_private.save_business_configuration_with_media_internal(
  uuid,
  jsonb,
  boolean,
  uuid,
  jsonb
) from public, anon;
grant execute on function app_private.save_business_configuration_with_media_internal(
  uuid,
  jsonb,
  boolean,
  uuid,
  jsonb
) to authenticated;

create or replace function public.save_business_configuration_with_media(
  p_business_id uuid,
  p_payload jsonb,
  p_completed boolean,
  p_logo_asset_id uuid,
  p_media jsonb
)
returns void
language sql
security invoker
set search_path = pg_catalog, public, app_private
as $$
  select app_private.save_business_configuration_with_media_internal(
    p_business_id,
    p_payload,
    p_completed,
    p_logo_asset_id,
    p_media
  );
$$;

revoke all on function public.save_business_configuration_with_media(
  uuid,
  jsonb,
  boolean,
  uuid,
  jsonb
) from public, anon;
grant execute on function public.save_business_configuration_with_media(
  uuid,
  jsonb,
  boolean,
  uuid,
  jsonb
) to authenticated;
