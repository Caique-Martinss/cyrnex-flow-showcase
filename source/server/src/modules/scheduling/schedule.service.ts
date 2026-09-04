import type {
  BusinessSettings,
  Database,
  DaySchedule,
  Professional,
  ScheduleBlock
} from '../../domain/types.js';
import { parseClockMinutes } from '../../utils/time.js';
import {
  addDaysToDateText,
  getClockMinutesInTimeZone,
  getDateTextInTimeZone
} from '../../utils/timezone.js';

export interface ScheduleSegment {
  startMinutes: number;
  endMinutes: number;
}

function weekdayFromDateText(dateText: string): number {
  const [year, month, day] = dateText.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function getScheduleForDate(
  settings: BusinessSettings,
  dateText: string
): DaySchedule | null {
  const weekday = weekdayFromDateText(dateText);

  return settings.businessHours.weeklySchedule.find(
    schedule => schedule.weekday === weekday && schedule.enabled
  ) ?? null;
}

export function getProfessionalScheduleForDate(
  professional: Professional,
  dateText: string
): DaySchedule | null {
  if (!professional.weeklySchedule) return null;
  const weekday = weekdayFromDateText(dateText);
  return professional.weeklySchedule.find(
    schedule => schedule.weekday === weekday && schedule.enabled
  ) ?? null;
}

export function getScheduleSegments(day: DaySchedule): ScheduleSegment[] {
  const periods = day.periods?.length
    ? day.periods
    : [{ id: 'legacy', startsAt: day.opensAt, endsAt: day.closesAt }];

  return periods
    .map(period => ({
      startMinutes: parseClockMinutes(period.startsAt),
      endMinutes: parseClockMinutes(period.endsAt)
    }))
    .filter(segment => (
      Number.isFinite(segment.startMinutes) &&
      Number.isFinite(segment.endMinutes) &&
      segment.startMinutes < segment.endMinutes
    ))
    .sort((a, b) => a.startMinutes - b.startMinutes);
}

export function getEffectiveScheduleSegments(
  settings: BusinessSettings,
  professional: Professional,
  dateText: string
): ScheduleSegment[] {
  const businessDay = getScheduleForDate(settings, dateText);
  if (!businessDay) return [];
  const businessSegments = getScheduleSegments(businessDay);

  if (!professional.weeklySchedule) return businessSegments;
  const professionalDay = getProfessionalScheduleForDate(professional, dateText);
  if (!professionalDay) return [];
  const professionalSegments = getScheduleSegments(professionalDay);

  const intersections: ScheduleSegment[] = [];
  for (const business of businessSegments) {
    for (const own of professionalSegments) {
      const startMinutes = Math.max(business.startMinutes, own.startMinutes);
      const endMinutes = Math.min(business.endMinutes, own.endMinutes);
      if (startMinutes < endMinutes) intersections.push({ startMinutes, endMinutes });
    }
  }
  return intersections.sort((a, b) => a.startMinutes - b.startMinutes);
}

export function getBookingWindowViolation(
  settings: BusinessSettings,
  startsAt: Date,
  dateText: string,
  now = new Date()
): string | null {
  const today = getDateTextInTimeZone(now, settings.timezone);
  const maximumDate = addDaysToDateText(
    today,
    settings.bookingRules.maxBookingDaysAhead
  );
  if (dateText < today || startsAt.getTime() < now.getTime()) {
    return 'Esse horário já passou. Escolha uma data e hora futuras.';
  }
  if (dateText > maximumDate) {
    return `A barbearia aceita agendamentos até ${
      settings.bookingRules.maxBookingDaysAhead
    } dia(s) à frente. Escolha uma data até ${formatDateText(maximumDate)}.`;
  }

  const notice = settings.bookingRules.minBookingNoticeMinutes;
  const minimumStart = new Date(now.getTime() + notice * 60_000);
  if (startsAt.getTime() < minimumStart.getTime()) {
    const time = minimumStart.toLocaleTimeString('pt-BR', {
      timeZone: settings.timezone,
      hour: '2-digit',
      minute: '2-digit'
    });
    return `Esse horário não respeita a antecedência mínima de ${notice} minuto(s). ` +
      `Escolha um horário a partir de ${time}.`;
  }

  return null;
}

export function isInsideBookingWindow(
  settings: BusinessSettings,
  startsAt: Date,
  dateText: string,
  now = new Date()
): boolean {
  return getBookingWindowViolation(settings, startsAt, dateText, now) === null;
}

function formatDateText(dateText: string): string {
  const [year, month, day] = dateText.split('-');
  return `${day}/${month}/${year}`;
}

export function isInsideBusinessSchedule(
  settings: BusinessSettings,
  startsAt: Date,
  durationMinutes: number,
  bufferAfterMinutes = 0
): boolean {
  const dateText = getDateTextInTimeZone(startsAt, settings.timezone);
  const day = getScheduleForDate(settings, dateText);
  if (!day) return false;

  const startMinutes = getClockMinutesInTimeZone(startsAt, settings.timezone);
  const occupiedMinutes = durationMinutes + bufferAfterMinutes;

  return getScheduleSegments(day).some(segment => (
    startMinutes >= segment.startMinutes &&
    startMinutes + occupiedMinutes <= segment.endMinutes
  ));
}

export function isInsideProfessionalSchedule(
  settings: BusinessSettings,
  professional: Professional,
  startsAt: Date,
  durationMinutes: number,
  bufferAfterMinutes = 0
): boolean {
  const dateText = getDateTextInTimeZone(startsAt, settings.timezone);
  const startMinutes = getClockMinutesInTimeZone(startsAt, settings.timezone);
  const occupiedMinutes = durationMinutes + bufferAfterMinutes;

  return getEffectiveScheduleSegments(settings, professional, dateText).some(segment => (
    startMinutes >= segment.startMinutes &&
    startMinutes + occupiedMinutes <= segment.endMinutes
  ));
}

export function hasScheduleBlockConflict(
  database: Pick<Database, 'scheduleBlocks'>,
  professionalId: string,
  startsAt: Date,
  endsAt: Date,
  ignoredBlockId?: string
): ScheduleBlock | null {
  const start = startsAt.getTime();
  const end = endsAt.getTime();

  return database.scheduleBlocks.find(block => {
    if (block.id === ignoredBlockId) return false;
    if (block.professionalId && block.professionalId !== professionalId) {
      return false;
    }

    const blockStart = new Date(block.startsAt).getTime();
    const blockEnd = new Date(block.endsAt).getTime();
    return start < blockEnd && end > blockStart;
  }) ?? null;
}
