-- Identidade amigável para login por nome de usuário.
-- A senha continua pertencendo ao Supabase Auth; esta tabela guarda somente o
-- nome curto usado pelo CYRNEX FLOW para localizar a conta.

create table public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  display_name text not null check (char_length(trim(display_name)) between 2 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_profiles_username_format_check
    check (username ~ '^[a-z0-9._-]{3,32}$')
);

create unique index user_profiles_username_unique_idx
  on public.user_profiles (lower(username));

create trigger user_profiles_set_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

alter table public.user_profiles enable row level security;

create policy user_profiles_own_read
on public.user_profiles
for select
to authenticated
using (user_id = auth.uid());

create policy user_profiles_own_update
on public.user_profiles
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

comment on table public.user_profiles is
  'Perfil global do usuário. O cargo e a empresa ficam em business_members.';

comment on column public.user_profiles.username is
  'Nome curto e único usado no login diário do CYRNEX FLOW.';
