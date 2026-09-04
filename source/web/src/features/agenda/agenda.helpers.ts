import type {
  Appointment,
  AppointmentStatus,
  BusinessSettings,
  DaySchedule,
  Professional,
  ScheduleBlock,
  Service
} from '../../domain/types';
import {
  formatTimeInTimeZone,
  getClockMinutesInTimeZone,
  getDateTextInTimeZone,
  zonedDateTimeToUtc
} from '../../utils/businessTime';

export type AgendaView = 'day' | 'week' | 'month';

export type AgendaTimelineItem =
  | {
      id: string;
      kind: 'appointment';
      startsAt: Date;
      endsAt: Date;
      reservedEndsAt: Date;
      appointment: Appointment;
    }
  | {
      id: string;
      kind: 'block';
      startsAt: Date;
      endsAt: Date;
      block: ScheduleBlock;
    }
  | {
      id: string;
      kind: 'free';
      startsAt: Date;
      endsAt: Date;
    };

const countedStatuses = new Set<AppointmentStatus>([
  'scheduled',
  'confirmed',
  'arrived',
  'in_service',
  'completed'
]);

export function isCountedAppointmentStatus(status: AppointmentStatus): boolean {
  return countedStatuses.has(status);
}

export function toDateText(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function appointmentDateText(
  appointment: Pick<Appointment, 'date'>,
  timeZone: string
): string {
  return getDateTextInTimeZone(new Date(appointment.date), timeZone);
}

export function instantDateText(value: Date | string, timeZone: string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return getDateTextInTimeZone(date, timeZone);
}

export function fromDateText(dateText: string): Date {
  const [year, month, day] = dateText.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function addDaysText(dateText: string, days: number): string {
  const date = fromDateText(dateText);
  date.setDate(date.getDate() + days);
  return toDateText(date);
}

export function startOfWeekText(dateText: string): string {
  const date = fromDateText(dateText);
  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + offset);
  return toDateText(date);
}

export function getMonthGrid(dateText: string): string[] {
  const date = fromDateText(dateText);
  const first = new Date(date.getFullYear(), date.getMonth(), 1, 12);
  const weekday = first.getDay();
  const offset = weekday === 0 ? -6 : 1 - weekday;
  first.setDate(first.getDate() + offset);

  return Array.from({ length: 42 }, (_, index) => {
    const current = new Date(first);
    current.setDate(first.getDate() + index);
    return toDateText(current);
  });
}

export function formatDayHeading(dateText: string): string {
  const text = fromDateText(dateText).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long'
  });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatShortDay(dateText: string): string {
  return fromDateText(dateText).toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit'
  });
}

