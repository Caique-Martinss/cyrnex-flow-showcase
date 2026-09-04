-- Complete the minimum execute chain used by the public RPC wrappers.
-- The internal functions still enforce token/business-role checks themselves.

grant execute on function app_private.record_public_payment_proof_internal(
  text, text, uuid, text, text, bigint
) to service_role;

grant execute on function app_private.review_agenda_payment_proof_internal(
  uuid, uuid, uuid, text, text
) to authenticated, service_role;
