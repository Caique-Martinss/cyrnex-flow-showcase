import type {
  Appointment,
  BusinessSettings,
  Expense,
  Service
} from '../../domain/types';
import {
  addDaysToDateText,
  formatDateTimeInputInTimeZone,
  getClockMinutesInTimeZone,
  getDateTextInTimeZone,
  zonedDateTimeToUtc
} from '../../utils/businessTime';

export interface TimelineItem {
  id: string;
  kind: 'appointment' | 'free';
  startsAt: Date;
  endsAt: Date;
  appointment?: Appointment;
}

export interface HourMovement {
  hour: number;
  label: string;
  count: number;
}

export interface OverviewSnapshot {
  todayAppointments: Appointment[];
  todayScheduled: Appointment[];
  todayCompleted: Appointment[];
  todayCancelled: Appointment[];
  currentAppointment: Appointment | null;
  nextAppointment: Appointment | null;
  expectedRevenue: number;
  receivedRevenue: number;
  todayExpenses: number;
  todayCardFees: number;
  todayCommissions: number;
  todayNet: number;
  paidDeposits: number;
  occupancyPercent: number;
  freeBlocks: TimelineItem[];
  freeStarts: Date[];
  timeline: TimelineItem[];
  movement: HourMovement[];
  previousWeekCount: number | null;
  previousWeekRevenue: number | null;
}

export function buildOverviewSnapshot(
  settings: BusinessSettings,
  appointments: Appointment[],
  expenses: Expense[],
  services: Service[],
  now = new Date()
): OverviewSnapshot {
  const timeZone = settings.timezone || 'America/Sao_Paulo';
  const todayText = getDateTextInTimeZone(now, timeZone);
  const todayAppointments = appointments
    .filter(item => getDateTextInTimeZone(new Date(item.date), timeZone) === todayText)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const todayScheduled = todayAppointments.filter(item =>
    ['scheduled', 'confirmed', 'arrived', 'in_service'].includes(item.status) && !item.recurrencePaused
  );
  const todayCompleted = todayAppointments.filter(item => item.status === 'completed');
  const todayCancelled = todayAppointments.filter(item => item.status === 'cancelled');
  const activeAppointments = todayAppointments.filter(item =>
    ['scheduled', 'confirmed', 'arrived', 'in_service'].includes(item.status) && !item.recurrencePaused
  );
  const currentAppointment = todayScheduled.find(item => item.status === 'in_service') ??
    todayScheduled.find(item => {
      const startsAt = new Date(item.date).getTime();
      const endsAt = startsAt + item.durationMinutes * 60_000;
      return startsAt <= now.getTime() && endsAt > now.getTime();
    }) ?? null;
  const nextAppointment = todayScheduled.find(item => (
    item.id !== currentAppointment?.id && new Date(item.date).getTime() >= now.getTime()
  )) ?? null;
  const expectedRevenue = [...todayScheduled, ...todayCompleted]
    .reduce((sum, item) => sum + item.price, 0);
  const completedGross = todayCompleted.reduce((sum, item) => sum + item.price, 0);
  const depositsReceivedToday = appointments.filter(item => (
    item.depositStatus === 'paid'
    && item.depositAmount > 0
    && item.depositPaidAt
    && getDateTextInTimeZone(new Date(item.depositPaidAt), timeZone) === todayText
  ));
  const completionsReceivedToday = appointments.filter(item => (
    item.status === 'completed'
    && item.completedAt
    && getDateTextInTimeZone(new Date(item.completedAt), timeZone) === todayText
  ));
  const paidDeposits = depositsReceivedToday.reduce(
    (sum, item) => sum + item.depositAmount,
    0
  );
  const todayCardFees = completionsReceivedToday.reduce(
    (sum, item) => sum + item.cardFee,
    0
  );
  const completionCash = completionsReceivedToday.reduce((sum, item) => {
    const paidDeposit = item.depositStatus === 'paid' ? item.depositAmount : 0;
    return sum + Math.max(0, item.price - paidDeposit - item.cardFee);
  }, 0);
  const receivedRevenue = paidDeposits + completionCash;
  const operationalCardFees = todayCompleted.reduce(
    (sum, item) => sum + item.cardFee,
    0
  );
  const todayCommissions = todayCompleted.reduce(
    (sum, item) => sum + item.commissionAmount,
    0
  );
  const todayExpenses = expenses
    .filter(item => expenseDateText(item.date, timeZone) === todayText)
    .reduce((sum, item) => sum + item.amount, 0);
  const todayNet = completedGross - operationalCardFees - todayCommissions - todayExpenses;
  const timeline = buildTodayTimeline(settings, activeAppointments, services, now);
  const freeBlocks = timeline.filter(item => item.kind === 'free');
  const freeStarts = buildFreeStarts(settings, freeBlocks, services);
  const scheduledMinutes = getOpenMinutes(settings, now);
  const occupiedMinutes = activeAppointments.reduce(
    (sum, item) => sum + item.durationMinutes,
    0
  );
  const occupancyPercent = scheduledMinutes > 0
    ? Math.min(100, Math.round((occupiedMinutes / scheduledMinutes) * 100))
    : 0;
  const movement = buildMovement(activeAppointments, settings, now);
  const previousWeekText = addDaysToDateText(todayText, -7);
  const previousWeekAppointments = appointments.filter(
    item => getDateTextInTimeZone(new Date(item.date), timeZone) === previousWeekText
  );
  const previousWeekComparable = previousWeekAppointments.filter(
    item => item.status !== 'cancelled' && item.status !== 'missed' && !item.recurrencePaused
  );
  const previousWeekCompleted = previousWeekAppointments.filter(
    item => item.status === 'completed'
  );

  return {
    todayAppointments,
    todayScheduled,
    todayCompleted,
    todayCancelled,
    currentAppointment,
    nextAppointment,
    expectedRevenue,
    receivedRevenue,
    todayExpenses,
    todayCardFees,
    todayCommissions,
    todayNet,
    paidDeposits,
    occupancyPercent,
    freeBlocks,
    freeStarts,
    timeline,
    movement,
    previousWeekCount: previousWeekAppointments.length
      ? previousWeekComparable.length
      : null,
    previousWeekRevenue: previousWeekAppointments.length
      ? previousWeekCompleted.reduce((sum, item) => sum + item.price, 0)
      : null
  };
}

