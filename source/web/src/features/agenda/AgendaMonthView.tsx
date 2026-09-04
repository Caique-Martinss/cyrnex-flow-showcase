import type { Appointment, BusinessSettings } from '../../domain/types';
import {
  appointmentDateText,
  formatMonthHeading,
  fromDateText,
  getDaySchedule,
  getMonthGrid,
  isCountedAppointmentStatus
} from './agenda.helpers';
import { getDateTextInTimeZone } from '../../utils/businessTime';

interface AgendaMonthViewProps {
  settings: BusinessSettings;
  selectedDate: string;
  appointments: Appointment[];
  onSelectDay: (dateText: string) => void;
}

const weekdayLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export function AgendaMonthView(props: AgendaMonthViewProps) {
  const days = getMonthGrid(props.selectedDate);
  const selectedMonth = fromDateText(props.selectedDate).getMonth();
  const today = getDateTextInTimeZone(new Date(), props.settings.timezone);

  return (
    <div className="agenda-month-wrap">
      <div className="agenda-month-title">{formatMonthHeading(props.selectedDate)}</div>
      <div className="agenda-month-weekdays">
        {weekdayLabels.map(item => <span key={item}>{item}</span>)}
      </div>
      <div className="agenda-month-grid">
        {days.map(dateText => {
          const date = fromDateText(dateText);
          const appointments = props.appointments.filter(item => (
            appointmentDateText(item, props.settings.timezone) === dateText &&
            isCountedAppointmentStatus(item.status)
          ));
          const outside = date.getMonth() !== selectedMonth;
          const closed = !getDaySchedule(props.settings, dateText);
          const count = appointments.length;

          return (
            <button
              type="button"
              key={dateText}
              className={[
                'agenda-month-day', outside ? 'outside' : '',
                dateText === today ? 'today' : '', closed ? 'closed' : '',
                count ? 'has-appointments' : ''
              ].filter(Boolean).join(' ')}
              onClick={() => props.onSelectDay(dateText)}
            >
              <span className="month-day-number">{date.getDate()}</span>
              <span className="month-day-content">
                <strong className="month-day-title">
                  {closed
                    ? 'Fechado'
                    : count
                      ? `${count} atendimento${count === 1 ? '' : 's'}`
                      : 'Sem atendimentos'}
                </strong>
                <small className="month-day-hint">
                  {closed ? 'Sem expediente' : count ? 'Toque para ver o dia' : 'Agenda livre'}
                </small>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
