-- CYRNEX platform observability + controlled hard deletion.
-- Prepared locally. Review before applying to any remote Supabase project.
-- This migration is backend/service_role only and does not expose platform controls to tenants.

create table if not exists public.platform_system_logs (
  id uuid primary key default gen_random_uuid(),
  severity text not null check (severity in ('debug','info','warn','error','critical')),
  category text not null,
  source text not null,
  message text not null,
  business_id uuid references public.businesses(id) on delete set null,
  request_id text,
  route text,
  http_status integer check (http_status is null or http_status between 100 and 599),
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.platform_deletion_receipts (
  id uuid primary key default gen_random_uuid(),
  business_id_original uuid not null,
  business_name text not null,
  business_slug text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  reason text not null,
  storage_cleanup jsonb not null default '{}'::jsonb,
  deleted_at timestamptz not null default now()
);

create index if not exists platform_system_logs_created_idx
  on public.platform_system_logs(created_at desc);
create index if not exists platform_system_logs_severity_idx
  on public.platform_system_logs(severity, created_at desc);
create index if not exists platform_system_logs_category_idx
  on public.platform_system_logs(category, created_at desc);
create index if not exists platform_system_logs_business_idx
  on public.platform_system_logs(business_id, created_at desc);
create index if not exists platform_deletion_receipts_deleted_idx
  on public.platform_deletion_receipts(deleted_at desc);

alter table public.platform_system_logs enable row level security;
alter table public.platform_system_logs force row level security;
alter table public.platform_deletion_receipts enable row level security;
alter table public.platform_deletion_receipts force row level security;

revoke all on table public.platform_system_logs from public, anon, authenticated;
revoke all on table public.platform_deletion_receipts from public, anon, authenticated;

grant select, insert, delete on table public.platform_system_logs to service_role;
grant select, insert, update on table public.platform_deletion_receipts to service_role;

-- The database part of destructive deletion is atomic. The backend calls this RPC first,
-- then performs best-effort Storage cleanup because Supabase Storage is outside the PostgreSQL transaction.
-- The confirmation phrase and the actor's platform role are checked again here as defense in depth.
create or replace function public.platform_hard_delete_business(
  p_business_id uuid,
  p_actor_user_id uuid,
  p_reason text,
  p_confirmation text,
  p_storage_cleanup jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
set row_security = off
as $$
declare
  v_name text;
  v_slug text;
  v_expected text;
  v_receipt_id uuid;
begin
  if p_actor_user_id is null then
    raise exception 'Administrador inválido.' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = p_actor_user_id
      and pa.role = 'super_admin'
      and pa.active = true
  ) then
    raise exception 'Somente Super Admin pode excluir uma empresa definitivamente.' using errcode = '42501';
  end if;

  if length(trim(coalesce(p_reason, ''))) < 5 then
    raise exception 'Informe um motivo com pelo menos 5 caracteres.' using errcode = '22023';
  end if;

  select b.name, b.slug
    into v_name, v_slug
  from public.businesses b
  where b.id = p_business_id
  for update;

  if not found then
    raise exception 'Empresa não encontrada.' using errcode = 'P0002';
  end if;

  v_expected := 'EXCLUIR ' || v_slug;
  if upper(trim(coalesce(p_confirmation, ''))) <> upper(v_expected) then
    raise exception 'Confirmação de exclusão inválida.' using errcode = '22023';
  end if;

  insert into public.platform_deletion_receipts (
    business_id_original,
    business_name,
    business_slug,
    actor_user_id,
    reason,
    storage_cleanup
  ) values (
    p_business_id,
    v_name,
    v_slug,
    p_actor_user_id,
    trim(p_reason),
    coalesce(p_storage_cleanup, '{}'::jsonb)
  )
  returning id into v_receipt_id;

  -- Keep an audit trail. business_id becomes null through ON DELETE SET NULL,
  -- while metadata preserves the tenant identity and the reason.
  insert into public.platform_audit_logs (
    actor_user_id,
    business_id,
    action,
    metadata
  ) values (
    p_actor_user_id,
    p_business_id,
    'business.hard_delete',
    jsonb_build_object(
      'businessId', p_business_id,
      'businessName', v_name,
      'businessSlug', v_slug,
      'reason', trim(p_reason),
      'receiptId', v_receipt_id,
      'storageCleanup', coalesce(p_storage_cleanup, '{}'::jsonb)
    )
  );

  -- Tenant tables use ON DELETE CASCADE directly or through their parent tenant records.
  delete from public.businesses where id = p_business_id;

  insert into public.platform_system_logs (
    severity,
    category,
    source,
    message,
    metadata
  ) values (
    'critical',
    'tenant_deletion',
    'platform_admin',
    'Empresa excluída definitivamente pelo CYRNEX Admin.',
    jsonb_build_object(
      'businessId', p_business_id,
      'businessName', v_name,
      'businessSlug', v_slug,
      'actorUserId', p_actor_user_id,
      'receiptId', v_receipt_id
    )
  );

  return jsonb_build_object(
    'deleted', true,
    'businessId', p_business_id,
    'businessName', v_name,
    'businessSlug', v_slug,
    'receiptId', v_receipt_id,
    'deletedAt', now()
  );
end;
$$;

revoke all on function public.platform_hard_delete_business(uuid, uuid, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.platform_hard_delete_business(uuid, uuid, text, text, jsonb)
  to service_role;
