import type {
  Appointment,
  BusinessSettings,
  Professional
} from '../../domain/types';
import {
  addDaysText,
  appointmentDateText,
  formatShortDay,
  formatTime,
  getDaySchedule,
  getProfessionalWorkingMinutes,
  isCountedAppointmentStatus,
  startOfWeekText
} from './agenda.helpers';
import { getDateTextInTimeZone } from '../../utils/businessTime';

interface AgendaWeekViewProps {
  settings: BusinessSettings;
  selectedDate: string;
  appointments: Appointment[];
  professionals: Professional[];
  onSelectDay: (dateText: string) => void;
}

export function AgendaWeekView(props: AgendaWeekViewProps) {
  const start = startOfWeekText(props.selectedDate);
  const days = Array.from({ length: 7 }, (_, index) => addDaysText(start, index));
  const today = getDateTextInTimeZone(new Date(), props.settings.timezone);

  return (
    <div className="agenda-week-grid">
      {days.map(dateText => {
        const appointments = props.appointments.filter(item => (
          appointmentDateText(item, props.settings.timezone) === dateText &&
          isCountedAppointmentStatus(item.status)
        ));
        const schedule = getDaySchedule(props.settings, dateText);
        const totalMinutes = schedule
          ? props.professionals.reduce(
              (sum, professional) => sum + getProfessionalWorkingMinutes(
                props.settings,
                professional,
                dateText
              ),
              0
            )
          : 0;
        const busyMinutes = appointments.reduce(
          (sum, item) => sum + item.durationMinutes + (item.bufferAfterMinutes ?? 0),
          0
        );
        const occupancy = totalMinutes
          ? Math.min(100, Math.round(busyMinutes / totalMinutes * 100))
          : 0;

        return (
          <button
            type="button"
            key={dateText}
            className={`agenda-week-day ${dateText === today ? 'today' : ''}`}
            onClick={() => props.onSelectDay(dateText)}
          >
            <div className="agenda-week-day-head">
              <strong>{formatShortDay(dateText)}</strong>
              <span>{schedule ? `${occupancy}%` : 'Fechado'}</span>
            </div>
            <div className="week-occupancy-track">
              <span style={{ width: `${occupancy}%` }} />
            </div>
            <strong className="week-count">{appointments.length}</strong>
            <small>{appointments.length === 1 ? 'atendimento' : 'atendimentos'}</small>
            <div className="week-preview-list">
              {appointments.slice(0, 3).map(item => (
                <span key={item.id}>
                  {formatTime(item.date, props.settings.timezone)} • {item.client?.name ?? 'Cliente'}
                </span>
              ))}
              {appointments.length > 3 ? (
                <em>+ {appointments.length - 3} atendimento(s)</em>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}

