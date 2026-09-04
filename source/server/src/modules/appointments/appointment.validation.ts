import type { Appointment, RecurrenceFrequency, Service } from '../../domain/types.js';
import { readDatabase } from '../../database/index.js';
import { getDateTextInTimeZone } from '../../utils/timezone.js';
import {
  getBookingWindowViolation,
  hasScheduleBlockConflict,
  isInsideProfessionalSchedule
} from '../scheduling/schedule.service.js';
import { findScheduleConflict } from './appointment.service.js';
import type { RecurrenceRequest } from './recurrence.service.js';

const allowedRecurrenceFrequencies: RecurrenceFrequency[] = [
  'weekly',
  'biweekly',
  'monthly',
  'custom'
];

export function validateAppointmentTime(
  database: Awaited<ReturnType<typeof readDatabase>>,
  professionalId: string,
  durationMinutes: number,
  bufferAfterMinutes: number,
  date: Date,
  ignoredAppointmentId?: string | string[]
): {
  status: number;
  message: string;
  kind?: 'conflict';
  conflict?: Appointment;
} | null {
  const dateText = getDateTextInTimeZone(date, database.settings.timezone);
  const bookingViolation = getBookingWindowViolation(
    database.settings,
    date,
    dateText
  );
  if (bookingViolation) return { status: 409, message: bookingViolation };

  const professional = database.professionals.find(item => item.id === professionalId);
  if (!professional) {
    return { status: 404, message: 'Profissional não encontrado.' };
  }

  if (!isInsideProfessionalSchedule(
    database.settings,
    professional,
    date,
    durationMinutes,
    bufferAfterMinutes
  )) {
    return {
      status: 409,
      message: 'O serviço não cabe por completo no expediente da barbearia e do profissional.'
    };
  }

  const reservedEnd = new Date(
    date.getTime() + (durationMinutes + bufferAfterMinutes) * 60_000
  );
  const block = hasScheduleBlockConflict(
    database,
    professionalId,
    date,
    reservedEnd
  );
  if (block) {
    return {
      status: 409,
      message: `Esse período está bloqueado: ${block.reason}. Escolha outro horário.`
    };
  }

  const conflict = findScheduleConflict(
    database,
    professionalId,
    date,
    durationMinutes,
    bufferAfterMinutes,
    ignoredAppointmentId
  );
  if (conflict) {
    return {
      status: 409,
      message: 'Esse profissional já possui um atendimento nesse período.',
      kind: 'conflict',
      conflict
    };
  }
  return null;
}

export function professionalCanPerform(
  service: Service,
  professionalId: string
): boolean {
  return !service.professionalIds.length ||
    service.professionalIds.includes(professionalId);
}

export function validateRecurrenceRequest(
  input: RecurrenceRequest
): string | null {
  if (!allowedRecurrenceFrequencies.includes(input.frequency)) {
    return 'Escolha uma frequência de recorrência válida.';
  }
  if (input.count !== undefined && (input.count < 2 || input.count > 52)) {
    return 'A recorrência deve gerar entre 2 e 52 atendimentos.';
  }
  if (input.frequency === 'custom' && (input.intervalWeeks ?? 1) < 1) {
    return 'O intervalo personalizado precisa ser de pelo menos uma semana.';
  }
  return null;
}

export function formatDateTime(date: Date, timeZone: string): string {
  return date.toLocaleString('pt-BR', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}
