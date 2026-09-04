-- Execute manual e deliberadamente no SQL Editor depois da migration do CYRNEX Admin.
-- NÃO coloque seu e-mail real neste arquivo versionado.

insert into public.platform_admins (user_id, role)
select id, 'super_admin'
from auth.users
where lower(email) = lower('SEU_EMAIL_DE_ADMIN')
on conflict (user_id) do update
set role = excluded.role,
    active = true,
    updated_at = now();
