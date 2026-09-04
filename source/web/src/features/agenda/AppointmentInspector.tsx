import { useMemo, useState } from 'react';
import { appointmentStatusLabels } from '../../app/constants';
import type { Appointment, AppointmentStatus, Client, WaitlistEntry } from '../../domain/types';
import { currencyFormatter } from '../../utils/formatters';
import { formatTime } from './agenda.helpers';
import { PaymentProofPanel } from './PaymentProofPanel';

interface AppointmentInspectorProps {
  appointment: Appointment;
  appointments: Appointment[];
  waitlistEntries: WaitlistEntry[];
  clients: Client[];
  whatsappEnabled: boolean;
  actionLoading: boolean;
  timeZone: string;
  onClose: () => void;
  onWhatsApp: () => void;
  onWhatsAppClient: (clientId: string) => void;
  onReschedule: () => void;
  onChangeStatus: (
    appointment: Appointment,
    status: AppointmentStatus,
    options?: { confirmEarlyStart?: boolean; reason?: string }
  ) => void;
  onToggleRecurrence: (appointment: Appointment, action: 'pause' | 'resume') => void;
  onPaymentReviewed: () => Promise<void> | void;
}

const timelineLabels: Record<string, string> = {
  created: 'Agendamento criado',
  confirmed: 'Confirmado',
  arrived: 'Cliente chegou',
  started: 'Atendimento iniciado',
  completed: 'Concluído',
  rescheduled: 'Reagendado',
  cancelled: 'Cancelado',
  missed: 'Não compareceu',
  fit_in_confirmed: 'Conflito confirmado'
};

