import { randomUUID } from 'node:crypto';
import type {
  Appointment,
  AppointmentStatus,
  AppointmentTimelineEventType,
  Client,
  Database,
  HydratedAppointment,
  PaymentMethod
} from '../../domain/types.js';
import { roundMoney } from '../../utils/money.js';

export function hydrateAppointment(
  database: Database,
  appointment: Appointment
): HydratedAppointment {
  const recurrencePaused = appointment.recurrenceId
    ? database.recurrenceSeries.find(item => item.id === appointment.recurrenceId)?.paused ?? false
    : false;
  return {
    ...appointment,
    recurrencePaused,
    client: database.clients.find(client => client.id === appointment.clientId) ?? null,
    service: database.services.find(service => service.id === appointment.serviceId) ?? null,
    professional: database.professionals.find(
      professional => professional.id === appointment.professionalId
    ) ?? null
  };
}

export function findScheduleConflict(
  database: Pick<Database, 'appointments' | 'services'>,
  professionalId: string,
  date: Date,
  durationMinutes: number,
  bufferAfterMinutes = 0,
  ignoredAppointmentId?: string | string[]
): Appointment | null {
  const start = date.getTime();
  const end = start + (durationMinutes + bufferAfterMinutes) * 60_000;

  const ignoredIds = new Set(Array.isArray(ignoredAppointmentId)
    ? ignoredAppointmentId
    : ignoredAppointmentId ? [ignoredAppointmentId] : []);

  return database.appointments.find(appointment => {
    if (
      ignoredIds.has(appointment.id) ||
      appointment.professionalId !== professionalId
    ) {
      return false;
    }

    if (
      appointment.status === 'cancelled' ||
      appointment.status === 'missed' ||
      appointment.recurrencePaused
    ) {
      return false;
    }

    const existingBuffer = appointment.bufferAfterMinutes ?? 0;
    const existingStart = new Date(appointment.date).getTime();
    const existingEnd = existingStart +
      (appointment.durationMinutes + existingBuffer) * 60_000;

    return start < existingEnd && end > existingStart;
  }) ?? null;
}

export function hasScheduleConflict(
  database: Pick<Database, 'appointments' | 'services'>,
  professionalId: string,
  date: Date,
  durationMinutes: number,
  bufferAfterMinutes = 0,
  ignoredAppointmentId?: string | string[]
): boolean {
  return Boolean(findScheduleConflict(
    database,
    professionalId,
    date,
    durationMinutes,
    bufferAfterMinutes,
    ignoredAppointmentId
  ));
}

export function appendAppointmentTimeline(
  appointment: Appointment,
  type: AppointmentTimelineEventType,
  input: {
    actorUserId?: string | null;
    actorName?: string | null;
    note?: string | null;
    at?: Date;
  } = {}
): void {
  appointment.timeline.push({
    id: randomUUID(),
    type,
    at: (input.at ?? new Date()).toISOString(),
    actorUserId: input.actorUserId ?? null,
    actorName: input.actorName ?? null,
    note: input.note ?? null
  });
}

export function applyAppointmentCompletion(
  database: Database,
  appointment: Appointment,
  paymentMethod: PaymentMethod,
  cardFee: number,
  completedAt = new Date()
): void {
  const previousStatus = appointment.status;
  const commissionPercent = appointment.commissionPercentSnapshot ?? 0;

  appointment.paymentMethod = paymentMethod;
  appointment.cardFee = cardFee;
  appointment.commissionAmount = roundMoney(
    appointment.price * commissionPercent / 100
  );
  appointment.netAmount = roundMoney(
    appointment.price - appointment.cardFee - appointment.commissionAmount
  );
  appointment.completedAt = completedAt.toISOString();
  appointment.status = 'completed';

  const client = database.clients.find(item => item.id === appointment.clientId);
  updateClientAfterStatusChange(client, appointment, previousStatus, 'completed');
}

export function updateClientAfterStatusChange(
  client: Client | undefined,
  appointment: Appointment,
  previousStatus: AppointmentStatus,
  nextStatus: AppointmentStatus
): void {
  if (!client) return;

  if (previousStatus !== 'completed' && nextStatus === 'completed') {
    client.totalSpend = roundMoney(client.totalSpend + appointment.price);
    client.appointments += 1;
    client.lastVisit = appointment.date.slice(0, 10);
  }

  if (previousStatus === 'completed' && nextStatus !== 'completed') {
    client.totalSpend = Math.max(0, roundMoney(client.totalSpend - appointment.price));
    client.appointments = Math.max(0, client.appointments - 1);
  }
}
