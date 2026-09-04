export function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeOptionalText(value: unknown): string | null {
  const text = normalizeText(value);
  return text || null;
}

export function normalizePhone(value: unknown): string {
  return normalizeText(value).replace(/\D/g, '');
}

export function normalizeMoney(value: unknown): number {
  const number = Number(value);

  return Number.isFinite(number) && number >= 0
    ? Math.round(number * 100) / 100
    : Number.NaN;
}
