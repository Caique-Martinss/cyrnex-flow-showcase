-- Launch guard for V11.6.1.
-- Keeps unfinished modules visible in the product roadmap while preventing backend activation.

alter table public.business_settings
  alter column allow_waitlist set default false;

update public.business_settings
set allow_waitlist = false,
    require_deposit = false,
    default_deposit_percent = 0
where allow_waitlist
   or require_deposit
   or default_deposit_percent <> 0;

update public.business_modules
set enabled = false
where module_key <> 'finance'
  and enabled;

update public.business_rules
set enabled = false
where rule_key = 'repeat_no_show_deposit'
  and enabled;

create or replace function app_private.enforce_launch_business_settings()
returns trigger
language plpgsql
set search_path = pg_catalog, public, app_private
as $$
begin
  new.allow_waitlist := false;
  new.require_deposit := false;
  new.default_deposit_percent := 0;
  return new;
end;
$$;

create or replace function app_private.enforce_launch_business_module()
returns trigger
language plpgsql
set search_path = pg_catalog, public, app_private
as $$
begin
  if new.module_key <> 'finance' then
    new.enabled := false;
  end if;
  return new;
end;
$$;

create or replace function app_private.enforce_launch_business_rule()
returns trigger
language plpgsql
set search_path = pg_catalog, public, app_private
as $$
begin
  if new.rule_key = 'repeat_no_show_deposit' then
    new.enabled := false;
  end if;
  return new;
end;
$$;

drop trigger if exists business_settings_launch_guard on public.business_settings;
create trigger business_settings_launch_guard
before insert or update on public.business_settings
for each row execute function app_private.enforce_launch_business_settings();

drop trigger if exists business_modules_launch_guard on public.business_modules;
create trigger business_modules_launch_guard
before insert or update on public.business_modules
for each row execute function app_private.enforce_launch_business_module();

drop trigger if exists business_rules_launch_guard on public.business_rules;
create trigger business_rules_launch_guard
before insert or update on public.business_rules
for each row execute function app_private.enforce_launch_business_rule();

revoke all on function app_private.enforce_launch_business_settings() from public, anon, authenticated;
revoke all on function app_private.enforce_launch_business_module() from public, anon, authenticated;
revoke all on function app_private.enforce_launch_business_rule() from public, anon, authenticated;
