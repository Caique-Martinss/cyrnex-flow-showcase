-- Manual Pix deposit flow for the first commercial release.
-- The client pays directly to the barbershop Pix key, sends a private proof,
-- and authorized staff confirms or rejects the payment.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-proofs',
  'payment-proofs',
  false,
  5242880,
  array['image/jpeg','image/png','image/webp','application/pdf']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

alter table public.appointments
  add column if not exists deposit_paid_at timestamptz;

create table if not exists public.appointment_payment_proofs (
  id uuid primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  appointment_id uuid not null,
  amount_snapshot numeric(12,2) not null check (amount_snapshot > 0),
  storage_bucket text not null default 'payment-proofs',
  storage_path text not null,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp','application/pdf')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 5242880),
  status text not null default 'submitted' check (status in ('submitted','confirmed','rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (storage_bucket, storage_path),
  unique (business_id, id),
  constraint appointment_payment_proofs_appointment_fk
    foreign key (business_id, appointment_id)
    references public.appointments(business_id, id) on delete cascade,
  constraint appointment_payment_proofs_review_state_check check (
    (status = 'submitted' and reviewed_at is null and reviewed_by is null)
    or (status in ('confirmed','rejected') and reviewed_at is not null)
  )
);

create index if not exists appointment_payment_proofs_appointment_idx
  on public.appointment_payment_proofs(business_id, appointment_id, submitted_at desc);

create unique index if not exists appointment_payment_proofs_one_submitted_idx
  on public.appointment_payment_proofs(business_id, appointment_id)
  where status = 'submitted';

alter table public.appointment_payment_proofs enable row level security;
alter table public.appointment_payment_proofs force row level security;

drop policy if exists appointment_payment_proofs_staff_read on public.appointment_payment_proofs;
create policy appointment_payment_proofs_staff_read
on public.appointment_payment_proofs
for select to authenticated
using (
  app_private.has_business_role(
    business_id,
    array['owner','manager','receptionist']::public.member_role[]
  )
);

-- Clients never access the proof table or Storage directly. Uploads go through
-- the backend after validating the private booking-management token.
revoke all on table public.appointment_payment_proofs from public, anon;
grant select on table public.appointment_payment_proofs to authenticated;

-- Keep the bucket private. No anon/authenticated storage policies are created.
-- The server signs short-lived read URLs only for authorized staff.

create or replace function app_private.manual_pix_configured(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
set row_security = off
as $$
  select exists (
    select 1
    from public.business_settings s
    where s.business_id = p_business_id
      and coalesce((s.payment_preferences ->> 'usePixForDeposit')::boolean, false)
      and nullif(trim(coalesce(s.payment_preferences ->> 'pixKey', '')), '') is not null
      and nullif(trim(coalesce(s.payment_preferences ->> 'pixReceiverName', '')), '') is not null
      and exists (
        select 1
        from public.business_payment_methods pm
        where pm.business_id = p_business_id
          and pm.method = 'pix'
          and pm.active
      )
  );
$$;

-- A public booking must never be created or changed into a pending deposit
-- unless the business has a complete manual Pix configuration. This is a
-- database-level safety net in addition to the backend/onboarding checks.
create or replace function app_private.enforce_public_manual_pix_deposit()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
set row_security = off
as $$
begin
  if new.source = 'public'
    and new.deposit_status = 'pending'
    and coalesce(new.deposit_amount, 0) > 0
    and not app_private.manual_pix_configured(new.business_id) then
    raise exception 'O Pix manual precisa estar configurado antes de exigir sinal no agendamento público.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists appointments_public_manual_pix_guard on public.appointments;
create trigger appointments_public_manual_pix_guard
before insert or update of deposit_status, deposit_amount, source
on public.appointments
for each row execute function app_private.enforce_public_manual_pix_deposit();

-- Keep deposit receipt timestamps trustworthy even when authorized staff use
-- the generic Agenda deposit action instead of reviewing an uploaded proof.
create or replace function app_private.set_agenda_deposit_internal(
  p_business_id uuid,
  p_appointment_id uuid,
  p_deposit_status public.deposit_status
)
returns uuid
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, auth, app_private
set row_security = off
as $$
declare
  v_appointment record;
  v_previous public.deposit_status;
  v_actor_name text;
begin
  select * into v_appointment
  from public.appointments a
  where a.business_id = p_business_id and a.id = p_appointment_id
  for update;
  if not found then raise exception 'Agendamento não encontrado.' using errcode = 'P0002'; end if;

  if not app_private.has_business_role(
    p_business_id,
    array['owner','manager','receptionist']::public.member_role[]
  ) then
    raise exception 'Sem permissão para alterar o sinal.' using errcode = '42501';
  end if;

  v_previous := v_appointment.deposit_status;
  update public.appointments
  set deposit_status = p_deposit_status,
      deposit_paid_at = case
        when p_deposit_status = 'paid' then coalesce(deposit_paid_at, now())
        else null
      end
  where business_id = p_business_id and id = p_appointment_id;

  v_actor_name := app_private.agenda_actor_name(p_business_id);
  insert into public.audit_logs (
    business_id, action, entity_type, entity_id, actor_user_id, actor_name, metadata
  ) values (
    p_business_id, 'appointment.deposit_changed', 'appointment', p_appointment_id,
    auth.uid(), v_actor_name,
    jsonb_build_object('previousStatus', v_previous, 'depositStatus', p_deposit_status)
  );
  return p_appointment_id;
end;
$$;

-- Replaces the V11.6.1 launch guard: waitlist remains locked, but manual Pix
-- deposits are now allowed only when the Pix configuration is complete.
create or replace function app_private.enforce_launch_business_settings()
returns trigger
language plpgsql
set search_path = pg_catalog, public, app_private
as $$
begin
  new.allow_waitlist := false;
  if new.require_deposit then
    if not coalesce((new.payment_preferences ->> 'usePixForDeposit')::boolean, false)
      or nullif(trim(coalesce(new.payment_preferences ->> 'pixKey', '')), '') is null
      or nullif(trim(coalesce(new.payment_preferences ->> 'pixReceiverName', '')), '') is null then
      raise exception 'Para exigir sinal, configure o Pix manual e informe a chave e o recebedor.'
        using errcode = '23514';
    end if;
    if new.default_deposit_percent <= 0 or new.default_deposit_percent > 100 then
      raise exception 'O percentual padrão do sinal deve ficar entre 1 e 100.'
        using errcode = '23514';
    end if;
  else
    new.default_deposit_percent := 0;
  end if;
  return new;
end;
$$;

create or replace function app_private.record_public_payment_proof_internal(
  p_slug text,
  p_token_hash text,
  p_proof_id uuid,
  p_storage_path text,
  p_mime_type text,
  p_size_bytes bigint
)
returns uuid
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, auth, app_private
set row_security = off
as $$
declare
  v_access record;
  v_appointment public.appointments%rowtype;
  v_existing uuid;
begin
  select * into v_access
  from app_private.resolve_public_booking_access_internal(p_slug, p_token_hash);

  if not found then
    raise exception 'Agendamento não encontrado ou link expirado.' using errcode = 'P0002';
  end if;

  select * into v_appointment
  from public.appointments a
  where a.business_id = v_access.business_id
    and a.id = v_access.appointment_id
  for update;

  if not found then
    raise exception 'Agendamento não encontrado.' using errcode = 'P0002';
  end if;
  if v_appointment.status not in ('scheduled','confirmed') then
    raise exception 'Este agendamento não aceita mais comprovante de pagamento.' using errcode = 'P0003';
  end if;
  if v_appointment.deposit_status <> 'pending' or v_appointment.deposit_amount <= 0 then
    raise exception 'Este agendamento não possui sinal pendente.' using errcode = 'P0003';
  end if;
  if not app_private.manual_pix_configured(v_access.business_id) then
    raise exception 'O Pix para sinal não está configurado nesta barbearia.' using errcode = 'P0003';
  end if;
  if p_mime_type not in ('image/jpeg','image/png','image/webp','application/pdf') then
    raise exception 'Formato de comprovante não permitido.' using errcode = '22023';
  end if;
  if p_size_bytes <= 0 or p_size_bytes > 5242880 then
    raise exception 'O comprovante precisa ter no máximo 5 MB.' using errcode = '22023';
  end if;
  if p_storage_path is null or char_length(trim(p_storage_path)) < 10 then
    raise exception 'Caminho do comprovante inválido.' using errcode = '22023';
  end if;

  select id into v_existing
  from public.appointment_payment_proofs
  where business_id = v_access.business_id
    and appointment_id = v_access.appointment_id
    and status = 'submitted'
  limit 1;

  if v_existing is not null then
    raise exception 'Já existe um comprovante aguardando confirmação.' using errcode = 'P0003';
  end if;

  insert into public.appointment_payment_proofs (
    id,
    business_id,
    appointment_id,
    amount_snapshot,
    storage_bucket,
    storage_path,
    mime_type,
    size_bytes,
    status
  ) values (
    p_proof_id,
    v_access.business_id,
    v_access.appointment_id,
    v_appointment.deposit_amount,
    'payment-proofs',
    trim(p_storage_path),
    p_mime_type,
    p_size_bytes,
    'submitted'
  );

  insert into public.audit_logs (
    business_id,
    action,
    entity_type,
    entity_id,
    actor_user_id,
    actor_name,
    metadata
  ) values (
    v_access.business_id,
    'appointment.deposit_proof_submitted',
    'appointment',
    v_appointment.id,
    null,
    'Cliente — Página pública',
    jsonb_build_object(
      'proofId', p_proof_id,
      'amount', v_appointment.deposit_amount,
      'mimeType', p_mime_type,
      'sizeBytes', p_size_bytes
    )
  );

  return p_proof_id;
end;
$$;

create or replace function public.record_public_payment_proof(
  p_slug text,
  p_token_hash text,
  p_proof_id uuid,
  p_storage_path text,
  p_mime_type text,
  p_size_bytes bigint
)
returns uuid
language sql
volatile
security invoker
set search_path = pg_catalog, public, app_private
as $$
  select app_private.record_public_payment_proof_internal(
    p_slug,
    p_token_hash,
    p_proof_id,
    p_storage_path,
    p_mime_type,
    p_size_bytes
  );
$$;

create or replace function app_private.review_agenda_payment_proof_internal(
  p_business_id uuid,
  p_appointment_id uuid,
  p_proof_id uuid,
  p_action text,
  p_note text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, auth, app_private
set row_security = off
as $$
declare
  v_appointment public.appointments%rowtype;
  v_proof public.appointment_payment_proofs%rowtype;
  v_actor_name text;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_previous_status public.appointment_status;
begin
  if not app_private.has_business_role(
    p_business_id,
    array['owner','manager','receptionist']::public.member_role[]
  ) then
    raise exception 'Sem permissão para confirmar pagamentos.' using errcode = '42501';
  end if;

  if p_action not in ('confirm','reject') then
    raise exception 'Ação de pagamento inválida.' using errcode = '22023';
  end if;
  if char_length(coalesce(v_note, '')) > 500 then
    raise exception 'A observação precisa ter no máximo 500 caracteres.' using errcode = '22023';
  end if;

  select * into v_appointment
  from public.appointments a
  where a.business_id = p_business_id
    and a.id = p_appointment_id
  for update;

  if not found then
    raise exception 'Agendamento não encontrado.' using errcode = 'P0002';
  end if;

  select * into v_proof
  from public.appointment_payment_proofs p
  where p.business_id = p_business_id
    and p.appointment_id = p_appointment_id
    and p.id = p_proof_id
  for update;

  if not found then
    raise exception 'Comprovante não encontrado.' using errcode = 'P0002';
  end if;
  if v_proof.status <> 'submitted' then
    raise exception 'Este comprovante já foi revisado.' using errcode = 'P0003';
  end if;
  if v_appointment.deposit_status <> 'pending' then
    raise exception 'O sinal deste agendamento não está mais pendente.' using errcode = 'P0003';
  end if;

  v_actor_name := app_private.agenda_actor_name(p_business_id);

  if p_action = 'confirm' then
    update public.appointment_payment_proofs
    set status = 'confirmed',
        reviewed_at = now(),
        reviewed_by = auth.uid(),
        review_note = v_note,
        updated_at = now()
    where id = p_proof_id;

    v_previous_status := v_appointment.status;
    update public.appointments
    set deposit_status = 'paid',
        deposit_paid_at = now(),
        payment_method = 'pix',
        status = case when status = 'scheduled' then 'confirmed' else status end,
        confirmed_at = case
          when status = 'scheduled' then coalesce(confirmed_at, now())
          else confirmed_at
        end
    where business_id = p_business_id
      and id = p_appointment_id;

    if v_previous_status = 'scheduled' then
      insert into public.appointment_events (
        business_id,
        appointment_id,
        event_type,
        notes,
        actor_user_id,
        actor_name
      ) values (
        p_business_id,
        p_appointment_id,
        'confirmed',
        'Pagamento Pix confirmado manualmente.',
        auth.uid(),
        v_actor_name
      );
    end if;

    insert into public.audit_logs (
      business_id, action, entity_type, entity_id, actor_user_id, actor_name, metadata
    ) values (
      p_business_id,
      'appointment.deposit_proof_confirmed',
      'appointment',
      p_appointment_id,
      auth.uid(),
      v_actor_name,
      jsonb_build_object(
        'proofId', p_proof_id,
        'amount', v_proof.amount_snapshot,
        'previousDepositStatus', v_appointment.deposit_status,
        'previousAppointmentStatus', v_previous_status,
        'note', v_note
      )
    );
  else
    update public.appointment_payment_proofs
    set status = 'rejected',
        reviewed_at = now(),
        reviewed_by = auth.uid(),
        review_note = v_note,
        updated_at = now()
    where id = p_proof_id;

    insert into public.audit_logs (
      business_id, action, entity_type, entity_id, actor_user_id, actor_name, metadata
    ) values (
      p_business_id,
      'appointment.deposit_proof_rejected',
      'appointment',
      p_appointment_id,
      auth.uid(),
      v_actor_name,
      jsonb_build_object(
        'proofId', p_proof_id,
        'amount', v_proof.amount_snapshot,
        'note', v_note
      )
    );
  end if;

  return p_appointment_id;
end;
$$;

create or replace function public.review_agenda_payment_proof(
  p_business_id uuid,
  p_appointment_id uuid,
  p_proof_id uuid,
  p_action text,
  p_note text default null
)
returns uuid
language sql
volatile
security invoker
set search_path = pg_catalog, public, app_private
as $$
  select app_private.review_agenda_payment_proof_internal(
    p_business_id,
    p_appointment_id,
    p_proof_id,
    p_action,
    p_note
  );
$$;

revoke all on function app_private.manual_pix_configured(uuid) from public, anon, authenticated;
revoke all on function app_private.enforce_public_manual_pix_deposit() from public, anon, authenticated;
revoke all on function app_private.record_public_payment_proof_internal(
  text,text,uuid,text,text,bigint
) from public, anon, authenticated;
revoke all on function app_private.review_agenda_payment_proof_internal(
  uuid,uuid,uuid,text,text
) from public, anon, authenticated;
revoke all on function public.record_public_payment_proof(
  text,text,uuid,text,text,bigint
) from public, anon, authenticated;
revoke all on function public.review_agenda_payment_proof(uuid,uuid,uuid,text,text) from public, anon;

grant execute on function public.record_public_payment_proof(text,text,uuid,text,text,bigint) to service_role;
grant execute on function public.review_agenda_payment_proof(uuid,uuid,uuid,text,text) to authenticated, service_role;
