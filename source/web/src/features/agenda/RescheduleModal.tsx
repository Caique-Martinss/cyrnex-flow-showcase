import { useEffect, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import type { Appointment, AvailabilityResponse, BusinessSettings, Service } from '../../domain/types';
import { loadAdminAvailability } from '../../services';
import { appointmentDateText, formatTime, toLocalDateTimeInput } from './agenda.helpers';
import { SmartCalendar } from './SmartCalendar';

interface RescheduleModalProps {
  appointment: Appointment;
  service: Service | undefined;
  settings: BusinessSettings;
  actionLoading: boolean;
  onSubmit: (date: string, scope?: 'this' | 'future' | 'all') => void;
  onClose: () => void;
}

export function RescheduleModal(props: RescheduleModalProps) {
  const [selectedDate, setSelectedDate] = useState(appointmentDateText(props.appointment, props.settings.timezone));
  const [selectedSlot, setSelectedSlot] = useState('');
  const [scope, setScope] = useState<'this' | 'future' | 'all'>('this');
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!props.service) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    void loadAdminAvailability({
      serviceId: props.service.id,
      professionalId: props.appointment.professionalId,
      date: selectedDate,
      ignoredAppointmentId: props.appointment.id
    })
      .then(result => { if (!cancelled) setAvailability(result); })
      .catch(reason => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Não foi possível carregar os horários.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [props.appointment.id, props.appointment.professionalId, props.service, selectedDate]);

  return (
    <Modal
      title="Reagendar atendimento"
      description={`Horário atual: ${formatTime(props.appointment.date, props.settings.timezone)}`}
      onClose={props.onClose}
    >
      {props.appointment.recurrenceId ? (
        <fieldset className="recurrence-scope-fieldset">
          <legend>Aplicar alteração em</legend>
          <label>
            <input
              type="radio"
              name="scope"
              checked={scope === 'this'}
              onChange={() => setScope('this')}
            />
            Somente este atendimento
          </label>
          <label>
            <input
              type="radio"
              name="scope"
              checked={scope === 'future'}
              onChange={() => setScope('future')}
            />
            Este e os próximos
          </label>
          <label>
            <input
              type="radio"
              name="scope"
              checked={scope === 'all'}
              onChange={() => setScope('all')}
            />
            Toda a sequência
          </label>
        </fieldset>
      ) : null}
      <div className="booking-picker-layout reschedule-picker">
        <SmartCalendar
          settings={props.settings}
          selectedDate={selectedDate}
          onSelect={dateText => { setSelectedDate(dateText); setSelectedSlot(''); }}
        />
        <div className="smart-time-panel">
          <span className="field-caption">Novo horário</span>
          {loading ? <div className="picker-empty">Consultando agenda...</div> : error ? (
            <div className="picker-error">{error}</div>
          ) : (
            <div className="smart-time-grid">
              {availability?.slots.map(slot => {
                const value = toLocalDateTimeInput(new Date(slot.start), props.settings.timezone);
                return (
                  <button
                    key={slot.start}
                    type="button"
                    disabled={slot.status !== 'available'}
                    className={`smart-time-slot ${slot.status} ${selectedSlot === value ? 'selected' : ''}`}
                    title={slot.reason ?? undefined}
                    onClick={() => setSelectedSlot(value)}
                  >
                    <strong>{slot.label}</strong>
                    <small>{slot.status === 'available' ? 'Livre' : slot.reason ?? 'Indisponível'}</small>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <div className="modal-actions">
        <button className="secondary-button" type="button" onClick={props.onClose}>Cancelar</button>
        <button
          type="button"
          disabled={!selectedSlot || props.actionLoading}
          onClick={() => props.onSubmit(selectedSlot, scope)}
        >
          {props.actionLoading ? 'Reagendando...' : 'Confirmar novo horário'}
        </button>
      </div>
    </Modal>
  );
}
