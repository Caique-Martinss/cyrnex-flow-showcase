import { useMemo } from 'react';
import type { BusinessSettings } from '../../domain/types';
import { addDaysToDateText, businessDateTimeInputToUtc, getDateTextInTimeZone } from '../../utils/businessTime';
import { fromDateText } from './agenda.helpers';
import { SmartCalendar } from './SmartCalendar';

interface OfficialDateTimePickerProps {
  settings: BusinessSettings;
  value: string;
  onChange: (value: string) => void;
  allowPast?: boolean;
  label?: string;
}

export function OfficialDateTimePicker({
  settings,
  value,
  onChange,
  allowPast = false,
  label = 'Data e horário'
}: OfficialDateTimePickerProps) {
  const today = getDateTextInTimeZone(new Date(), settings.timezone);
  const defaultDate = allowPast ? addDaysToDateText(today, -1) : today;
  const selectedDate = value?.slice(0, 10) || defaultDate;
  const selectedTime = value?.slice(11, 16) || '';
  const interval = Math.max(5, settings.businessHours.slotIntervalMinutes || 15);
  const times = useMemo(() => buildTimes(interval), [interval]);

  function selectDate(dateText: string) {
    onChange(selectedTime ? `${dateText}T${selectedTime}` : `${dateText}T09:00`);
  }

  return (
    <div className="official-datetime-picker">
      <span className="field-caption">{label}</span>
      <div className="booking-picker-layout">
        <SmartCalendar
          settings={settings}
          selectedDate={selectedDate}
          pastOnly={allowPast}
          respectBusinessHours={!allowPast}
          onSelect={selectDate}
        />
        <div className="smart-time-panel compact-time-panel">
          <span className="field-caption">Horário</span>
          <div className="smart-time-grid scrollable-time-grid">
            {times.map(time => {
              const candidate = businessDateTimeInputToUtc(
                `${selectedDate}T${time}`,
                settings.timezone
              );
              const invalidPast = !allowPast && Boolean(candidate && candidate.getTime() < Date.now());
              const invalidFuture = allowPast && Boolean(candidate && candidate.getTime() >= Date.now());
              const disabled = !candidate || invalidPast || invalidFuture;
              return (
                <button
                  key={time}
                  type="button"
                  disabled={disabled}
                  className={`smart-time-slot ${
                    selectedTime === time
                      ? 'selected available'
                      : disabled
                        ? 'past'
                        : 'available'
                  }`}
                  onClick={() => onChange(`${selectedDate}T${time}`)}
                >
                  <strong>{time}</strong>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {value ? (
        <small className="picker-selection-summary">
          Selecionado: {fromDateText(selectedDate).toLocaleDateString('pt-BR')} às {selectedTime}
        </small>
      ) : null}
    </div>
  );
}

function buildTimes(interval: number): string[] {
  const result: string[] = [];
  for (let minutes = 0; minutes < 24 * 60; minutes += interval) {
    const hour = String(Math.floor(minutes / 60)).padStart(2, '0');
    const minute = String(minutes % 60).padStart(2, '0');
    result.push(`${hour}:${minute}`);
  }
  return result;
}