export function AppointmentInspector(props: AppointmentInspectorProps) {
  const item = props.appointment;
  const date = new Date(item.date);
  const [confirmingEarlyStart, setConfirmingEarlyStart] = useState(false);
  const clientHistory = useMemo(() => props.appointments
    .filter(entry => entry.clientId === item.clientId && entry.id !== item.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  [props.appointments, item.clientId, item.id]);
  const lastCompleted = clientHistory.find(entry => entry.status === 'completed');
  const nextRecurring = clientHistory
    .filter(entry => entry.recurrenceId && new Date(entry.date).getTime() > Date.now() && entry.status !== 'cancelled')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
  const appointmentTime = new Date(item.date).getTime();
  const early = appointmentTime > Date.now();
  const canMarkMissed = appointmentTime <= Date.now() && ['scheduled', 'confirmed', 'arrived'].includes(item.status);
  const waitlistMatches = useMemo(() => {
    if (item.status !== 'cancelled') return [];
    const slot = new Date(item.date).getTime();
    return props.waitlistEntries.filter(entry => (
      entry.status === 'waiting' &&
      entry.serviceId === item.serviceId &&
      (!entry.professionalId || entry.professionalId === item.professionalId) &&
      new Date(entry.desiredFrom).getTime() <= slot &&
      new Date(entry.desiredTo).getTime() >= slot
    ));
  }, [item.status, item.date, item.serviceId, item.professionalId, props.waitlistEntries]);

  function change(status: AppointmentStatus, options?: { confirmEarlyStart?: boolean }) {
    props.onChangeStatus(item, status, options);
  }

  return (
    <aside className="appointment-inspector panel">
      <div className="inspector-head">
        <div>
          <span className="eyebrow">Atendimento</span>
          <h3>{item.client?.name ?? 'Cliente removido'}</h3>
        </div>
        <button type="button" className="icon-button" aria-label="Fechar detalhes" onClick={props.onClose}>×</button>
      </div>

      <div className="inspector-time-card">
        <strong>{formatTime(date, props.timeZone)}</strong>
        <span>
          {date.toLocaleDateString('pt-BR', {
            timeZone: props.timeZone,
            weekday: 'long',
            day: '2-digit',
            month: 'long'
          })}
        </span>
        <small>{item.durationMinutes} minutos • {item.professionalName}</small>
      </div>

      <div className="inspector-info-list">
        <div><span>Serviço</span><strong>{item.serviceName}</strong></div>
        <div><span>Valor</span><strong>{currencyFormatter.format(item.price)}</strong></div>
        <div>
          <span>Status</span>
          <strong className={`status ${item.status}`}>
            {appointmentStatusLabels[item.status]}
          </strong>
        </div>
        <div><span>Horário real</span><strong>{formatRealRange(item, props.timeZone)}</strong></div>
      </div>

      {item.notes ? <div className="inspector-note"><span>Observação</span><p>{item.notes}</p></div> : null}

      <PaymentProofPanel appointment={item} onReviewed={props.onPaymentReviewed} />

      {item.isFitIn ? (
        <div className="audit-badge warning-badge">
          Encaixe confirmado{item.fitInConflictAppointmentId ? ' com sobreposição auditada' : ''}.
        </div>
      ) : null}
      {item.source === 'retroactive' ? (
        <div className="audit-badge">
          Registrado posteriormente • aprovado{item.fitInConflictAppointmentId ? ' com conflito' : ''}
        </div>
      ) : null}
      {item.rescheduledAt ? (
        <div className="audit-badge">
          Reagendado • alteração registrada na linha do tempo
        </div>
      ) : null}

      <section className="inspector-quick-history">
        <div className="mini-section-heading">
          <strong>Histórico rápido do cliente</strong>
          <span>Contexto sem sair da agenda</span>
        </div>
        <div className="inspector-info-list compact-list">
          <div>
            <span>Última visita</span>
            <strong>
              {lastCompleted
                ? new Date(lastCompleted.date).toLocaleDateString('pt-BR', { timeZone: props.timeZone })
                : 'Sem histórico'}
            </strong>
          </div>
          <div><span>Último serviço</span><strong>{lastCompleted?.serviceName ?? '—'}</strong></div>
          <div>
            <span>Próxima recorrência</span>
            <strong>
              {nextRecurring
                ? `${new Date(nextRecurring.date).toLocaleDateString('pt-BR', { timeZone: props.timeZone })} • ${
                    formatTime(nextRecurring.date, props.timeZone)
                  }`
                : '—'}
            </strong>
          </div>
        </div>
      </section>

      <details className="appointment-timeline">
        <summary>
          <span>
            <strong>Linha do tempo</strong>
            <small>{item.timeline.length} {item.timeline.length === 1 ? 'evento' : 'eventos'}</small>
          </span>
          <span className="timeline-expand-label">Ver detalhes</span>
        </summary>
        <div className="timeline-list">
          {item.timeline.map((event, index) => (
            <div className="timeline-event" key={event.id}>
              <span className="timeline-marker" aria-hidden="true">
                <span className="timeline-dot" />
                {index < item.timeline.length - 1 ? <span className="timeline-line" /> : null}
              </span>
              <div className="timeline-event-content">
                <strong>{timelineLabels[event.type] ?? event.type}</strong>
                <time>{formatTimelineTimestamp(event.at, props.timeZone)}</time>
                {event.note ? <small>{formatTimelineNote(event.note, props.timeZone)}</small> : null}
              </div>
            </div>
          ))}
        </div>
      </details>

      {item.status === 'cancelled' && waitlistMatches.length ? (
        <section className="waitlist-match-box">
          <div className="mini-section-heading">
            <strong>Vaga liberada • lista de espera</strong>
            <span>{waitlistMatches.length} cliente(s) compatível(is)</span>
          </div>
          {waitlistMatches.map(entry => {
            const client = props.clients.find(candidate => candidate.id === entry.clientId);
            return (
              <div className="waitlist-match" key={entry.id}>
                <span>
                  <strong>{client?.name ?? 'Cliente'}</strong>
                  <small>{client?.phone ?? 'Telefone não disponível'}</small>
                </span>
                {props.whatsappEnabled ? (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => props.onWhatsAppClient(entry.clientId)}
                  >
                    WhatsApp
                  </button>
                ) : null}
              </div>
            );
          })}
        </section>
      ) : null}

      {confirmingEarlyStart ? (
        <div className="early-start-confirmation">
          <strong>Iniciar antes do horário programado?</strong>
          <span>O sistema vai registrar o horário real e que o início antecipado foi confirmado.</span>
          <div>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setConfirmingEarlyStart(false)}
            >
              Voltar
            </button>
            <button
              type="button"
              disabled={props.actionLoading}
              onClick={() => {
                change('in_service', { confirmEarlyStart: true });
                setConfirmingEarlyStart(false);
              }}
            >Confirmar início antecipado</button>
          </div>
        </div>
      ) : null}

      <div className="inspector-operation-footer">
        <div className="inspector-primary-action">
          {item.status === 'scheduled' ? (
            <button
              type="button"
              disabled={props.actionLoading}
              onClick={() => change('confirmed')}
            >Confirmar atendimento</button>
          ) : null}
          {item.status === 'confirmed' ? (
            <button
              type="button"
              disabled={props.actionLoading}
              onClick={() => change('arrived')}
            >Cliente chegou</button>
          ) : null}
          {item.status === 'arrived' ? (
            <button
              type="button"
              disabled={props.actionLoading}
              onClick={() => early ? setConfirmingEarlyStart(true) : change('in_service')}
            >Iniciar atendimento</button>
          ) : null}
          {item.status === 'in_service' ? (
            <button
              type="button"
              disabled={props.actionLoading}
              onClick={() => change('completed')}
            >✓ Concluir atendimento</button>
          ) : null}
        </div>

        {(props.whatsappEnabled && item.client) ||
        ['scheduled', 'confirmed', 'arrived'].includes(item.status) ||
        item.recurrenceId ? (
          <details className="inspector-more-actions">
            <summary>Mais ações</summary>
            <div>
              {props.whatsappEnabled && item.client ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={props.onWhatsApp}
                >WhatsApp</button>
              ) : null}
              {item.status === 'scheduled' ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => change('arrived')}
                >Registrar chegada</button>
              ) : null}
              {(item.status === 'scheduled' || item.status === 'confirmed') ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => early ? setConfirmingEarlyStart(true) : change('in_service')}
                >Iniciar atendimento</button>
              ) : null}
              {['scheduled', 'confirmed', 'arrived'].includes(item.status) ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={props.onReschedule}
                >Reagendar</button>
              ) : null}
              {canMarkMissed ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => change('missed')}
                >Não compareceu</button>
              ) : null}
              {['scheduled', 'confirmed', 'arrived'].includes(item.status) ? (
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => change('cancelled')}
                >Cancelar atendimento</button>
              ) : null}
              {item.recurrenceId ? (
                <button
                  type="button"
                  className="secondary-button"
                  disabled={props.actionLoading}
                  onClick={() => props.onToggleRecurrence(
                    item,
                    item.recurrencePaused ? 'resume' : 'pause'
                  )}
                >
                  {item.recurrencePaused ? 'Retomar recorrência' : 'Pausar recorrência'}
                </button>
              ) : null}
            </div>
          </details>
        ) : null}
      </div>
    </aside>
  );
}

function formatRealRange(item: Appointment, timeZone: string): string {
  if (!item.actualStartedAt && !item.completedAt) return 'Ainda não iniciado';
  const start = item.actualStartedAt ? formatTime(item.actualStartedAt, timeZone) : '—';
  const end = item.completedAt ? formatTime(item.completedAt, timeZone) : 'em andamento';
  return `${start} → ${end}`;
}
function formatTimelineTimestamp(value: string, timeZone: string): string {
  const date = new Date(value);
  const clock = date.toLocaleTimeString('pt-BR', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit'
  });
  return `${date.toLocaleDateString('pt-BR', { timeZone })} às ${clock}`;
}

function formatTimelineNote(note: string, timeZone: string): string {
  return note.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/g, value => {
    const date = new Date(value);
    const clock = date.toLocaleTimeString('pt-BR', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit'
    });
    return `${date.toLocaleDateString('pt-BR', { timeZone })} às ${clock}`;
  });
}

