import type { Appointment, Expense, PaymentMethod } from '../../domain/types';
import { getDateTextInTimeZone } from '../../utils/businessTime';

export type FinancePeriod = 'today' | 'week' | 'month' | 'custom';

export interface DateRange {
  start: string;
  end: string;
  label: string;
}

export function resolveRange(
  period: FinancePeriod,
  customStart: string,
  customEnd: string,
  timeZone: string
): DateRange {
  const today = getDateTextInTimeZone(new Date(), timeZone);
  if (period === 'today') {
    return { start: today, end: today, label: 'Hoje' };
  }

  if (period === 'week') {
    const start = startOfWeek(today);
    const end = shiftDateText(start, 6);
    return {
      start,
      end,
      label: `${formatDateText(start)} — ${formatDateText(end)}`
    };
  }

  if (period === 'month') {
    const start = firstDayOfMonth(today);
    const end = lastDayOfMonth(today);
    return { start, end, label: monthLabel(today) };
  }

  const safeStart = customStart || today;
  const safeEnd = customEnd || safeStart;
  const [start, end] = safeStart <= safeEnd
    ? [safeStart, safeEnd]
    : [safeEnd, safeStart];

  return {
    start,
    end,
    label: `${formatDateText(start)} — ${formatDateText(end)}`
  };
}

export function previousRangeFor(range: DateRange): DateRange {
  const days = dateDiffDays(range.start, range.end) + 1;
  const end = shiftDateText(range.start, -1);
  const start = shiftDateText(end, -(days - 1));
  return { start, end, label: 'Período anterior' };
}

export function buildPeriodFinance(
  appointments: Appointment[],
  expenses: Expense[],
  range: DateRange,
  timeZone: string
) {
  const entries = appointments
    .filter(item => item.status === 'completed')
    .filter(item => {
      const dateText = getDateTextInTimeZone(
        new Date(item.completedAt ?? item.date),
        timeZone
      );
      return inRange(dateText, range);
    })
    .sort((left, right) => (
      new Date(right.completedAt ?? right.date).getTime()
      - new Date(left.completedAt ?? left.date).getTime()
    ));

  const expenseItems = expenses
    .filter(item => inRange(item.date.slice(0, 10), range))
    .sort((left, right) => right.date.localeCompare(left.date));

  const depositReceipts = appointments
    .filter(item => item.depositStatus === 'paid' && item.depositAmount > 0)
    .filter(item => {
      if (!item.depositPaidAt) return false;
      return inRange(
        getDateTextInTimeZone(new Date(item.depositPaidAt), timeZone),
        range
      );
    })
    .sort((left, right) => (
      new Date(right.depositPaidAt ?? 0).getTime()
      - new Date(left.depositPaidAt ?? 0).getTime()
    ));

  const gross = sum(entries, item => item.price);
  const cardFees = sum(entries, item => item.cardFee);
  const commissions = sum(entries, item => item.commissionAmount);
  const expenseTotal = sum(expenseItems, item => item.amount);
  const depositReceived = sum(depositReceipts, item => item.depositAmount);
  const completionReceived = sum(entries, item => {
    const paidDeposit = item.depositStatus === 'paid' ? item.depositAmount : 0;
    return Math.max(0, item.price - paidDeposit - item.cardFee);
  });
  const received = depositReceived + completionReceived;
  const net = gross - cardFees - commissions - expenseTotal;
  const categories = buildExpenseCategories(expenseItems, expenseTotal);

  return {
    entries,
    depositReceipts,
    expenseItems,
    gross,
    received,
    depositReceived,
    completionReceived,
    cardFees,
    commissions,
    expenses: expenseTotal,
    net,
    ticketAverage: entries.length ? gross / entries.length : 0,
    categories
  };
}

export function comparePercent(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

export function comparisonLabel(value: number | null): string {
  if (value === null) return 'sem base no período anterior';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}% vs período anterior`;
}

export function paymentLabel(method: PaymentMethod | null): string {
  if (method === 'pix') return 'Pix';
  if (method === 'cash') return 'Dinheiro';
  if (method === 'debit') return 'Débito';
  if (method === 'credit') return 'Crédito';
  if (method === 'other') return 'Outro';
  return 'Não informado';
}

export function firstDayOfMonth(dateText: string): string {
  return `${dateText.slice(0, 7)}-01`;
}

export function formatDateText(dateText: string): string {
  const [year, month, day] = dateText.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('pt-BR', {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function buildExpenseCategories(expenses: Expense[], total: number) {
  const byCategory = new Map<string, { total: number; count: number }>();

  expenses.forEach(expense => {
    const current = byCategory.get(expense.category) ?? { total: 0, count: 0 };
    current.total += expense.amount;
    current.count += 1;
    byCategory.set(expense.category, current);
  });

  return [...byCategory.entries()]
    .map(([name, value]) => ({
      name,
      total: value.total,
      count: value.count,
      share: total > 0 ? Math.min(100, (value.total / total) * 100) : 0
    }))
    .sort((left, right) => right.total - left.total);
}

function inRange(dateText: string, range: DateRange): boolean {
  return dateText >= range.start && dateText <= range.end;
}

function sum<T>(items: T[], getValue: (item: T) => number): number {
  return items.reduce(
    (total, item) => total + Number(getValue(item) || 0),
    0
  );
}

function startOfWeek(dateText: string): string {
  const date = utcFromDateText(dateText);
  const offset = (date.getUTCDay() + 6) % 7;
  return shiftDateText(dateText, -offset);
}

function lastDayOfMonth(dateText: string): string {
  const [year, month] = dateText.split('-').map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

function monthLabel(dateText: string): string {
  const [year, month] = dateText.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('pt-BR', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric'
  });
}

function shiftDateText(dateText: string, days: number): string {
  const date = utcFromDateText(dateText);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dateDiffDays(start: string, end: string): number {
  const difference = utcFromDateText(end).getTime() - utcFromDateText(start).getTime();
  return Math.max(0, Math.round(difference / 86400000));
}

function utcFromDateText(dateText: string): Date {
  const [year, month, day] = dateText.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}
