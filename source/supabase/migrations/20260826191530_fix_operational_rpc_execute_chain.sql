grant execute on function app_private.create_waitlist_entry_internal(
  uuid, uuid, uuid, uuid, timestamptz, timestamptz, text
) to authenticated;
grant execute on function app_private.set_waitlist_status_internal(
  uuid, uuid, public.waitlist_status
) to authenticated;
grant execute on function app_private.create_retroactive_request_internal(
  uuid, uuid, uuid, uuid, timestamptz, numeric, public.payment_method,
  text, text, public.retroactive_proof_type, text, text
) to authenticated;
grant execute on function app_private.approve_retroactive_request_internal(
  uuid, uuid, boolean, boolean, text, text
) to authenticated;
grant execute on function app_private.reject_retroactive_request_internal(
  uuid, uuid, text
) to authenticated;
revoke all on function app_private.retroactive_conflict_internal(
  uuid, uuid, timestamptz, integer, integer
) from authenticated;
