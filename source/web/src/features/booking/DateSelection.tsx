import type { Dispatch, SetStateAction } from 'react';
import type { BookingFormState } from '../../domain/forms';
import type { BusinessSettings } from '../../domain/types';
import { SmartCalendar } from '../agenda/SmartCalendar';
import { toDateInputValue } from '../../utils/dates';

interface DateSelectionProps {
  settings: BusinessSettings;
  bookingForm: BookingFormState;
  setBookingForm: Dispatch<SetStateAction<BookingFormState>>;
  bookingDateOptions: Date[];
}

export function DateSelection({
  settings,
  bookingForm,
  setBookingForm,
  bookingDateOptions
}: DateSelectionProps) {
  return (
    <div className="date-selection">
      <div className="availability-heading">
        <div>
          <span className="eyebrow">1. Escolha o dia</span>
          <strong>Datas disponíveis</strong>
        </div>
      </div>

      <div className="date-strip">
        {bookingDateOptions.map((date, index) => {
          const value = toDateInputValue(date);
          const selected = bookingForm.date === value;
          return (
            <button
              key={value}
              type="button"
              className={`date-option ${selected ? 'selected' : ''}`}
              onClick={() => setBookingForm(current => ({ ...current, date: value }))}
            >
              <span>{formatWeekday(date, index)}</span>
              <strong>{date.getDate()}</strong>
              <small>{formatMonth(date)}</small>
            </button>
          );
        })}
      </div>

      <SmartCalendar
        settings={settings}
        selectedDate={bookingForm.date}
        onSelect={date => setBookingForm(current => ({ ...current, date }))}
      />
    </div>
  );
}

function formatWeekday(date: Date, index: number): string {
  if (index === 0) return 'Hoje';
  return date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
}

function formatMonth(date: Date): string {
  return date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
}
