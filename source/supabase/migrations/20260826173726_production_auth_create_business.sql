create or replace function app_private.create_business_for_current_user_internal(
  p_business_name text,
  p_requested_slug text
)
returns table (
  id uuid,
  name text,
  slug text,
  role public.member_role,
  display_name text
)
language plpgsql
security definer
set search_path = pg_catalog,public,auth,app_private,extensions
set row_security = off
as $$
declare
  v_user_id uuid := auth.uid();
  v_name text := trim(coalesce(p_business_name,''));
  v_base_slug text := lower(trim(coalesce(p_requested_slug,'')));
  v_slug text;
  v_suffix integer := 1;
  v_business_id uuid;
  v_display_name text;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;
  if char_length(v_name) < 2 or char_length(v_name) > 120 then
    raise exception 'invalid business name';
  end if;
  if v_base_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'invalid business slug';
  end if;
  if (
    select count(*)
    from public.business_members bm
    where bm.user_id=v_user_id and bm.active and bm.role='owner'
  ) >= 20 then
    raise exception 'business limit reached';
  end if;

  select coalesce(up.display_name,'Proprietário')
  into v_display_name
  from public.user_profiles up
  where up.user_id=v_user_id;

  v_slug := v_base_slug;
  while exists (
    select 1 from public.businesses b where lower(b.slug)=lower(v_slug)
  ) loop
    v_suffix := v_suffix + 1;
    v_slug := v_base_slug || '-' || v_suffix::text;
  end loop;

  v_business_id := extensions.gen_random_uuid();
  insert into public.businesses(
    id,name,slug,status,timezone,currency,operation_mode,onboarding_status,
    onboarding_step,created_by
  ) values (
    v_business_id,v_name,v_slug,'active','America/Sao_Paulo','BRL','solo',
    'not_started',0,v_user_id
  );

  insert into public.business_members(business_id,user_id,role,display_name,active)
  values(v_business_id,v_user_id,'owner',v_display_name,true);

  insert into public.business_settings(business_id) values(v_business_id);
  insert into public.business_public_profiles(business_id,public_page_enabled)
  values(v_business_id,false);
  insert into public.business_modules(business_id,module_key,enabled) values
    (v_business_id,'finance',true),
    (v_business_id,'waitlist',true),
    (v_business_id,'whatsapp',false)
  on conflict (business_id,module_key) do nothing;

  return query
  select v_business_id,v_name,v_slug,'owner'::public.member_role,v_display_name;
end;
$$;
revoke all on function app_private.create_business_for_current_user_internal(text,text)
from public,anon;
grant execute on function app_private.create_business_for_current_user_internal(text,text)
to authenticated;

create or replace function public.create_business_for_current_user(
  p_business_name text,
  p_requested_slug text
)
returns table (
  id uuid,
  name text,
  slug text,
  role public.member_role,
  display_name text
)
language sql
security invoker
set search_path = pg_catalog,public,app_private
as $$
  select *
  from app_private.create_business_for_current_user_internal(
    p_business_name,p_requested_slug
  );
$$;
revoke all on function public.create_business_for_current_user(text,text)
from public,anon;
grant execute on function public.create_business_for_current_user(text,text)
to authenticated;
