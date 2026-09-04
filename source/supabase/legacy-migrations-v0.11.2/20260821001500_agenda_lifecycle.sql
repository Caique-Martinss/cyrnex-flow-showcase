-- Agenda v0.11.0: lifecycle, fit-ins, recurrence refinements and retroactive-conflict audit.
-- Keeps the original schema compatible while adding the operational states used by the app.

alter type public.appointment_status add value if not exists 'scheduled';
alter type public.appointment_status add value if not exists 'arrived';
alter type public.appointment_status add value if not exists 'in_service';
alter type public.appointment_status add value if not exists 'missed';
alter type public.booking_source add value if not exists 'fit_in';
alter type public.recurrence_frequency add value if not exists 'biweekly';
alter type public.recurrence_frequency add value if not exists 'custom';

alter type public.appointment_event_type add value if not exists 'confirmed';
alter type public.appointment_event_type add value if not exists 'arrived';
alter type public.appointment_event_type add value if not exists 'started';
alter type public.appointment_event_type add value if not exists 'fit_in_confirmed';

alter table public.appointments
  add column if not exists confirmed_at timestamptz,
  add column if not exists arrived_at timestamptz,
  add column if not exists actual_started_at timestamptz,
  add column if not exists rescheduled_at timestamptz,
  add column if not exists is_fit_in boolean not null default false,
  add column if not exists fit_in_conflict_appointment_id uuid,
  add column if not exists fit_in_reason text;

alter table public.appointments
  drop constraint if exists appointments_fit_in_conflict_fk;
alter table public.appointments
  add constraint appointments_fit_in_conflict_fk
  foreign key (business_id, fit_in_conflict_appointment_id)
  references public.appointments (business_id, id)
  on delete set null (fit_in_conflict_appointment_id);

alter table public.recurrence_series
  add column if not exists weekdays smallint[] not null default '{}'::smallint[],
  add column if not exists service_ids uuid[] not null default '{}'::uuid[];

alter table public.retroactive_service_requests
  add column if not exists conflict_appointment_id uuid,
  add column if not exists conflict_confirmed boolean not null default false,
  add column if not exists conflict_justification text;

alter table public.retroactive_service_requests
  drop constraint if exists retroactive_requests_conflict_appointment_fk;
alter table public.retroactive_service_requests
  add constraint retroactive_requests_conflict_appointment_fk
  foreign key (business_id, conflict_appointment_id)
  references public.appointments (business_id, id)
  on delete set null (conflict_appointment_id);

alter table public.retroactive_service_requests
  drop constraint if exists retroactive_requests_conflict_confirmation_check;
alter table public.retroactive_service_requests
  add constraint retroactive_requests_conflict_confirmation_check check (
    conflict_appointment_id is null
    or not conflict_confirmed
    or char_length(trim(coalesce(conflict_justification, ''))) >= 5
  );

create index if not exists appointments_operational_status_idx
  on public.appointments (business_id, professional_id, status, starts_at);
create index if not exists retroactive_requests_conflict_idx
  on public.retroactive_service_requests (business_id, conflict_appointment_id)
  where conflict_appointment_id is not null;
