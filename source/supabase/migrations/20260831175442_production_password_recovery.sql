-- Production password recovery challenges used only by the CYRNEX FLOW backend.
-- The browser never receives database credentials and cannot read these records directly.

create table if not exists public.password_recovery_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  code_hash text not null,
  code_salt text not null,
  reset_token_hash text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  verified_at timestamptz,
  used_at timestamptz,
  attempts integer not null default 0 check (attempts between 0 and 5)
);

create index if not exists password_recovery_challenges_user_idx
  on public.password_recovery_challenges (user_id, created_at desc);

create index if not exists password_recovery_challenges_email_idx
  on public.password_recovery_challenges (lower(email), created_at desc);

create index if not exists password_recovery_challenges_expiry_idx
  on public.password_recovery_challenges (expires_at);

alter table public.password_recovery_challenges enable row level security;
alter table public.password_recovery_challenges force row level security;

revoke all on table public.password_recovery_challenges from public, anon, authenticated;
grant select, insert, update, delete on table public.password_recovery_challenges to service_role;

drop policy if exists password_recovery_service_role_only on public.password_recovery_challenges;
create policy password_recovery_service_role_only
  on public.password_recovery_challenges
  for all
  to service_role
  using (true)
  with check (true);

create or replace function public.find_recovery_user_by_email(p_email text)
returns uuid
language sql
security definer
set search_path = ''
stable
as $$
  select u.id
  from auth.users u
  where lower(u.email) = lower(trim(p_email))
  order by u.created_at asc
  limit 1;
$$;

revoke all on function public.find_recovery_user_by_email(text) from public, anon, authenticated;
grant execute on function public.find_recovery_user_by_email(text) to service_role;

create or replace function public.claim_password_recovery_challenge(
  p_email text,
  p_reset_token_hash text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_user_id uuid;
begin
  update public.password_recovery_challenges
  set used_at = now()
  where id = (
    select c.id
    from public.password_recovery_challenges c
    where lower(c.email) = lower(trim(p_email))
      and c.reset_token_hash = p_reset_token_hash
      and c.verified_at is not null
      and c.used_at is null
      and c.expires_at > now()
    order by c.created_at desc
    limit 1
    for update skip locked
  )
  returning user_id into claimed_user_id;

  return claimed_user_id;
end;
$$;

revoke all on function public.claim_password_recovery_challenge(text, text)
  from public, anon, authenticated;
grant execute on function public.claim_password_recovery_challenge(text, text)
  to service_role;

create or replace function public.revoke_recovery_user_sessions(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer := 0;
begin
  delete from auth.sessions where user_id = p_user_id;
  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.revoke_recovery_user_sessions(uuid)
  from public, anon, authenticated;
grant execute on function public.revoke_recovery_user_sessions(uuid)
  to service_role;
