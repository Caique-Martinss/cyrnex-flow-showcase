import { useMemo, useState } from 'react';
import type { BusinessSettings } from '../../domain/types';
import { getDateTextInTimeZone } from '../../utils/businessTime';
import {
  formatMonthHeading,
  fromDateText,
  getMaximumBookingDate,
  getMonthGrid,
  getDaySchedule,
  toDateText
} from './agenda.helpers';

interface SmartCalendarProps {
  settings: BusinessSettings;
  selectedDate: string;
  onSelect: (dateText: string) => void;
  allowPast?: boolean;
  pastOnly?: boolean;
  allowFuture?: boolean;
  respectBusinessHours?: boolean;
}

const weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export function SmartCalendar({
  settings,
  selectedDate,
  onSelect,
  allowPast = false,
  pastOnly = false,
  allowFuture = true,
  respectBusinessHours = true
}: SmartCalendarProps) {
  const [visibleMonth, setVisibleMonth] = useState(
    selectedDate || getDateTextInTimeZone(new Date(), settings.timezone)
  );
  const days = useMemo(() => getMonthGrid(visibleMonth), [visibleMonth]);
  const visibleDate = fromDateText(visibleMonth);
  const today = getDateTextInTimeZone(new Date(), settings.timezone);
  const maxDate = getMaximumBookingDate(settings);

  function moveMonth(delta: number) {
    const next = new Date(
      visibleDate.getFullYear(),
      visibleDate.getMonth() + delta,
      1,
      12
    );
    setVisibleMonth(toDateText(next));
  }

  return (
    <div className="smart-calendar">
      <div className="smart-calendar-head">
        <button
          type="button"
          className="calendar-nav-button"
          aria-label="Mês anterior"
          onClick={() => moveMonth(-1)}
        >
          ‹
        </button>
        <strong>{formatMonthHeading(visibleMonth)}</strong>
        <button
          type="button"
          className="calendar-nav-button"
          aria-label="Próximo mês"
          onClick={() => moveMonth(1)}
        >
          ›
        </button>
      </div>

      <div className="smart-calendar-weekdays">
        {weekdays.map(day => <span key={day}>{day}</span>)}
      </div>

      <div className="smart-calendar-grid">
        {days.map(dateText => {
          const date = fromDateText(dateText);
          const outsideMonth = date.getMonth() !== visibleDate.getMonth();
          const closed = !getDaySchedule(settings, dateText);
          const disabled = pastOnly
            ? dateText >= today
            : (!allowPast && dateText < today) ||
              (!allowFuture && dateText > today) ||
              (allowFuture && dateText > maxDate) ||
              (respectBusinessHours && closed);
          const selected = dateText === selectedDate;
          const isToday = dateText === today;

          return (
            <button
              key={dateText}
              type="button"
              disabled={disabled}
              className={[
                outsideMonth ? 'outside' : '',
                selected ? 'selected' : '',
                isToday ? 'today' : '',
                closed ? 'closed' : ''
              ].filter(Boolean).join(' ')}
              title={respectBusinessHours && closed ? 'Estabelecimento fechado neste dia' : undefined}
              onClick={() => onSelect(dateText)}
            >
              <span>{date.getDate()}</span>
              {isToday ? <small>Hoje</small> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
