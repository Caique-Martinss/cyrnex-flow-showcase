export function parseClockMinutes(value: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(value);

  if (!match) return Number.NaN;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours > 23 || minutes > 59) {
    return Number.NaN;
  }

  return hours * 60 + minutes;
}

export function formatClock(minutesFromMidnight: number): string {
  const hours = Math.floor(minutesFromMidnight / 60);
  const minutes = minutesFromMidnight % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
