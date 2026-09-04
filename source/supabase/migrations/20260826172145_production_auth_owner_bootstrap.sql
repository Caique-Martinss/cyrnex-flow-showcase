create or replace function app_private.handle_scos_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog,public,auth,app_private,extensions
set row_security = off
as $$
declare
  v_username text := lower(trim(coalesce(new.raw_user_meta_data->>'username','')));
  v_display_name text := trim(coalesce(new.raw_user_meta_data->>'display_name',''));
  v_account_kind text := coalesce(new.raw_user_meta_data->>'scos_account_kind','');
  v_business_name text := trim(coalesce(new.raw_user_meta_data->>'business_name',''));
  v_business_slug text := lower(trim(coalesce(new.raw_user_meta_data->>'business_slug','')));
  v_business_id uuid;
begin
  if v_username <> '' then
    if v_username !~ '^[a-z0-9._-]{3,40}$' then
      raise exception 'invalid CYRNEX FLOW username';
    end if;
    if char_length(v_display_name) < 2 then
      raise exception 'invalid CYRNEX FLOW display name';
    end if;

    insert into public.user_profiles(user_id,username,display_name)
    values (new.id,v_username,v_display_name);
  end if;

  if v_account_kind = 'owner_registration' then
    if v_business_name = '' or char_length(v_business_name) < 2 then
      raise exception 'invalid CYRNEX FLOW business name';
    end if;
    if v_business_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
      raise exception 'invalid CYRNEX FLOW business slug';
    end if;

    v_business_id := extensions.gen_random_uuid();

    insert into public.businesses(
      id,name,slug,status,timezone,currency,operation_mode,onboarding_status,
      onboarding_step,created_by
    ) values (
      v_business_id,v_business_name,v_business_slug,'active','America/Sao_Paulo',
      'BRL','solo','not_started',0,new.id
    );

    insert into public.business_members(business_id,user_id,role,display_name,active)
    values (v_business_id,new.id,'owner',v_display_name,true);

    insert into public.business_settings(business_id) values (v_business_id);
    insert into public.business_public_profiles(business_id,public_page_enabled)
    values (v_business_id,false);

    insert into public.business_modules(business_id,module_key,enabled) values
      (v_business_id,'finance',true),
      (v_business_id,'waitlist',true),
      (v_business_id,'whatsapp',false)
    on conflict (business_id,module_key) do nothing;
  end if;

  return new;
end;
$$;

revoke all on function app_private.handle_scos_auth_user_created()
from public,anon,authenticated;

drop trigger if exists on_scos_auth_user_created on auth.users;
create trigger on_scos_auth_user_created
after insert on auth.users
for each row execute function app_private.handle_scos_auth_user_created();
