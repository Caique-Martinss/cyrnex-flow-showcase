import type { Dispatch, SetStateAction } from 'react';
import type { AppointmentFormState } from '../../domain/forms';
import type { Service } from '../../domain/types';

interface RecurrenceEditorProps {
  form: AppointmentFormState;
  setForm: Dispatch<SetStateAction<AppointmentFormState>>;
  services: Service[];
}

const weekdayOptions = [
  [1, 'Seg'],
  [2, 'Ter'],
  [3, 'Qua'],
  [4, 'Qui'],
  [5, 'Sex'],
  [6, 'Sáb'],
  [0, 'Dom']
] as const;

export function RecurrenceEditor({ form, setForm, services }: RecurrenceEditorProps) {
  return (
    <section className="recurrence-editor">
      <label className="review-confirmation">
        <input
          type="checkbox"
          checked={form.recurrenceEnabled}
          onChange={event => setForm(current => ({
            ...current,
            recurrenceEnabled: event.target.checked
          }))}
        />
        <span>
          <strong>Repetir este agendamento</strong>
          <small>Cria uma sequência usando a mesma validação de disponibilidade.</small>
        </span>
      </label>

      {form.recurrenceEnabled ? (
        <div className="recurrence-fields">
          <label>
            Frequência
            <select
              value={form.recurrenceFrequency}
              onChange={event => setForm(current => ({
                ...current,
                recurrenceFrequency: event.target.value as AppointmentFormState['recurrenceFrequency']
              }))}
            >
              <option value="weekly">Toda semana</option>
              <option value="biweekly">A cada duas semanas</option>
              <option value="monthly">Mensal</option>
              <option value="custom">Personalizado</option>
            </select>
          </label>

          <label>
            Quantos atendimentos?
            <input
              type="number"
              min="2"
              max="52"
              value={form.recurrenceCount}
              onChange={event => setForm(current => ({
                ...current,
                recurrenceCount: event.target.value
              }))}
            />
          </label>

          {form.recurrenceFrequency === 'custom' ? (
            <label>
              Repetir a cada
              <select
                value={form.recurrenceIntervalWeeks}
                onChange={event => setForm(current => ({
                  ...current,
                  recurrenceIntervalWeeks: event.target.value
                }))}
              >
                {[1, 2, 3, 4, 6, 8].map(value => (
                  <option key={value} value={value}>{value} semana(s)</option>
                ))}
              </select>
            </label>
          ) : null}

          {form.recurrenceFrequency !== 'monthly' ? (
            <div className="recurrence-weekdays">
              <span>Dias da semana</span>
              <div>
                {weekdayOptions.map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    className={form.recurrenceWeekdays.includes(value) ? 'active' : ''}
                    onClick={() => setForm(current => ({
                      ...current,
                      recurrenceWeekdays: current.recurrenceWeekdays.includes(value)
                        ? current.recurrenceWeekdays.filter(item => item !== value)
                        : [...current.recurrenceWeekdays, value]
                    }))}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="recurrence-services">
            <span>Alternar serviços (opcional)</span>
            <small>A ordem escolhida vira o ciclo da sequência.</small>
            <div>
              {services.filter(item => item.active).map(service => (
                <label key={service.id} className="review-confirmation compact-check">
                  <input
                    type="checkbox"
                    checked={form.recurrenceServiceIds.includes(service.id)}
                    onChange={event => setForm(current => ({
                      ...current,
                      recurrenceServiceIds: event.target.checked
                        ? [
                            ...current.recurrenceServiceIds.filter(id => id !== service.id),
                            service.id
                          ]
                        : current.recurrenceServiceIds.filter(id => id !== service.id)
                    }))}
                  />
                  <span>{service.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
