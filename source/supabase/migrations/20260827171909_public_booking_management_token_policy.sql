-- Explicit client denial keeps token rows backend-only and documents the RLS intent.
create policy booking_access_tokens_deny_client_access
  on public.booking_access_tokens
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);
