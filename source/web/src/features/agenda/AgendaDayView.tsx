import { appointmentStatusLabels } from '../../app/constants';
import type {
  Appointment,
  BusinessSettings,
  Professional,
  ScheduleBlock,
  Service
} from '../../domain/types';
import {
  appointmentDateText,
  buildProfessionalTimeline,
  formatTime,
  isTodayText,
  toLocalDateTimeInput
} from './agenda.helpers';

interface AgendaDayViewProps {
  settings: BusinessSettings;
  dateText: string;
  professionals: Professional[];
  appointments: Appointment[];
  blocks: ScheduleBlock[];
  services: Service[];
  visibleAppointmentIds: Set<string>;
  filterLabel: string;
  focusMode: boolean;
  onClearFilters: () => void;
  onNewAppointmentAt: (date: string, professionalId?: string) => void;
  onNewBlockAt: (date: string, professionalId?: string) => void;
  onOpenAppointment: (appointment: Appointment) => void;
  onDeleteBlock: (block: ScheduleBlock) => void;
}

export function AgendaDayView(props: AgendaDayViewProps) {
  const activeProfessionals = props.professionals.filter(
    item => item.active && item.servesClients
  );

  if (!activeProfessionals.length) {
    return (
      <div className="agenda-empty-state">
        <strong>Nenhum profissional ativo para esta agenda.</strong>
        <span>Revise a equipe em Configurações.</span>
      </div>
    );
  }

  return (
    <div className={`agenda-day-columns ${activeProfessionals.length > 1 ? 'team' : 'solo'}`}>
      {activeProfessionals.map(professional => {
        const timeline = buildProfessionalTimeline({
          settings: props.settings,
          dateText: props.dateText,
          professional,
          appointments: props.appointments,
          blocks: props.blocks,
          services: props.services
        });
        const dayAppointments = timeline.filter(item => item.kind === 'appointment');
        const dayFree = timeline.filter(item => item.kind === 'free');
        const hiddenAppointments = dayAppointments.filter(
          item => !props.visibleAppointmentIds.has(item.appointment.id)
        ).length;
        const now = Date.now();
        const filteredTimeline = timeline.filter(item => {
          if (!props.focusMode || !isTodayText(props.dateText, props.settings.timezone)) return true;
          if (item.kind === 'appointment') {
            if (item.appointment.status === 'in_service') return true;
            if (['completed', 'missed', 'cancelled'].includes(item.appointment.status)) return false;
          }
          return item.endsAt.getTime() >= now;
        });
        const visibleTimeline = filteredTimeline.filter(item => (
          item.kind !== 'appointment' || props.visibleAppointmentIds.has(item.appointment.id)
        ));
        const terminalMatches = props.filterLabel
          ? props.appointments
              .filter(item => (
                item.professionalId === professional.id &&
                ['cancelled', 'missed'].includes(item.status) &&
                props.visibleAppointmentIds.has(item.id) &&
                appointmentDateText(item, props.settings.timezone) === props.dateText
              ))
              .map(appointment => ({
                id: `terminal-${appointment.id}`,
                kind: 'appointment' as const,
                startsAt: new Date(appointment.date),
                endsAt: new Date(new Date(appointment.date).getTime() + appointment.durationMinutes * 60_000),
                appointment
              }))
          : [];
        const displayTimeline = [...visibleTimeline, ...terminalMatches]
          .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

        return (
          <section className="agenda-professional-column" key={professional.id}>
            <header className="agenda-professional-header">
              <div className="professional-avatar">
                {(professional.professionalName || professional.name).slice(0, 1).toUpperCase()}
              </div>
              <div>
                <strong>{professional.professionalName || professional.name}</strong>
                <span>
                  {dayAppointments.length} atendimento(s) • {dayFree.length} bloco(s) livre(s)
                </span>
              </div>
            </header>

            {isTodayText(props.dateText, props.settings.timezone) ? (
              <div className="now-marker"><span /> Agora • {formatTime(new Date(), props.settings.timezone)}</div>
            ) : null}

            {props.filterLabel ? (
              <div className="filter-results-heading">
                <strong>Resultados do filtro — {props.filterLabel}</strong>
              </div>
            ) : null}

            <div className="agenda-day-stream">
              {displayTimeline.length ? displayTimeline.map(item => {
                if (item.kind === 'appointment') {
                  const delayWarning = getDelayWarning(
                    item.appointment,
                    props.appointments,
                    now,
                    props.settings.timezone
                  );
                  return (
                    <button
                      type="button"
                      className={`agenda-event-card ${item.appointment.status}`}
                      key={item.id}
                      onClick={() => props.onOpenAppointment(item.appointment)}
                    >
                      <span className="agenda-event-time">
                        {formatTime(item.startsAt, props.settings.timezone)}
                        <small>até {formatTime(item.endsAt, props.settings.timezone)}</small>
                      </span>
                      <span className="agenda-event-copy">
                        <strong>{item.appointment.client?.name ?? 'Cliente removido'}</strong>
                        <small>{item.appointment.serviceName}</small>
                        {item.appointment.paymentProofStatus === 'submitted' ? (
                          <em className="payment-proof-attention">Comprovante recebido • revisar</em>
                        ) : item.appointment.depositAmount > 0 && item.appointment.depositStatus === 'pending' ? (
                          <em className="payment-proof-pending">Sinal ainda pendente</em>
                        ) : null}
                        {item.appointment.notes ? <em>{item.appointment.notes}</em> : null}
                        {delayWarning ? <em className="delay-warning">{delayWarning}</em> : null}
                      </span>
                      <span className={`status ${item.appointment.status}`}>
                        {appointmentStatusLabels[item.appointment.status]}
                      </span>
                    </button>
                  );
                }

                if (item.kind === 'block') {
                  return (
                    <div className="agenda-block-card" key={item.id}>
                      <span className="agenda-event-time">
                        {formatTime(item.startsAt, props.settings.timezone)}
                        <small>até {formatTime(item.endsAt, props.settings.timezone)}</small>
                      </span>
                      <span className="agenda-event-copy">
                        <strong>{getBlockLabel(item.block.blockType)}</strong>
                        <small>{item.block.reason}</small>
                      </span>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label="Remover bloqueio"
                        title="Remover bloqueio"
                        onClick={() => props.onDeleteBlock(item.block)}
                      >
                        ×
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="agenda-free-card" key={item.id}>
                    <span className="agenda-event-time">
                      {formatTime(item.startsAt, props.settings.timezone)}
                      <small>até {formatTime(item.endsAt, props.settings.timezone)}</small>
                    </span>
                    <span className="agenda-event-copy">
                      <strong>Horário livre</strong>
                      <small>Disponível pelas regras atuais da agenda</small>
                    </span>
                    <div className="agenda-free-actions">
                      <button
                        type="button"
                        onClick={() => props.onNewAppointmentAt(
                          toLocalDateTimeInput(item.startsAt, props.settings.timezone),
                          professional.id
                        )}
                      >
                        Agendar
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => props.onNewBlockAt(
                          toLocalDateTimeInput(item.startsAt, props.settings.timezone),
                          professional.id
                        )}
                      >
                        Bloquear
                      </button>
                    </div>
                  </div>
                );
              }) : (
                <div className="agenda-empty-state compact">
                  <strong>
                    {props.filterLabel
                      ? 'Nenhum atendimento encontrado com esses filtros.'
                      : props.focusMode && isTodayText(props.dateText, props.settings.timezone)
                        ? 'Nenhum próximo atendimento precisa de atenção agora.'
                        : 'Sem expediente ou eventos neste dia.'}
                  </strong>
                  <span>
                    {props.filterLabel
                      ? 'Tente remover um dos filtros ou escolher outra data.'
                      : 'Escolha outra data ou revise os horários configurados.'}
                  </span>
                  {props.filterLabel ? (
                    <button type="button" className="secondary-button" onClick={props.onClearFilters}>
                      Limpar filtros
                    </button>
                  ) : null}
                </div>
              )}
            </div>

            {props.filterLabel && hiddenAppointments > 0 ? (
              <div className="filtered-occupied-summary">
                <span>
                  Outros horários ocupados hoje — {hiddenAppointments} atendimento(s) oculto(s) pelo filtro
                </span>
                <button type="button" className="text-button" onClick={props.onClearFilters}>Ver</button>
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function getDelayWarning(
  appointment: Appointment,
  appointments: Appointment[],
  now: number,
  timeZone: string
): string {
  if (appointment.status !== 'in_service') return '';
  const plannedEnd = new Date(appointment.date).getTime() + appointment.durationMinutes * 60_000;
  if (now <= plannedEnd) return '';
  const next = appointments
    .filter(item => (
      item.id !== appointment.id &&
      item.professionalId === appointment.professionalId &&
      !['completed', 'missed', 'cancelled'].includes(item.status) &&
      new Date(item.date).getTime() >= plannedEnd
    ))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
  if (!next) return '';
  return `Atenção: o horário previsto terminou e o atendimento de ${
    formatTime(next.date, timeZone)
  } pode ser afetado.`;
}

function getBlockLabel(type: ScheduleBlock['blockType']): string {
  const labels: Record<ScheduleBlock['blockType'], string> = {
    break: 'Pausa',
    closed: 'Fechado',
    personal: 'Compromisso pessoal',
    maintenance: 'Manutenção',
    other: 'Horário bloqueado'
  };
  return labels[type];
}
