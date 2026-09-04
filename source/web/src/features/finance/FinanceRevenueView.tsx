import { useMemo, type CSSProperties } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import type { Appointment, PaymentMethod } from '../../domain/types';
import { currencyFormatter } from '../../utils/formatters';
import {
  comparePercent,
  comparisonLabel,
  paymentLabel
} from './finance.helpers';

interface FinanceRevenueViewProps {
  timeZone: string;
  period: 'today' | 'week' | 'month' | 'custom';
  currentFinance: ReturnType<typeof import('./finance.helpers').buildPeriodFinance>;
  previousFinance: ReturnType<typeof import('./finance.helpers').buildPeriodFinance>;
  entrySearch: string;
  entryProfessional: string;
  entryPayment: string;
  onEntrySearchChange: (value: string) => void;
  onEntryProfessionalChange: (value: string) => void;
  onEntryPaymentChange: (value: string) => void;
  onOpenAppointment: (appointmentId: string) => void;
}

export function FinanceRevenueView({
  timeZone,
  period,
  currentFinance,
  previousFinance,
  entrySearch,
  entryProfessional,
  entryPayment,
  onEntrySearchChange,
  onEntryProfessionalChange,
  onEntryPaymentChange,
  onOpenAppointment
}: FinanceRevenueViewProps) {
  const filteredEntries = useMemo(() => {
    const query = entrySearch.trim().toLocaleLowerCase('pt-BR');
    return currentFinance.entries.filter(appointment => {
      const clientName = appointment.client?.name ?? 'Cliente';
      const matchesSearch = !query || [
        clientName,
        appointment.serviceName,
        appointment.professionalName
      ].some(value => value.toLocaleLowerCase('pt-BR').includes(query));
      const matchesProfessional = entryProfessional === 'all'
        || appointment.professionalId === entryProfessional;
      const matchesPayment = entryPayment === 'all'
        || appointment.paymentMethod === entryPayment;
      return matchesSearch && matchesProfessional && matchesPayment;
    });
  }, [currentFinance.entries, entryPayment, entryProfessional, entrySearch]);

  const professionals = useMemo(() => {
    const map = new Map<string, string>();
    currentFinance.entries.forEach(item => {
      map.set(item.professionalId, item.professionalName);
    });
    return [...map.entries()].sort((left, right) => (
      left[1].localeCompare(right[1], 'pt-BR')
    ));
  }, [currentFinance.entries]);

  const grossComparison = comparePercent(
    currentFinance.gross,
    previousFinance.gross
  );

  return (
    <>
      <div className="finance-v116-metrics">
        <FinanceMetric
          label="Faturado"
          value={currencyFormatter.format(currentFinance.gross)}
          note={comparisonLabel(grossComparison)}
          accent
        />
        <FinanceMetric
          label="Recebido"
          value={currencyFormatter.format(currentFinance.received)}
          note="Pix confirmado + recebimentos na conclusão"
        />
        <FinanceMetric
          label="Resultado líquido"
          value={currencyFormatter.format(currentFinance.net)}
          note="após taxas, comissões e despesas"
          positive={currentFinance.net >= 0}
        />
        <FinanceMetric
          label="Atendimentos"
          value={String(currentFinance.entries.length)}
          note={`ticket médio ${currencyFormatter.format(currentFinance.ticketAverage)}`}
        />
      </div>

      <details className="finance-v116-breakdown panel management-premium-panel">
        <summary>Ver composição do resultado</summary>
        <div className="finance-v116-breakdown-grid">
          <FinanceBreakdown label="Taxas" value={currentFinance.cardFees} />
          <FinanceBreakdown
            label="Comissões"
            value={currentFinance.commissions}
          />
          <FinanceBreakdown label="Despesas" value={currentFinance.expenses} />
          <FinanceBreakdown
            label="Recebido"
            value={currentFinance.received}
            strong
          />
        </div>
        <p className="finance-v116-note">
          “Recebido” considera o sinal Pix na data em que a barbearia confirma
          o comprovante e, na conclusão, somente o valor restante líquido da
          taxa registrada. Repasse futuro de operadora de cartão não é tratado
          como dinheiro já recebido.
        </p>
      </details>

      {currentFinance.depositReceipts.length ? (
        <details className="finance-v116-deposits panel management-premium-panel">
          <summary>
            Sinais Pix recebidos • {currentFinance.depositReceipts.length}
            <strong>{currencyFormatter.format(currentFinance.depositReceived)}</strong>
          </summary>
          <div className="finance-v116-deposit-list">
            {currentFinance.depositReceipts.map(appointment => (
              <div key={appointment.id} className="finance-v116-deposit-row">
                <span>
                  {formatEntryMoment(appointment.depositPaidAt, timeZone, period !== 'today')}
                  {' • '}
                  {appointment.client?.name ?? 'Cliente'}
                </span>
                <strong>{currencyFormatter.format(appointment.depositAmount)}</strong>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => onOpenAppointment(appointment.id)}
                >Ver atendimento</button>
              </div>
            ))}
          </div>
        </details>
      ) : null}

      <article className="panel management-premium-panel finance-v116-entries-card">
        <div className="finance-v116-section-heading finance-v116-entry-heading">
          <div>
            <span className="eyebrow">Entradas</span>
            <h3>Atendimentos do período</h3>
            <p className="muted-text">
              O essencial aparece primeiro. Clique em uma entrada para ver os detalhes.
            </p>
          </div>
          <span className="management-soft-badge">
            {filteredEntries.length} resultado(s)
          </span>
        </div>

        <div className="finance-v116-search-row">
          <label className="finance-v116-search">
            <span className="sr-only">Buscar entrada</span>
            <input
              value={entrySearch}
              onChange={event => onEntrySearchChange(event.target.value)}
              placeholder="Buscar cliente ou serviço"
            />
          </label>

          <details className="finance-v116-filters">
            <summary>Filtros</summary>
            <div className="finance-v116-filter-popover">
              <label>
                Profissional
                <select
                  value={entryProfessional}
                  onChange={event => onEntryProfessionalChange(event.target.value)}
                >
                  <option value="all">Todos</option>
                  {professionals.map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              </label>
              <label>
                Pagamento
                <select
                  value={entryPayment}
                  onChange={event => onEntryPaymentChange(event.target.value)}
                >
                  <option value="all">Todos</option>
                  {paymentMethods.map(method => (
                    <option key={method} value={method}>
                      {paymentLabel(method)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </details>
        </div>

        {filteredEntries.length ? (
          <div className="finance-v116-entry-list">
            {filteredEntries.map(appointment => (
              <FinanceEntry
                key={appointment.id}
                appointment={appointment}
                timeZone={timeZone}
                showDate={period !== 'today'}
                onOpenAppointment={onOpenAppointment}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Nenhuma entrada encontrada"
            text="Troque o período ou remova algum filtro."
          />
        )}
      </article>
    </>
  );
}

const paymentMethods: PaymentMethod[] = [
  'pix',
  'cash',
  'debit',
  'credit',
  'other'
];

function FinanceMetric({
  label,
  value,
  note,
  accent = false,
  positive = false
}: {
  label: string;
  value: string;
  note: string;
  accent?: boolean;
  positive?: boolean;
}) {
  const classes = [
    'finance-metric-card',
    'finance-v116-metric',
    accent ? 'accent' : '',
    positive ? 'positive' : ''
  ].filter(Boolean).join(' ');

  return (
    <article className={classes}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function FinanceBreakdown({
  label,
  value,
  strong = false
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div className={strong ? 'strong' : ''}>
      <span>{label}</span>
      <strong>{currencyFormatter.format(value)}</strong>
    </div>
  );
}

function FinanceEntry({
  appointment,
  timeZone,
  showDate,
  onOpenAppointment
}: {
  appointment: Appointment;
  timeZone: string;
  showDate: boolean;
  onOpenAppointment: (appointmentId: string) => void;
}) {
  const eventDate = new Date(appointment.completedAt ?? appointment.date);
  const clientName = appointment.client?.name ?? 'Cliente';
  const paidDeposit = appointment.depositStatus === 'paid'
    ? appointment.depositAmount
    : 0;
  const received = Math.max(0, appointment.price - paidDeposit - appointment.cardFee);
  const fallbackNet = Math.max(
    0,
    appointment.price - appointment.cardFee - appointment.commissionAmount
  );
  const net = appointment.netAmount > 0 ? appointment.netAmount : fallbackNet;

  return (
    <details className="finance-v116-entry">
      <summary>
        <span className="finance-v116-entry-time">
          <strong>
            {eventDate.toLocaleTimeString('pt-BR', {
              timeZone,
              hour: '2-digit',
              minute: '2-digit'
            })}
          </strong>
          {showDate ? (
            <small>
              {eventDate.toLocaleDateString('pt-BR', {
                timeZone,
                day: '2-digit',
                month: '2-digit'
              })}
            </small>
          ) : null}
        </span>
        <strong className="finance-v116-entry-client">{clientName}</strong>
        <strong className="finance-v116-entry-value">
          {currencyFormatter.format(appointment.price)}
        </strong>
        <span className="finance-v116-entry-chevron" aria-hidden="true">⌄</span>
      </summary>

      <div className="finance-v116-entry-details">
        <EntryDetail label="Serviço" value={appointment.serviceName} />
        <EntryDetail label="Profissional" value={appointment.professionalName} />
        <EntryDetail
          label="Pagamento"
          value={paymentLabel(appointment.paymentMethod)}
        />
        {paidDeposit > 0 ? (
          <EntryDetail
            label="Sinal Pix já recebido"
            value={currencyFormatter.format(paidDeposit)}
          />
        ) : null}
        <EntryDetail
          label="Recebido na conclusão"
          value={currencyFormatter.format(received)}
        />
        <EntryDetail
          label="Taxa"
          value={currencyFormatter.format(appointment.cardFee)}
        />
        <EntryDetail
          label="Comissão"
          value={currencyFormatter.format(appointment.commissionAmount)}
        />
        <div className="finance-v116-entry-net">
          <span>Resultado do atendimento</span>
          <strong>{currencyFormatter.format(net)}</strong>
        </div>
        <button
          type="button"
          className="secondary-button finance-v116-open-appointment"
          onClick={() => onOpenAppointment(appointment.id)}
        >Ver atendimento na Agenda</button>
      </div>
    </details>
  );
}

function formatEntryMoment(
  value: string | null | undefined,
  timeZone: string,
  showDate: boolean
): string {
  if (!value) return '—';
  const date = new Date(value);
  const time = date.toLocaleTimeString('pt-BR', {
    timeZone, hour: '2-digit', minute: '2-digit'
  });
  if (!showDate) return time;
  const day = date.toLocaleDateString('pt-BR', {
    timeZone, day: '2-digit', month: '2-digit'
  });
  return `${day} • ${time}`;
}

function EntryDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
