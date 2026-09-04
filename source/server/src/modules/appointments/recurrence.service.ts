import type { RecurrenceFrequency } from '../../domain/types.js';
import {
  addDaysToDateText,
  getClockMinutesInTimeZone,
  getDateTextInTimeZone,
  zonedDateTimeToUtc
} from '../../utils/timezone.js';

export interface RecurrenceRequest {
  frequency: RecurrenceFrequency;
  intervalWeeks?: number;
  weekdays?: number[];
  count?: number;
  serviceIds?: string[];
}

export interface RecurrenceOccurrence {
  date: Date;
  serviceId: string;
  index: number;
}

export function buildRecurrenceOccurrences(input: {
  baseDate: Date;
  baseServiceId: string;
  timeZone: string;
  recurrence: RecurrenceRequest;
}): RecurrenceOccurrence[] {
  const count = clamp(Math.floor(input.recurrence.count ?? 8), 2, 52);
  const serviceIds = (input.recurrence.serviceIds ?? [input.baseServiceId])
    .filter(Boolean);
  if (!serviceIds.length) serviceIds.push(input.baseServiceId);

  if (input.recurrence.frequency === 'monthly') {
    return buildMonthly(input.baseDate, input.timeZone, serviceIds, count);
  }

  const intervalWeeks = input.recurrence.frequency === 'biweekly'
    ? 2
    : input.recurrence.frequency === 'custom'
      ? clamp(Math.floor(input.recurrence.intervalWeeks ?? 1), 1, 8)
      : 1;
  const baseDateText = getDateTextInTimeZone(input.baseDate, input.timeZone);
  const clockMinutes = getClockMinutesInTimeZone(input.baseDate, input.timeZone);
  const baseWeekday = getWeekday(baseDateText);
  const weekdays = uniqueWeekdays(
    input.recurrence.weekdays?.length
      ? input.recurrence.weekdays
      : [baseWeekday]
  );

  const results: RecurrenceOccurrence[] = [];
  let offset = 0;
  while (results.length < count && offset <= 370) {
    const dateText = addDaysToDateText(baseDateText, offset);
    const weekIndex = Math.floor(offset / 7);
    const eligibleWeek = weekIndex % intervalWeeks === 0;
    if (eligibleWeek && weekdays.includes(getWeekday(dateText))) {
      const date = zonedDateTimeToUtc(dateText, clockMinutes, input.timeZone);
      if (date && date.getTime() >= input.baseDate.getTime()) {
        const index = results.length;
        results.push({
          date,
          serviceId: serviceIds[index % serviceIds.length],
          index
        });
      }
    }
    offset += 1;
  }

  return results;
}

function buildMonthly(
  baseDate: Date,
  timeZone: string,
  serviceIds: string[],
  count: number
): RecurrenceOccurrence[] {
  const baseDateText = getDateTextInTimeZone(baseDate, timeZone);
  const [baseYear, baseMonth, baseDay] = baseDateText.split('-').map(Number);
  const clockMinutes = getClockMinutesInTimeZone(baseDate, timeZone);
  const results: RecurrenceOccurrence[] = [];

  for (let offset = 0; offset < count; offset += 1) {
    const monthIndex = baseMonth - 1 + offset;
    const year = baseYear + Math.floor(monthIndex / 12);
    const month = (monthIndex % 12) + 1;
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const day = Math.min(baseDay, lastDay);
    const dateText = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const date = zonedDateTimeToUtc(dateText, clockMinutes, timeZone);
    if (!date) continue;
    results.push({
      date,
      serviceId: serviceIds[results.length % serviceIds.length],
      index: results.length
    });
  }

  return results;
}

function getWeekday(dateText: string): number {
  const [year, month, day] = dateText.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function uniqueWeekdays(values: number[]): number[] {
  return [...new Set(values.filter(value => Number.isInteger(value) && value >= 0 && value <= 6))]
    .sort((a, b) => a - b);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
