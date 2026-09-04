import type { Database, Professional, Service } from '../../domain/types.js';
import { formatClock } from '../../utils/time.js';
import { zonedDateTimeToUtc } from '../../utils/timezone.js';
import { hasScheduleConflict } from '../appointments/appointment.service.js';
import {
  getBookingWindowViolation,
  getEffectiveScheduleSegments,
  hasScheduleBlockConflict
} from './schedule.service.js';

export type AvailabilityStatus = 'available' | 'occupied' | 'past' | 'blocked';

export interface AvailabilitySlot {
  start: string;
  end: string;
  label: string;
  status: AvailabilityStatus;
  reason: string | null;
}

export interface AvailabilityResult {
  date: string;
  closed: boolean;
  slots: AvailabilitySlot[];
  businessHours: Database['settings']['businessHours'];
}

export function buildAvailability(
  database: Database,
  service: Service,
  professional: Professional,
  dateText: string,
  options: {
    now?: Date;
    ignoredAppointmentId?: string;
  } = {}
): AvailabilityResult {
  const now = options.now ?? new Date();
  const segments = getEffectiveScheduleSegments(
    database.settings,
    professional,
    dateText
  );

  if (!segments.length) {
    return {
      date: dateText,
      closed: true,
      slots: [],
      businessHours: database.settings.businessHours
    };
  }

  const interval = Math.max(
    5,
    database.settings.businessHours.slotIntervalMinutes || 30
  );
  const occupiedMinutes = service.durationMinutes + service.bufferAfterMinutes;
  const slots: AvailabilitySlot[] = [];

  for (const segment of segments) {
    for (
      let minutes = segment.startMinutes;
      minutes + occupiedMinutes <= segment.endMinutes;
      minutes += interval
    ) {
      const start = zonedDateTimeToUtc(
        dateText,
        minutes,
        database.settings.timezone
      );
      if (!start) continue;

      const end = new Date(start.getTime() + service.durationMinutes * 60_000);
      const reservedEnd = new Date(
        start.getTime() + occupiedMinutes * 60_000
      );
      const bookingViolation = getBookingWindowViolation(
        database.settings,
        start,
        dateText,
        now
      );
      const blocked = hasScheduleBlockConflict(
        database,
        professional.id,
        start,
        reservedEnd
      );
      const occupied = hasScheduleConflict(
        database,
        professional.id,
        start,
        service.durationMinutes,
        service.bufferAfterMinutes,
        options.ignoredAppointmentId
      );

      const status: AvailabilityStatus = bookingViolation
        ? 'past'
        : blocked
          ? 'blocked'
          : occupied
            ? 'occupied'
            : 'available';

      slots.push({
        start: start.toISOString(),
        end: end.toISOString(),
        label: formatClock(minutes),
        status,
        reason: bookingViolation ?? getUnavailableReason(
          status,
          blocked?.reason ?? null
        )
      });
    }
  }

  return {
    date: dateText,
    closed: false,
    slots,
    businessHours: database.settings.businessHours
  };
}

function getUnavailableReason(
  status: AvailabilityStatus,
  blockReason: string | null
): string | null {
  if (status === 'available') return null;
  if (status === 'occupied') return 'Já existe atendimento nesse período.';
  if (status === 'blocked') return blockReason || 'Horário bloqueado pela barbearia.';

  return 'Esse horário não está disponível.';
}
