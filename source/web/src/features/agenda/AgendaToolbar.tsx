import type { AppointmentStatus, Professional } from '../../domain/types';
import type { AgendaView } from './agenda.helpers';
import { formatDayHeading, formatMonthHeading } from './agenda.helpers';

interface AgendaToolbarProps {
  view: AgendaView;
  selectedDate: string;
  professionalId: string;
  status: AppointmentStatus | 'all';
  search: string;
  professionals: Professional[];
  onViewChange: (view: AgendaView) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onProfessionalChange: (value: string) => void;
  onStatusChange: (value: AppointmentStatus | 'all') => void;
  onSearchChange: (value: string) => void;
}

export function AgendaToolbar(props: AgendaToolbarProps) {
  return (
    <div className="agenda-toolbar panel">
      <div className="agenda-date-navigation">
        <button className="secondary-button" type="button" onClick={props.onToday}>
          Hoje
        </button>
        <button
          className="calendar-nav-button"
          type="button"
          aria-label="Período anterior"
          onClick={props.onPrevious}
        >
          ‹
        </button>
        <div>
          <strong>
            {props.view === 'month'
              ? formatMonthHeading(props.selectedDate)
              : formatDayHeading(props.selectedDate)}
          </strong>
          <span>Agenda operacional</span>
        </div>
        <button
          className="calendar-nav-button"
          type="button"
          aria-label="Próximo período"
          onClick={props.onNext}
        >
          ›
        </button>
      </div>

      <div className="agenda-view-switch" aria-label="Visualização da agenda">
        {(['day', 'week', 'month'] as AgendaView[]).map(view => (
          <button
            key={view}
            type="button"
            className={props.view === view ? 'active' : ''}
            onClick={() => props.onViewChange(view)}
          >
            {{ day: 'Dia', week: 'Semana', month: 'Mês' }[view]}
          </button>
        ))}
      </div>

      <div className="agenda-filter-row">
        <label>
          <span>Profissional</span>
          <select
            value={props.professionalId}
            onChange={event => props.onProfessionalChange(event.target.value)}
          >
            <option value="all">Todos</option>
            {props.professionals.filter(item => item.active && item.servesClients).map(item => (
              <option key={item.id} value={item.id}>{item.professionalName || item.name}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Status</span>
          <select
            value={props.status}
            onChange={event => {
              props.onStatusChange(event.target.value as AppointmentStatus | 'all');
            }}
          >
            <option value="all">Todos</option>
            <option value="scheduled">Agendados</option>
            <option value="confirmed">Confirmados</option>
            <option value="arrived">Cliente chegou</option>
            <option value="in_service">Em atendimento</option>
            <option value="completed">Concluídos</option>
            <option value="missed">Faltas</option>
            <option value="cancelled">Cancelados</option>
          </select>
        </label>

        <label className="agenda-search-field">
          <span>Buscar</span>
          <input
            value={props.search}
            onChange={event => props.onSearchChange(event.target.value)}
            placeholder="Cliente, serviço ou profissional"
          />
        </label>
      </div>
    </div>
  );
}
