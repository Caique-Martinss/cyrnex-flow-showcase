-- Agenda v0.10.0: controlled retroactive service registration.

alter type public.booking_source add value if not exists 'retroactive';

create type public.retroactive_request_status as enum (
  'pending',
  'approved',
  'rejected'
);

create type public.retroactive_proof_type as enum (
  'payment_record',
  'receipt',
  'client_confirmation',
  'other'
);

create table public.retroactive_service_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_id uuid not null,
  service_id uuid not null,
  professional_id uuid not null,
  starts_at timestamptz not null,
  price numeric(12,2) not null check (price >= 0),
  payment_method public.payment_method not null,
  notes text,
  reason text not null check (char_length(trim(reason)) >= 5),
  proof_type public.retroactive_proof_type not null,
  proof_reference text not null
    check (char_length(trim(proof_reference)) >= 3),
  proof_description text not null
    check (char_length(trim(proof_description)) >= 5),
  evidence_confirmed boolean not null default false,
  status public.retroactive_request_status not null default 'pending',
  requested_by uuid not null references auth.users(id) on delete restrict,
  requested_role public.member_role not null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_appointment_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  constraint retroactive_requests_client_fk
    foreign key (business_id, client_id)
    references public.clients (business_id, id)
    on delete restrict,
  constraint retroactive_requests_service_fk
    foreign key (business_id, service_id)
    references public.services (business_id, id)
    on delete restrict,
  constraint retroactive_requests_professional_fk
    foreign key (business_id, professional_id)
    references public.professionals (business_id, id)
    on delete restrict,
  constraint retroactive_requests_appointment_fk
    foreign key (business_id, created_appointment_id)
    references public.appointments (business_id, id)
    on delete set null (created_appointment_id),
  constraint retroactive_requests_review_state_check check (
    (status = 'pending' and reviewed_at is null and not evidence_confirmed)
    or (status = 'rejected' and reviewed_at is not null and not evidence_confirmed)
    or (status = 'approved' and reviewed_at is not null and evidence_confirmed)
  )
);

create index retroactive_requests_review_idx
  on public.retroactive_service_requests (business_id, status, created_at desc);

create index retroactive_requests_requester_idx
  on public.retroactive_service_requests (business_id, requested_by, created_at desc);

create trigger retroactive_service_requests_set_updated_at
before update on public.retroactive_service_requests
for each row execute function public.set_updated_at();

alter table public.retroactive_service_requests enable row level security;

create policy retroactive_requests_member_read
on public.retroactive_service_requests
for select
to authenticated
using (app_private.is_business_member(business_id));

create policy retroactive_requests_staff_insert
on public.retroactive_service_requests
for insert
to authenticated
with check (
  requested_by = (select auth.uid())
  and status = 'pending'
  and app_private.has_business_role(
    business_id,
    array[
      'owner',
      'manager',
      'professional',
      'receptionist'
    ]::public.member_role[]
  )
);

create policy retroactive_requests_manager_review
on public.retroactive_service_requests
for update
to authenticated
using (
  app_private.has_business_role(
    business_id,
    array['owner']::public.member_role[]
  )
  or (
    app_private.has_business_role(
      business_id,
      array['manager']::public.member_role[]
    )
    and requested_by <> (select auth.uid())
    and requested_role in ('professional', 'receptionist')
  )
)
with check (
  app_private.has_business_role(
    business_id,
    array['owner']::public.member_role[]
  )
  or (
    app_private.has_business_role(
      business_id,
      array['manager']::public.member_role[]
    )
    and requested_by <> (select auth.uid())
    and requested_role in ('professional', 'receptionist')
  )
);

create policy retroactive_requests_manager_delete
on public.retroactive_service_requests
for delete
to authenticated
using (
  app_private.has_business_role(
    business_id,
    array['owner', 'manager']::public.member_role[]
  )
);
