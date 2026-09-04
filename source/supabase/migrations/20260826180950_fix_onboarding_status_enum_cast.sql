-- Remote repair kept in history. On a clean database the previous migration
-- already contains the explicit enum casts, so this block becomes a no-op.
do $$
declare
  v_definition text;
  v_old text := E'onboarding_status = case\n'
    || E'        when p_completed or v_previous_completed_at is not null then ''completed''\n'
    || E'        else ''in_progress''\n'
    || E'      end,';
  v_new text := E'onboarding_status = case\n'
    || E'        when p_completed or v_previous_completed_at is not null\n'
    || E'          then ''completed''::public.onboarding_status\n'
    || E'        else ''in_progress''::public.onboarding_status\n'
    || E'      end,';
begin
  select pg_get_functiondef(
    'app_private.save_business_configuration_internal(uuid,jsonb,boolean)'::regprocedure
  ) into v_definition;

  if position(v_old in v_definition) > 0 then
    execute replace(v_definition, v_old, v_new);
  end if;
end $$;
