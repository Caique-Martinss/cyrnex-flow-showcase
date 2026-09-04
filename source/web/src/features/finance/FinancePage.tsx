import { useMemo, useState } from 'react';
import type { Appointment, Expense } from '../../domain/types';
import { getDateTextInTimeZone } from '../../utils/businessTime';
import { FinanceExpensesView } from './FinanceExpensesView';
import { FinancePeriodSelector } from './FinancePeriodSelector';
import { FinanceRevenueView } from './FinanceRevenueView';
import {
  buildPeriodFinance,
  firstDayOfMonth,
  previousRangeFor,
  resolveRange,
  type FinancePeriod
} from './finance.helpers';

export type FinanceView = 'revenue' | 'expenses';

interface FinancePageProps {
  view: FinanceView;
  timeZone: string;
  appointments: Appointment[];
  expenses: Expense[];
  actionLoading: boolean;
  onNewExpense: () => void;
  onDeleteExpense: (expense: Expense) => void;
  onOpenAppointment: (appointmentId: string) => void;
}

export function FinancePage({
  view,
  timeZone,
  appointments,
  expenses,
  actionLoading,
  onNewExpense,
  onDeleteExpense,
  onOpenAppointment
}: FinancePageProps) {
  const today = getDateTextInTimeZone(new Date(), timeZone);
  const [period, setPeriod] = useState<FinancePeriod>('today');
  const [customStart, setCustomStart] = useState(firstDayOfMonth(today));
  const [customEnd, setCustomEnd] = useState(today);
  const [expenseCategory, setExpenseCategory] = useState('all');
  const [entrySearch, setEntrySearch] = useState('');
  const [entryProfessional, setEntryProfessional] = useState('all');
  const [entryPayment, setEntryPayment] = useState('all');

  const range = useMemo(
    () => resolveRange(period, customStart, customEnd, timeZone),
    [period, customStart, customEnd, timeZone]
  );
  const previousRange = useMemo(() => previousRangeFor(range), [range]);
  const currentFinance = useMemo(
    () => buildPeriodFinance(appointments, expenses, range, timeZone),
    [appointments, expenses, range, timeZone]
  );
  const previousFinance = useMemo(
    () => buildPeriodFinance(appointments, expenses, previousRange, timeZone),
    [appointments, expenses, previousRange, timeZone]
  );

  return (
    <section className="page-section finance-premium-page finance-v116-page">
      <header className="management-hero finance-management-hero finance-v116-hero">
        <div className="management-hero-copy">
          <span className="eyebrow">
            {view === 'expenses' ? 'Financeiro • saídas' : 'Financeiro • entradas'}
          </span>
          <h2>{view === 'expenses' ? 'Despesas' : 'Faturamento'}</h2>
          <p>
            {view === 'expenses'
              ? 'Veja o que saiu do caixa sem misturar os lançamentos com o faturamento.'
              : 'Veja quanto foi faturado, quanto foi recebido e quais atendimentos formaram o valor.'}
          </p>
        </div>
      </header>

      <FinancePeriodSelector
        period={period}
        range={range}
        customStart={customStart}
        customEnd={customEnd}
        onPeriodChange={setPeriod}
        onCustomStartChange={setCustomStart}
        onCustomEndChange={setCustomEnd}
      />

      {view === 'expenses' ? (
        <FinanceExpensesView
          finance={currentFinance}
          category={expenseCategory}
          actionLoading={actionLoading}
          onCategoryChange={setExpenseCategory}
          onNewExpense={onNewExpense}
          onDeleteExpense={onDeleteExpense}
        />
      ) : (
        <FinanceRevenueView
          timeZone={timeZone}
          period={period}
          currentFinance={currentFinance}
          previousFinance={previousFinance}
          entrySearch={entrySearch}
          entryProfessional={entryProfessional}
          entryPayment={entryPayment}
          onEntrySearchChange={setEntrySearch}
          onEntryProfessionalChange={setEntryProfessional}
          onEntryPaymentChange={setEntryPayment}
          onOpenAppointment={onOpenAppointment}
        />
      )}
    </section>
  );
}
