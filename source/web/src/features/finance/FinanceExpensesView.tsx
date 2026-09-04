import { type CSSProperties } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import type { Expense } from '../../domain/types';
import { currencyFormatter } from '../../utils/formatters';
import { formatDateText } from './finance.helpers';

interface FinanceExpensesViewProps {
  finance: ReturnType<typeof import('./finance.helpers').buildPeriodFinance>;
  category: string;
  actionLoading: boolean;
  onCategoryChange: (value: string) => void;
  onNewExpense: () => void;
  onDeleteExpense: (expense: Expense) => void;
}

export function FinanceExpensesView({
  finance,
  category,
  actionLoading,
  onCategoryChange,
  onNewExpense,
  onDeleteExpense
}: FinanceExpensesViewProps) {
  const visibleExpenses = category === 'all'
    ? finance.expenseItems
    : finance.expenseItems.filter(expense => expense.category === category);
  const biggestCategory = finance.categories[0];

  return (
    <>
      <div className="finance-v116-expense-action-row">
        <span className="muted-text">
          Cadastre somente saídas reais da operação.
        </span>
        <button onClick={onNewExpense}>+ Registrar despesa</button>
      </div>

      <div className="finance-v116-metrics finance-v116-expense-metrics">
        <ExpenseMetric
          label="Despesas no período"
          value={currencyFormatter.format(finance.expenses)}
          note="saídas registradas"
          accent
        />
        <ExpenseMetric
          label="Lançamentos"
          value={String(finance.expenseItems.length)}
          note="despesas registradas"
        />
        <ExpenseMetric
          label="Maior categoria"
          value={biggestCategory?.name ?? '—'}
          note={biggestCategory
            ? currencyFormatter.format(biggestCategory.total)
            : 'sem despesas no período'}
        />
      </div>

      <div className="finance-v116-expense-grid">
        <article className="panel management-premium-panel finance-v116-list-card">
          <div className="finance-v116-section-heading">
            <div>
              <span className="eyebrow">Lançamentos</span>
              <h3>Despesas registradas</h3>
            </div>
            <label className="finance-category-filter">
              <span>Categoria</span>
              <select
                value={category}
                onChange={event => onCategoryChange(event.target.value)}
              >
                <option value="all">Todas</option>
                {finance.categories.map(item => (
                  <option key={item.name} value={item.name}>{item.name}</option>
                ))}
              </select>
            </label>
          </div>

          {visibleExpenses.length ? (
            <div className="premium-expense-list">
              {visibleExpenses.map(expense => (
                <div className="premium-expense-row" key={expense.id}>
                  <span className="expense-category-mark">
                    {expense.category.slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <strong>{expense.description}</strong>
                    <small>
                      {expense.category} • {formatDateText(expense.date.slice(0, 10))}
                    </small>
                  </div>
                  <strong className="negative">
                    − {currencyFormatter.format(expense.amount)}
                  </strong>
                  <button
                    className="icon-button small"
                    disabled={actionLoading}
                    onClick={() => onDeleteExpense(expense)}
                    aria-label={`Excluir despesa ${expense.description}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Nenhuma despesa neste período"
              text="Troque o período ou registre uma nova despesa."
            />
          )}
        </article>

        <article className="panel management-premium-panel finance-v116-category-card">
          <span className="eyebrow">Resumo</span>
          <h3>Onde o caixa saiu</h3>
          <p className="muted-text">
            Ranking somente das despesas do período selecionado.
          </p>

          {finance.categories.length ? (
            <div className="finance-category-list">
              {finance.categories.slice(0, 5).map(item => (
                <div className="finance-category-row" key={item.name}>
                  <div>
                    <strong>{item.name}</strong>
                    <small>{item.count} lançamento(s)</small>
                  </div>
                  <div>
                    <strong>{currencyFormatter.format(item.total)}</strong>
                    <span
                      className="finance-category-bar"
                      style={{ '--share': `${item.share}%` } as CSSProperties}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Sem despesas"
              text="Nada saiu do caixa neste período."
            />
          )}
        </article>
      </div>
    </>
  );
}

function ExpenseMetric({
  label,
  value,
  note,
  accent = false
}: {
  label: string;
  value: string;
  note: string;
  accent?: boolean;
}) {
  const classes = [
    'finance-metric-card',
    'finance-v116-metric',
    accent ? 'accent' : ''
  ].filter(Boolean).join(' ');

  return (
    <article className={classes}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}
