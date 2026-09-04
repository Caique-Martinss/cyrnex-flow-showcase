import type { Appointment, Expense, Professional } from '../../domain/types';
import { currencyFormatter } from '../../utils/formatters';
import { formatTime } from './overview.helpers';

export function OverviewMetric({
  label,
  value,
  note
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <article className="overview-metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

export function FinanceLine({
  label,
  value,
  negative = false,
  strong = false
}: {
  label: string;
  value: number;
  negative?: boolean;
  strong?: boolean;
}) {
  return (
    <div className={`finance-today-line ${strong ? 'strong' : ''}`}>
      <span>{label}</span>
      <strong>{negative && value ? '− ' : ''}{currencyFormatter.format(value)}</strong>
    </div>
  );
}

export function comparisonNote(
  current: number,
  previous: number | null,
  fallback: string
): string {
  if (previous === null) {
    return `Sem histórico suficiente para comparar com ${fallback}`;
  }

  const difference = current - previous;
  if (difference === 0) return 'Mesmo movimento da semana passada';

  return difference > 0
    ? `↑ ${difference} a mais que na semana passada`
    : `↓ ${Math.abs(difference)} a menos que na semana passada`;
}

export function buildActivityItems(
  appointments: Appointment[],
  expenses: Expense[],
  now: Date,
  timeZone: string
) {
  const todayText = now.toLocaleDateString('en-CA', { timeZone });
  const sameDay = (value: string) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value === todayText;
    return new Date(value).toLocaleDateString('en-CA', { timeZone }) === todayText;
  };

  const todayExpenses = expenses.filter(item => sameDay(item.date));
  const appointmentItems = appointments.flatMap(item => {
    const sourceDate = item.status === 'completed'
      ? item.completedAt
      : item.status === 'scheduled'
        ? item.createdAt
        : null;

    if (!sourceDate || !sameDay(sourceDate)) return [];

    const verb = item.status === 'completed'
      ? 'Atendimento concluído'
      : 'Atendimento agendado';

    return [{
      id: `appointment-${item.id}-${item.status}`,
      at: new Date(sourceDate).getTime(),
      time: formatTime(sourceDate, timeZone),
      text: `${verb}: ${item.client?.name ?? 'Cliente'} • ${item.serviceName}`
    }];
  });
  const expenseItems = todayExpenses
    .filter(item => sameDay(item.createdAt))
    .map(item => ({
      id: `expense-${item.id}`,
      at: new Date(item.createdAt).getTime(),
      time: formatTime(item.createdAt, timeZone),
      text: `Despesa registrada: ${item.description} • ${currencyFormatter.format(item.amount)}`
    }));

  return [...appointmentItems, ...expenseItems]
    .sort((a, b) => b.at - a.at)
    .slice(0, 8);
}

export function capitalize(value: string): string {
  return value
    ? value[0].toLocaleUpperCase('pt-BR') + value.slice(1)
    : value;
}

export function ActivityPanel({
  appointments,
  expenses,
  now,
  timeZone
}: {
  appointments: Appointment[];
  expenses: Expense[];
  now: Date;
  timeZone: string;
}) {
  const items = buildActivityItems(appointments, expenses, now, timeZone);

  return (
    <details className="panel activity-panel">
      <summary>
        <span>
          <span className="eyebrow">Histórico rápido</span>
          <strong>Aconteceu hoje</strong>
        </span>
        <span>Ver atividades</span>
      </summary>
      <div className="activity-list">
        {items.length ? (
          items.map(item => (
            <div key={item.id}>
              <span>{item.time}</span>
              <strong>{item.text}</strong>
            </div>
          ))
        ) : (
          <p className="muted-copy">Nenhuma atividade registrada hoje.</p>
        )}
      </div>
    </details>
  );
}

export function FirstDayPanel({
  onNewClient,
  onNewAppointment
}: {
  onNewClient: () => void;
  onNewAppointment: () => void;
}) {
  return (
    <div className="overview-first-day">
      <strong>Sua operação começa zerada, do jeito certo.</strong>
      <span>
        Cadastre o primeiro cliente e depois crie um agendamento para ver a Visão Geral ganhar vida.
      </span>
      <div>
        <button onClick={onNewClient}>+ Cadastrar primeiro cliente</button>
        <button className="secondary-button" onClick={onNewAppointment}>
          Criar agendamento
        </button>
      </div>
    </div>
  );
}

export function TeamTodayPanel({
  professionals,
  appointments,
  showFinance
}: {
  professionals: Professional[];
  appointments: Appointment[];
  showFinance: boolean;
}) {
  const active = professionals.filter(item => item.active && item.servesClients);

  return (
    <article className="panel team-today-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Equipe</span>
          <h2>Equipe hoje</h2>
        </div>
      </div>
      <div className="team-today-list">
        {active.map(professional => {
          const items = appointments.filter(
            item => item.professionalId === professional.id &&
              item.status !== 'cancelled' && item.status !== 'missed'
          );
          const expected = items.reduce((sum, item) => sum + item.price, 0);
          return (
            <div key={professional.id}>
              <span>
                <strong>{professional.professionalName || professional.name}</strong>
                <small>{items.length} atendimento(s)</small>
              </span>
              {showFinance ? <strong>{currencyFormatter.format(expected)}</strong> : null}
            </div>
          );
        })}
        {!active.length ? (
          <p className="muted-copy">Nenhum profissional ativo para atendimento.</p>
        ) : null}
      </div>
    </article>
  );
}
