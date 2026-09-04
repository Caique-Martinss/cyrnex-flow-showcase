revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke execute on all functions in schema public from anon;

alter default privileges for role postgres in schema public
revoke all on tables from anon;
alter default privileges for role postgres in schema public
revoke all on sequences from anon;
alter default privileges for role postgres in schema public
revoke execute on functions from anon;

grant execute on function public.is_time_slot_available(
  uuid,uuid,timestamptz,timestamptz,uuid
) to authenticated;