export function formatMonthHeading(dateText: string): string {
  const value = fromDateText(dateText).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric'
  });
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatTime(value: Date | string, timeZone?: string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return timeZone
    ? formatTimeInTimeZone(date, timeZone)
    : date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function getDaySchedule(settings: BusinessSettings, dateText: string): DaySchedule | null {
  const weekday = fromDateText(dateText).getDay();
  return settings.businessHours.weeklySchedule.find(
    day => day.weekday === weekday && day.enabled
  ) ?? null;
}

export function getProfessionalDaySchedule(
  professional: Professional,
  dateText: string
): DaySchedule | null {
  if (!professional.weeklySchedule) return null;
  const weekday = fromDateText(dateText).getDay();
  return professional.weeklySchedule.find(
    day => day.weekday === weekday && day.enabled
  ) ?? null;
}

export function getProfessionalWorkingMinutes(
  settings: BusinessSettings,
  professional: Professional,
  dateText: string
): number {
  return getEffectiveScheduleSegments(settings, professional, dateText).reduce(
    (total, segment) => total + segment.endMinutes - segment.startMinutes,
    0
  );
}

export function isTodayText(dateText: string, timeZone?: string): boolean {
  const today = timeZone
    ? getDateTextInTimeZone(new Date(), timeZone)
    : toDateText(new Date());
  return dateText === today;
}

export function getMaximumBookingDate(settings: BusinessSettings): string {
  return addDaysText(
    getDateTextInTimeZone(new Date(), settings.timezone),
    settings.bookingRules.maxBookingDaysAhead
  );
}

export function buildProfessionalTimeline(input: {
  settings: BusinessSettings;
  dateText: string;
  professional: Professional;
  appointments: Appointment[];
  blocks: ScheduleBlock[];
  services: Service[];
  now?: Date;
}): AgendaTimelineItem[] {
  const now = input.now ?? new Date();
  const segments = getEffectiveScheduleSegments(
    input.settings,
    input.professional,
    input.dateText
  );
  if (!segments.length) return [];

  const appointments = input.appointments.filter(item => (
    item.professionalId === input.professional.id &&
    appointmentDateText(item, input.settings.timezone) === input.dateText &&
    item.status !== 'cancelled' &&
    item.status !== 'missed' &&
    !item.recurrencePaused
  ));
  const blocks = input.blocks.filter(item => (
    (!item.professionalId || item.professionalId === input.professional.id) &&
    instantDateText(item.startsAt, input.settings.timezone) === input.dateText
  ));

  const events: AgendaTimelineItem[] = [
    ...appointments.map(appointment => {
      const startsAt = new Date(appointment.date);
      const endsAt = new Date(startsAt.getTime() + appointment.durationMinutes * 60_000);
      const reservedEndsAt = new Date(
        endsAt.getTime() + (appointment.bufferAfterMinutes ?? 0) * 60_000
      );
      return {
        id: `appointment-${appointment.id}`,
        kind: 'appointment' as const,
        startsAt,
        endsAt,
        reservedEndsAt,
        appointment
      };
    }),
    ...blocks.map(block => ({
      id: `block-${block.id}`,
      kind: 'block' as const,
      startsAt: new Date(block.startsAt),
      endsAt: new Date(block.endsAt),
      block
    }))
  ].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  const minServiceMinutes = getMinimumServiceMinutes(input.services);
  const canOfferFree = isDateInsideBookingWindow(input.settings, input.dateText);
  const items: AgendaTimelineItem[] = [];

  segments.forEach(segment => {
    const periodStart = dateAtMinutes(
      input.dateText,
      segment.startMinutes,
      input.settings.timezone
    );
    const periodEnd = dateAtMinutes(
      input.dateText,
      segment.endMinutes,
      input.settings.timezone
    );
    if (!periodStart || !periodEnd) return;

    let cursor = canOfferFree
      ? getFirstBookableTime(input.settings, input.dateText, periodStart, now)
      : periodEnd;

    const periodEvents = events.filter(event => (
      getOccupiedEnd(event) > periodStart && event.startsAt < periodEnd
    ));

    periodEvents.forEach(event => {
      if (
        canOfferFree &&
        event.startsAt > cursor &&
        differenceMinutes(cursor, event.startsAt) >= minServiceMinutes
      ) {
        items.push({
          id: `free-${input.professional.id}-${cursor.getTime()}`,
          kind: 'free',
          startsAt: new Date(cursor),
          endsAt: new Date(event.startsAt)
        });
      }
      items.push(event);
      const occupiedEnd = getOccupiedEnd(event);
      if (occupiedEnd > cursor) cursor = new Date(occupiedEnd);
    });

    if (
      canOfferFree &&
      periodEnd > cursor &&
      differenceMinutes(cursor, periodEnd) >= minServiceMinutes
    ) {
      items.push({
        id: `free-${input.professional.id}-${cursor.getTime()}`,
        kind: 'free',
        startsAt: new Date(cursor),
        endsAt: new Date(periodEnd)
      });
    }
  });

  return deduplicateEvents(items).sort(
    (a, b) => a.startsAt.getTime() - b.startsAt.getTime()
  );
}

export function dateAtClock(dateText: string, clock: string, timeZone?: string): Date {
  const minutes = clockToMinutes(clock);
  if (timeZone) {
    return zonedDateTimeToUtc(dateText, minutes, timeZone) ?? fromDateText(dateText);
  }
  return dateAtMinutesLocal(dateText, minutes);
}

export function toLocalDateTimeInput(date: Date, timeZone?: string): string {
  if (timeZone) {
    const dateText = getDateTextInTimeZone(date, timeZone);
    const minutes = getClockMinutesInTimeZone(date, timeZone);
    const hour = String(Math.floor(minutes / 60)).padStart(2, '0');
    const minute = String(minutes % 60).padStart(2, '0');
    return `${dateText}T${hour}:${minute}`;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function getMinimumServiceMinutes(services: Service[]): number {
  const active = services.filter(item => item.active);
  if (!active.length) return 30;
  return Math.max(
    5,
    Math.min(...active.map(item => item.durationMinutes + item.bufferAfterMinutes))
  );
}

function isDateInsideBookingWindow(
  settings: BusinessSettings,
  dateText: string
): boolean {
  const today = getDateTextInTimeZone(new Date(), settings.timezone);
  return dateText >= today && dateText <= getMaximumBookingDate(settings);
}

function getFirstBookableTime(
  settings: BusinessSettings,
  dateText: string,
  periodStart: Date,
  now: Date
): Date {
  if (dateText !== getDateTextInTimeZone(now, settings.timezone)) return periodStart;
  const minimum = new Date(
    now.getTime() + settings.bookingRules.minBookingNoticeMinutes * 60_000
  );
  const step = Math.max(5, settings.businessHours.slotIntervalMinutes || 15);
  const total = getClockMinutesInTimeZone(minimum, settings.timezone);
  const roundedMinutes = Math.ceil(total / step) * step;
  const rounded = zonedDateTimeToUtc(dateText, roundedMinutes, settings.timezone);
  if (!rounded) return minimum > periodStart ? minimum : periodStart;
  return rounded > periodStart ? rounded : periodStart;
}

function getEffectiveScheduleSegments(
  settings: BusinessSettings,
  professional: Professional,
  dateText: string
): { startMinutes: number; endMinutes: number }[] {
  const businessDay = getDaySchedule(settings, dateText);
  if (!businessDay) return [];
  const businessSegments = segmentsFromDay(businessDay);
  if (!professional.weeklySchedule) return businessSegments;

  const professionalDay = getProfessionalDaySchedule(professional, dateText);
  if (!professionalDay) return [];
  const ownSegments = segmentsFromDay(professionalDay);
  const result: { startMinutes: number; endMinutes: number }[] = [];

  businessSegments.forEach(business => {
    ownSegments.forEach(own => {
      const startMinutes = Math.max(business.startMinutes, own.startMinutes);
      const endMinutes = Math.min(business.endMinutes, own.endMinutes);
      if (startMinutes < endMinutes) result.push({ startMinutes, endMinutes });
    });
  });
  return result.sort((a, b) => a.startMinutes - b.startMinutes);
}

function segmentsFromDay(day: DaySchedule): { startMinutes: number; endMinutes: number }[] {
  const periods = day.periods?.length
    ? day.periods
    : [{ id: 'legacy', startsAt: day.opensAt, endsAt: day.closesAt }];
  return periods
    .map(period => ({
      startMinutes: clockToMinutes(period.startsAt),
      endMinutes: clockToMinutes(period.endsAt)
    }))
    .filter(segment => segment.startMinutes < segment.endMinutes)
    .sort((a, b) => a.startMinutes - b.startMinutes);
}

function getOccupiedEnd(item: AgendaTimelineItem): Date {
  return item.kind === 'appointment' ? item.reservedEndsAt : item.endsAt;
}

function differenceMinutes(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / 60_000;
}

function deduplicateEvents(items: AgendaTimelineItem[]): AgendaTimelineItem[] {
  const map = new Map<string, AgendaTimelineItem>();
  items.forEach(item => map.set(item.id, item));
  return [...map.values()];
}

function clockToMinutes(clock: string): number {
  const [hour, minute] = clock.split(':').map(Number);
  return hour * 60 + minute;
}

function dateAtMinutes(
  dateText: string,
  minutes: number,
  timeZone: string
): Date | null {
  return zonedDateTimeToUtc(dateText, minutes, timeZone);
}

function dateAtMinutesLocal(dateText: string, minutes: number): Date {
  const date = fromDateText(dateText);
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return date;
}
