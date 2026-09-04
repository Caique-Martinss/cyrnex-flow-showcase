-- CYRNEX Admin hardening after first remote integration.
-- Adds covering indexes for platform-control foreign keys highlighted by the Supabase advisor.

create index if not exists business_subscriptions_updated_by_idx
  on public.business_subscriptions(updated_by)
  where updated_by is not null;

create index if not exists platform_deletion_receipts_actor_idx
  on public.platform_deletion_receipts(actor_user_id)
  where actor_user_id is not null;
