import { useMemo } from 'react';
import type { Appointment, BusinessSettings, Professional, ScheduleBlock, Service } from '../../domain/types';
import {
  appointmentDateText,
  buildProfessionalTimeline,
  isCountedAppointmentStatus,
  isTodayText
} from './agenda.helpers';
import { CollapsibleAgendaSection } from './CollapsibleAgendaSection';

interface DaySummaryProps {
  dateText: string;
  settings: BusinessSettings;
  appointments: Appointment[];
  professionals: Professional[];
  blocks: ScheduleBlock[];
  services: Service[];
  focusMode: boolean;
  onToggleFocus: () => void;
}

export function DaySummary(props: DaySummaryProps) {
  const summary = useMemo(() => {
    const dayAppointments = props.appointments.filter(item => (
      appointmentDateText(item, props.settings.timezone) === props.dateText &&
      isCountedAppointmentStatus(item.status)
    ));
    const missed = props.appointments.filter(item => (
      appointmentDateText(item, props.settings.timezone) === props.dateText && item.status === 'missed'
    )).length;
    const cancelled = props.appointments.filter(item => (
      appointmentDateText(item, props.settings.timezone) === props.dateText && item.status === 'cancelled'
    )).length;
    const freeBlocks = props.professionals.reduce((total, professional) => {
      const timeline = buildProfessionalTimeline({
        settings: props.settings,
        dateText: props.dateText,
        professional,
        appointments: props.appointments,
        blocks: props.blocks,
        services: props.services
      });
      return total + timeline.filter(item => item.kind === 'free').length;
    }, 0);
    return {
      total: dayAppointments.length,
      confirmed: dayAppointments.filter(item => item.status === 'confirmed').length,
      awaiting: dayAppointments.filter(item => item.status === 'scheduled').length,
      inService: dayAppointments.filter(item => item.status === 'in_service').length,
      arrived: dayAppointments.filter(item => item.status === 'arrived').length,
      completed: dayAppointments.filter(item => item.status === 'completed').length,
      missed,
      cancelled,
      freeBlocks
    };
  }, [props]);

  const today = isTodayText(props.dateText, props.settings.timezone);

  return (
    <CollapsibleAgendaSection
      storageKey="day-summary"
      eyebrow="Resumo do dia"
      title={today
        ? 'Hoje'
        : new Date(`${props.dateText}T12:00:00`).toLocaleDateString('pt-BR')}
      summary={`${summary.total} atendimento(s) • ${summary.inService} em atendimento`}
      criticalSummary={summary.inService ? <strong>{summary.inService} atendimento(s) em andamento</strong> : null}
    >
      <div className="day-summary-grid">
        <div><strong>{summary.total}</strong><span>atendimentos válidos</span></div>
        <div><strong>{summary.confirmed}</strong><span>confirmados</span></div>
        <div><strong>{summary.awaiting}</strong><span>aguardando confirmação</span></div>
        <div><strong>{summary.arrived}</strong><span>já chegaram</span></div>
        <div><strong>{summary.inService}</strong><span>em atendimento</span></div>
        <div><strong>{summary.completed}</strong><span>concluídos</span></div>
      </div>
      {(summary.missed || summary.cancelled) ? (
        <div className="day-summary-history-note">
          <span>{summary.missed} falta(s)</span>
          <span>{summary.cancelled} cancelado(s)</span>
          <small>Faltas e cancelamentos ficam no histórico, mas não entram no total operacional.</small>
        </div>
      ) : null}
      <div className="day-summary-availability">
        <strong>{summary.freeBlocks}</strong> bloco(s) livre(s) pelas regras atuais.
      </div>
      {today ? (
        <div className="focus-mode-row">
          <div>
            <strong>Modo foco</strong>
            <span>Oculta o que já terminou e prioriza o que ainda importa hoje.</span>
          </div>
          <button
            type="button"
            className={props.focusMode ? '' : 'secondary-button'}
            onClick={props.onToggleFocus}
          >
            {props.focusMode ? 'Mostrar agenda completa' : 'Mostrar próximos atendimentos'}
          </button>
        </div>
      ) : null}
    </CollapsibleAgendaSection>
  );
}

