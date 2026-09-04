import type { DaySchedule, Professional } from '../../domain/types';
import { weekdayLabels } from './onboarding.constants';

interface ProfessionalHoursEditorProps {
  professional: Professional;
  businessSchedule: DaySchedule[];
  onChange: (patch: Partial<Professional>) => void;
}

export function ProfessionalHoursEditor(props: ProfessionalHoursEditorProps) {
  const custom = props.professional.weeklySchedule;

  function enableCustom() {
    props.onChange({ weeklySchedule: structuredClone(props.businessSchedule) });
  }

  function updateDay(weekday: number, patch: Partial<DaySchedule>) {
    if (!custom) return;
    props.onChange({
      weeklySchedule: custom.map(day => {
        if (day.weekday !== weekday) return day;
        const next = { ...day, ...patch };
        if (patch.opensAt !== undefined || patch.closesAt !== undefined) {
          next.periods = next.enabled
            ? [{
                id: `professional-${props.professional.id}-${weekday}`,
                startsAt: next.opensAt,
                endsAt: next.closesAt
              }]
            : [];
          next.breakEnabled = false;
          next.breakStartsAt = null;
          next.breakEndsAt = null;
        }
        return next;
      })
    });
  }

  return (
    <div className="professional-hours-editor">
      <div className="professional-hours-heading">
        <div>
          <strong>Horário deste profissional</strong>
          <small>
            {custom
              ? 'A Agenda usa a interseção entre o expediente da barbearia e estes horários.'
              : 'Usa automaticamente o expediente geral da barbearia.'}
          </small>
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={() => custom ? props.onChange({ weeklySchedule: null }) : enableCustom()}
        >
          {custom ? 'Usar horário da barbearia' : 'Definir horário próprio'}
        </button>
      </div>

      {custom ? (
        <div className="professional-hours-list">
          {custom.map(day => (
            <div className="professional-hours-row" key={day.weekday}>
              <label className="professional-day-toggle">
                <input
                  type="checkbox"
                  checked={day.enabled}
                  onChange={event => updateDay(day.weekday, { enabled: event.target.checked })}
                />
                <strong>{weekdayLabels[day.weekday].replace('-feira', '')}</strong>
              </label>
              {day.enabled ? (
                <>
                  <label>
                    <span>Entrada</span>
                    <input
                      type="time"
                      value={day.opensAt}
                      onChange={event => updateDay(day.weekday, { opensAt: event.target.value })}
                    />
                  </label>
                  <label>
                    <span>Saída</span>
                    <input
                      type="time"
                      value={day.closesAt}
                      onChange={event => updateDay(day.weekday, { closesAt: event.target.value })}
                    />
                  </label>
                </>
              ) : <span className="professional-day-off">Folga</span>}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