export function getMinutesUntil(date: string, now = new Date()): number {
  return Math.max(0, Math.ceil((new Date(date).getTime() - now.getTime()) / 60_000));
}

export function formatCountdown(minutes: number): string {
  if (minutes < 1) return 'Agora';
  if (minutes < 60) return `Em ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `Em ${hours}h ${rest}min` : `Em ${hours}h`;
}

export function getGreeting(
  now = new Date(),
  timeZone = 'America/Sao_Paulo'
): string {
  const hour = Math.floor(getClockMinutesInTimeZone(now, timeZone) / 60);
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function formatLongDate(
  now = new Date(),
  timeZone = 'America/Sao_Paulo'
): string {
  return now.toLocaleDateString('pt-BR', {
    timeZone,
    weekday: 'long',
    day: '2-digit',
    month: 'long'
  });
}

export function formatTime(
  date: Date | string,
  timeZone = 'America/Sao_Paulo'
): string {
  return new Date(date).toLocaleTimeString('pt-BR', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function toLocalDateTimeInput(
  date: Date,
  timeZone = 'America/Sao_Paulo'
): string {
  return formatDateTimeInputInTimeZone(date, timeZone);
}

export function isBusinessOpen(settings: BusinessSettings, now = new Date()): boolean {
  const timeZone = settings.timezone || 'America/Sao_Paulo';
  const day = getTodaySchedule(settings, now);
  if (!day?.enabled) return false;
  const currentMinutes = getClockMinutesInTimeZone(now, timeZone);
  return day.periods.some(period => (
    currentMinutes >= toMinutes(period.startsAt) &&
    currentMinutes < toMinutes(period.endsAt)
  ));
}

function buildTodayTimeline(
  settings: BusinessSettings,
  appointments: Appointment[],
  services: Service[],
  now: Date
): TimelineItem[] {
  const schedule = getTodaySchedule(settings, now);
  if (!schedule?.enabled) return [];
  const minimumServiceMinutes = Math.max(
    15,
    Math.min(...services.filter(item => item.active).map(item => (
      item.durationMinutes + item.bufferAfterMinutes
    )), 30)
  );
  const result: TimelineItem[] = [];
  const relevant = appointments
    .filter(item => item.status !== 'cancelled' && item.status !== 'missed')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const timeZone = settings.timezone || 'America/Sao_Paulo';
  const dateText = getDateTextInTimeZone(now, timeZone);
  schedule.periods.forEach(period => {
    const periodStart = dateWithTime(dateText, period.startsAt, timeZone);
    const periodEnd = dateWithTime(dateText, period.endsAt, timeZone);
    if (!periodStart || !periodEnd) return;
    let cursor = periodStart;

    relevant.forEach(appointment => {
      const start = new Date(appointment.date);
      const end = new Date(start.getTime() + appointment.durationMinutes * 60_000);
      if (end <= periodStart || start >= periodEnd) return;
      const clippedStart = start < periodStart ? periodStart : start;
      const clippedEnd = end > periodEnd ? periodEnd : end;

      if (clippedStart.getTime() > cursor.getTime()) {
        const gap = (clippedStart.getTime() - cursor.getTime()) / 60_000;
        if (gap >= minimumServiceMinutes) {
          result.push({
            id: `free-${cursor.toISOString()}`,
            kind: 'free',
            startsAt: cursor,
            endsAt: clippedStart
          });
        }
      }

      result.push({
        id: `appointment-${appointment.id}`,
        kind: 'appointment',
        startsAt: clippedStart,
        endsAt: clippedEnd,
        appointment
      });
      if (clippedEnd > cursor) cursor = clippedEnd;
    });

    if (periodEnd.getTime() > cursor.getTime()) {
      const gap = (periodEnd.getTime() - cursor.getTime()) / 60_000;
      if (gap >= minimumServiceMinutes) {
        result.push({
          id: `free-${cursor.toISOString()}`,
          kind: 'free',
          startsAt: cursor,
          endsAt: periodEnd
        });
      }
    }
  });

  return dedupeTimeline(result);
}


function buildFreeStarts(
  settings: BusinessSettings,
  freeBlocks: TimelineItem[],
  services: Service[]
): Date[] {
  const serviceDurations = services
    .filter(item => item.active)
    .map(item => item.durationMinutes + item.bufferAfterMinutes);
  const minimumDuration = serviceDurations.length
    ? Math.max(15, Math.min(...serviceDurations))
    : 30;
  const step = Math.max(5, settings.businessHours.slotIntervalMinutes || 15);
  const starts: Date[] = [];

  freeBlocks.forEach(block => {
    for (
      let cursor = block.startsAt.getTime();
      cursor + minimumDuration * 60_000 <= block.endsAt.getTime();
      cursor += step * 60_000
    ) {
      starts.push(new Date(cursor));
    }
  });

  return starts;
}

function buildMovement(
  appointments: Appointment[],
  settings: BusinessSettings,
  now: Date
): HourMovement[] {
  const day = getTodaySchedule(settings, now);
  if (!day?.enabled || !day.periods.length) return [];
  const start = Math.min(...day.periods.map(period => toMinutes(period.startsAt)));
  const end = Math.max(...day.periods.map(period => toMinutes(period.endsAt)));
  const startHour = Math.floor(start / 60);
  const endHour = Math.ceil(end / 60);

  return Array.from({ length: Math.max(0, endHour - startHour) }, (_, index) => {
    const hour = startHour + index;
    const count = appointments.filter(item => (
      Math.floor(getClockMinutesInTimeZone(new Date(item.date), settings.timezone) / 60) === hour
    )).length;
    return { hour, label: `${String(hour).padStart(2, '0')}h`, count };
  });
}

function getOpenMinutes(settings: BusinessSettings, now: Date): number {
  const day = getTodaySchedule(settings, now);
  if (!day?.enabled) return 0;
  return day.periods.reduce(
    (sum, period) => sum + Math.max(0, toMinutes(period.endsAt) - toMinutes(period.startsAt)),
    0
  );
}

function getTodaySchedule(settings: BusinessSettings, now: Date) {
  const dateText = getDateTextInTimeZone(now, settings.timezone || 'America/Sao_Paulo');
  const weekday = weekdayFromDateText(dateText);
  return settings.businessHours.weeklySchedule.find(item => item.weekday === weekday);
}

function dateWithTime(dateText: string, time: string, timeZone: string): Date | null {
  return zonedDateTimeToUtc(dateText, toMinutes(time), timeZone);
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function weekdayFromDateText(dateText: string): number {
  const [year, month, day] = dateText.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function expenseDateText(value: string, timeZone: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return getDateTextInTimeZone(new Date(value), timeZone);
}

function dedupeTimeline(items: TimelineItem[]): TimelineItem[] {
  const seenAppointments = new Set<string>();
  return items.filter(item => {
    if (item.kind === 'free') return true;
    const appointmentId = item.appointment?.id;
    if (!appointmentId || seenAppointments.has(appointmentId)) return false;
    seenAppointments.add(appointmentId);
    return true;
  }).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}
