interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export function getDateTextInTimeZone(date: Date, timeZone: string): string {
  const parts = getZonedParts(date, timeZone);
  return [
    String(parts.year).padStart(4, '0'),
    String(parts.month).padStart(2, '0'),
    String(parts.day).padStart(2, '0')
  ].join('-');
}

export function getClockMinutesInTimeZone(date: Date, timeZone: string): number {
  const parts = getZonedParts(date, timeZone);
  return parts.hour * 60 + parts.minute;
}

export function formatTimeInTimeZone(date: Date, timeZone: string): string {
  return date.toLocaleTimeString('pt-BR', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function zonedDateTimeToUtc(
  dateText: string,
  minutesOfDay: number,
  timeZone: string
): Date | null {
  const parsed = parseDateText(dateText);
  if (!parsed) return null;

  const hour = Math.floor(minutesOfDay / 60);
  const minute = minutesOfDay % 60;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  const targetTimestamp = Date.UTC(
    parsed.year,
    parsed.month - 1,
    parsed.day,
    hour,
    minute
  );
  let candidateTimestamp = targetTimestamp;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const represented = getZonedParts(new Date(candidateTimestamp), timeZone);
    const representedTimestamp = Date.UTC(
      represented.year,
      represented.month - 1,
      represented.day,
      represented.hour,
      represented.minute
    );
    const difference = targetTimestamp - representedTimestamp;
    if (difference === 0) break;
    candidateTimestamp += difference;
  }

  const candidate = new Date(candidateTimestamp);
  const verified = getZonedParts(candidate, timeZone);
  if (
    verified.year !== parsed.year ||
    verified.month !== parsed.month ||
    verified.day !== parsed.day ||
    verified.hour !== hour ||
    verified.minute !== minute
  ) return null;

  return candidate;
}

function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  });
  const values = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, part.value])
  );
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute)
  };
}

function parseDateText(dateText: string): { year: number; month: number; day: number } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) return null;
  const [year, month, day] = dateText.split('-').map(Number);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) return null;
  return { year, month, day };
}

export function businessDateTimeInputToUtc(value: string, timeZone: string): Date | null {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return null;
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return zonedDateTimeToUtc(match[1], minutes, timeZone);
}

export function addDaysToDateText(dateText: string, days: number): string {
  const [year, month, day] = dateText.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function formatDateTimeInputInTimeZone(date: Date, timeZone: string): string {
  const dateText = getDateTextInTimeZone(date, timeZone);
  const minutes = getClockMinutesInTimeZone(date, timeZone);
  const hour = String(Math.floor(minutes / 60)).padStart(2, '0');
  const minute = String(minutes % 60).padStart(2, '0');
  return `${dateText}T${hour}:${minute}`;
}
