import type {
  Appointment,
  AppointmentSource,
  AppointmentStatus,
  AppointmentTimelineEvent,
  Client,
  DepositStatus,
  PaymentMethod,
  Professional,
  RecurrenceSeries,
  Service
} from '../../domain/types.js';

export interface AppointmentRow {
  id: string;
  client_id: string | null;
  service_id: string;
  professional_id: string;
  service_name_snapshot: string;
  professional_name_snapshot: string;
  duration_minutes_snapshot: number;
  buffer_after_minutes_snapshot: number;
  commission_percent_snapshot: number | string;
  starts_at: string;
  status: AppointmentStatus;
  base_price: number | string;
  deposit_percent: number | string;
  deposit_amount: number | string;
  deposit_status: DepositStatus;
  deposit_paid_at: string | null;
  payment_method: PaymentMethod | null;
  card_fee: number | string;
  commission_amount: number | string;
  net_amount: number | string;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
  confirmed_at: string | null;
  arrived_at: string | null;
  actual_started_at: string | null;
  cancelled_at: string | null;
  missed_at: string | null;
  rescheduled_at: string | null;
  is_fit_in: boolean;
  fit_in_conflict_appointment_id: string | null;
  fit_in_reason: string | null;
  recurrence_series_id: string | null;
  recurrence_sequence_number: number | null;
  recurrence_paused: boolean;
  source: AppointmentSource;
  created_by: string | null;
}

export interface EventRow {
  id: string;
  appointment_id: string;
  event_type: AppointmentTimelineEvent['type'];
  created_at: string;
  actor_user_id: string | null;
  actor_name: string | null;
  notes: string | null;
}

export interface ClientBriefRow {
  id: string;
  full_name: string;
  phone_raw: string | null;
  email: string | null;
  created_at: string;
}

export interface RecurrenceRow {
  id: string;
  client_id: string;
  professional_id: string;
  service_ids: string[];
  frequency: RecurrenceSeries['frequency'];
  interval_weeks: number;
  weekdays: number[];
  starts_at: string;
  ends_at: string;
  status: 'active' | 'paused' | 'ended' | 'cancelled';
  created_at: string;
  created_by: string | null;
}

export const appointmentSelect = [
  'id,client_id,service_id,professional_id,service_name_snapshot,professional_name_snapshot',
  'duration_minutes_snapshot,buffer_after_minutes_snapshot,commission_percent_snapshot',
  'starts_at,status,base_price,deposit_percent,deposit_amount,deposit_status,deposit_paid_at,payment_method',
  'card_fee,commission_amount,net_amount,notes,created_at,completed_at,confirmed_at,arrived_at',
  'actual_started_at,cancelled_at,missed_at,rescheduled_at,is_fit_in,fit_in_conflict_appointment_id',
  'fit_in_reason,recurrence_series_id,recurrence_sequence_number,recurrence_paused,source,created_by'
].join(',');

export function mapProductionAppointment(
  row: AppointmentRow,
  timeline: AppointmentTimelineEvent[],
  client: Client | null,
  service: Service | null,
  professional: Professional | null
) {
  const appointment: Appointment = {
    id: row.id,
    clientId: row.client_id ?? '',
    serviceId: row.service_id,
    professionalId: row.professional_id,
    serviceName: row.service_name_snapshot,
    professionalName: row.professional_name_snapshot,
    durationMinutes: row.duration_minutes_snapshot,
    bufferAfterMinutes: row.buffer_after_minutes_snapshot,
    commissionPercentSnapshot: Number(row.commission_percent_snapshot),
    date: row.starts_at,
    status: row.status,
    price: Number(row.base_price),
    depositPercent: Number(row.deposit_percent),
    depositAmount: Number(row.deposit_amount),
    depositStatus: row.deposit_status,
    depositPaidAt: row.deposit_paid_at,
    paymentMethod: row.payment_method,
    cardFee: Number(row.card_fee),
    commissionAmount: Number(row.commission_amount),
    netAmount: Number(row.net_amount),
    notes: row.notes,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    confirmedAt: row.confirmed_at,
    arrivedAt: row.arrived_at,
    actualStartedAt: row.actual_started_at,
    cancelledAt: row.cancelled_at,
    missedAt: row.missed_at,
    rescheduledAt: row.rescheduled_at,
    isFitIn: row.is_fit_in,
    fitInConflictAppointmentId: row.fit_in_conflict_appointment_id,
    fitInReason: row.fit_in_reason,
    recurrenceId: row.recurrence_series_id,
    recurrenceIndex: row.recurrence_sequence_number,
    recurrencePaused: row.recurrence_paused,
    timeline,
    source: row.source,
    registeredAt: row.source === 'retroactive' ? row.created_at : null,
    registeredByUserId: row.created_by
  };
  return { ...appointment, client, service, professional };
}

export function groupProductionEvents(rows: EventRow[]) {
  const grouped = new Map<string, AppointmentTimelineEvent[]>();
  for (const row of rows) {
    const items = grouped.get(row.appointment_id) ?? [];
    items.push({
      id: row.id,
      type: row.event_type,
      at: row.created_at,
      actorUserId: row.actor_user_id,
      actorName: row.actor_name,
      note: row.notes
    });
    grouped.set(row.appointment_id, items);
  }
  return grouped;
}

export function mapProductionClientBrief(row: ClientBriefRow): Client {
  return {
    id: row.id,
    name: row.full_name,
    phone: row.phone_raw ?? '',
    email: row.email,
    lastVisit: null,
    totalSpend: 0,
    appointments: 0,
    createdAt: row.created_at
  };
}

export function mapProductionRecurrence(row: RecurrenceRow): RecurrenceSeries {
  return {
    id: row.id,
    clientId: row.client_id,
    professionalId: row.professional_id,
    serviceIds: row.service_ids,
    frequency: row.frequency,
    intervalWeeks: row.interval_weeks,
    weekdays: row.weekdays,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    paused: row.status === 'paused',
    createdAt: row.created_at,
    createdByUserId: row.created_by
  };
}
