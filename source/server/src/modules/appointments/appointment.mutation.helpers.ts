import type {
  Appointment,
  AppointmentStatus,
  Database,
  Service
} from '../../domain/types.js';
import { normalizeMoney, normalizeOptionalText } from '../../utils/normalizers.js';
import {
  appendAppointmentTimeline
} from './appointment.service.js';
import { professionalCanPerform } from './appointment.validation.js';

export function applyOperationalStatus(
  appointment: Appointment,
  status: AppointmentStatus,
  body: Record<string, unknown>,
  actorUserId: string,
  actorName: string
): Record<string, unknown> | null {
  const now = new Date();
  if (status === 'in_service') {
    const scheduledAt = new Date(appointment.date);
    if (scheduledAt > now && body.confirmEarlyStart !== true) {
      return {
        error: 'O cliente será atendido antes do horário programado. ' +
          'Confirme o início antecipado para continuar.',
        requiresEarlyStartConfirmation: true
      };
    }
    appointment.actualStartedAt = now.toISOString();
    appendAppointmentTimeline(appointment, 'started', {
      actorUserId,
      actorName,
      note: scheduledAt > now ? 'Início antecipado confirmado.' : null
    });
  } else if (status === 'confirmed') {
    appointment.confirmedAt = now.toISOString();
    appendAppointmentTimeline(appointment, 'confirmed', {
      actorUserId,
      actorName
    });
  } else if (status === 'arrived') {
    appointment.arrivedAt = now.toISOString();
    appendAppointmentTimeline(appointment, 'arrived', {
      actorUserId,
      actorName
    });
  } else if (status === 'cancelled') {
    appointment.cancelledAt = now.toISOString();
    appendAppointmentTimeline(appointment, 'cancelled', {
      actorUserId,
      actorName,
      note: normalizeOptionalText(body.reason)
    });
  } else if (status === 'missed') {
    if (new Date(appointment.date).getTime() > now.getTime()) {
      return {
        error: 'Ainda não chegou o horário desse atendimento. ' +
          'Só marque como não compareceu depois do horário programado.'
      };
    }
    appointment.missedAt = now.toISOString();
    appendAppointmentTimeline(appointment, 'missed', {
      actorUserId,
      actorName
    });
  }
  return null;
}

export function validateStatusTransition(
  previous: AppointmentStatus,
  next: AppointmentStatus
): string | null {
  if (previous === next) return 'Esse atendimento já está nesse status.';
  if (['completed', 'cancelled', 'missed'].includes(previous)) {
    return 'Esse atendimento já foi encerrado e não pode avançar para outro status.';
  }
  const allowed: Partial<Record<AppointmentStatus, AppointmentStatus[]>> = {
    scheduled: ['confirmed', 'arrived', 'in_service', 'cancelled', 'missed'],
    confirmed: ['arrived', 'in_service', 'cancelled', 'missed'],
    arrived: ['in_service', 'cancelled', 'missed'],
    in_service: ['completed', 'cancelled']
  };
  if (!allowed[previous]?.includes(next)) {
    if (next === 'completed') {
      return 'Antes de concluir, use “Iniciar atendimento”. ' +
        'Isso registra o horário real de início.';
    }
    return 'Essa mudança não faz parte do fluxo operacional deste atendimento.';
  }
  return null;
}

export function applyCompletionOverrides(
  database: Database,
  appointment: Appointment,
  body: Record<string, unknown>
): string | null {
  const serviceId = normalizeOptionalText(body.serviceId);
  if (serviceId && serviceId !== appointment.serviceId) {
    const service = database.services.find(
      item => item.id === serviceId && item.active
    );
    if (!service) return 'O serviço informado na conclusão não está disponível.';
    if (!professionalCanPerform(service, appointment.professionalId)) {
      return 'O profissional deste atendimento não está habilitado ' +
        'para o serviço informado.';
    }
    applyServiceOverride(appointment, service);
  }
  if (body.price !== undefined) {
    const price = normalizeMoney(body.price);
    if (Number.isNaN(price) || price < 0) {
      return 'Informe um valor final válido.';
    }
    appointment.price = price;
  }
  if (body.notes !== undefined) {
    appointment.notes = normalizeOptionalText(body.notes);
  }
  return null;
}

function applyServiceOverride(
  appointment: Appointment,
  service: Service
): void {
  appointment.serviceId = service.id;
  appointment.serviceName = service.name;
  appointment.durationMinutes = service.durationMinutes;
  appointment.bufferAfterMinutes = service.bufferAfterMinutes;
}

export function getRecurrenceTargets(
  appointments: Appointment[],
  selected: Appointment,
  scope: string
): Appointment[] {
  if (!selected.recurrenceId || scope === 'this') return [selected];
  const selectedTime = new Date(selected.date).getTime();
  return appointments.filter(item => {
    if (item.recurrenceId !== selected.recurrenceId) return false;
    if (['completed', 'cancelled', 'missed'].includes(item.status)) return false;
    if (scope === 'future') {
      return new Date(item.date).getTime() >= selectedTime;
    }
    return true;
  });
}
