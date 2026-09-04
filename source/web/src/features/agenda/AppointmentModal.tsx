import {
  type Dispatch,
  type FormEvent,
  type SetStateAction,
  useEffect,
  useMemo,
  useState
} from 'react';
import { Modal } from '../../components/ui/Modal';
import type { AppointmentFormState } from '../../domain/forms';
import type {
  AvailabilityResponse,
  BusinessSettings,
  Client,
  Professional,
  Service
} from '../../domain/types';
import { loadAdminAvailability } from '../../services';
import { getServiceDepositPercent } from '../../utils/deposits';
import { currencyFormatter } from '../../utils/formatters';
import { getDateTextInTimeZone } from '../../utils/businessTime';
import { toLocalDateTimeInput } from './agenda.helpers';
import { RecurrenceEditor } from './RecurrenceEditor';
import { SmartCalendar } from './SmartCalendar';

interface AppointmentModalProps {
  form: AppointmentFormState;
  setForm: Dispatch<SetStateAction<AppointmentFormState>>;
  clients: Client[];
  services: Service[];
  professionals: Professional[];
  settings: BusinessSettings;
  selectedService: Service | undefined;
  actionLoading: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}

export function AppointmentModal(props: AppointmentModalProps) {
  const initialDate = props.form.date
    ? props.form.date.slice(0, 10)
    : getDateTextInTimeZone(new Date(), props.settings.timezone);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');
  const selectedProfessional = props.professionals.find(
    item => item.id === props.form.professionalId
  );
  const selectedClient = props.clients.find(item => item.id === props.form.clientId);
  const eligibleProfessionals = useMemo(() => {
    const active = props.professionals.filter(item => item.active && item.servesClients);
    if (!props.selectedService?.professionalIds.length) return active;
    return active.filter(item => props.selectedService?.professionalIds.includes(item.id));
  }, [props.professionals, props.selectedService]);
  const depositPercent = props.selectedService
    ? getServiceDepositPercent(props.selectedService, props.settings)
    : 0;

  useEffect(() => {
    if (!props.selectedService || !selectedProfessional) {
      setAvailability(null);
      return;
    }
    let cancelled = false;
    setLoadingSlots(true);
    setAvailabilityError('');
    void loadAdminAvailability({
      serviceId: props.selectedService.id,
      professionalId: selectedProfessional.id,
      date: selectedDate
    })
      .then(result => {
        if (!cancelled) setAvailability(result);
      })
      .catch(error => {
        if (!cancelled) {
          setAvailability(null);
          setAvailabilityError(
            error instanceof Error ? error.message : 'Não foi possível consultar os horários.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });
    return () => { cancelled = true; };
  }, [props.selectedService, selectedProfessional, selectedDate]);

  const selectedSlot = availability?.slots.find(
    slot => toLocalDateTimeInput(new Date(slot.start), props.settings.timezone) === props.form.date
  );
  const fitInHasConflict = props.form.mode === 'fit_in' && selectedSlot?.status === 'occupied';
  const missing = getMissingFields(props.form, props.settings.operationMode, fitInHasConflict);
  const valid = missing.length === 0;

  function selectDate(dateText: string) {
    setSelectedDate(dateText);
    props.setForm(current => ({
      ...current,
      date: current.date.startsWith(dateText) ? current.date : '',
      conflictConfirmed: false,
      fitInReason: ''
    }));
  }

  return (
    <Modal
      className="appointment-form-modal"
      title={props.form.mode === 'fit_in' ? 'Novo encaixe' : 'Novo agendamento'}
      description="Escolha serviço, profissional e um horário calculado pelas regras reais da agenda."
      onClose={props.onClose}
    >
      <form className="modal-form smart-booking-form booking-modal-with-footer" onSubmit={props.onSubmit}>
        <div className="appointment-mode-switch" role="group" aria-label="Tipo de agendamento">
          <button
            type="button"
            className={props.form.mode === 'normal' ? 'active' : ''}
            onClick={() => props.setForm(current => ({
              ...current,
              mode: 'normal',
              conflictConfirmed: false,
              fitInReason: ''
            }))}
          >
            <strong>Agendamento normal</strong>
            <span>Não permite sobreposição.</span>
          </button>
          <button
            type="button"
            className={props.form.mode === 'fit_in' ? 'active' : ''}
            onClick={() => props.setForm(current => ({
              ...current,
              mode: 'fit_in',
              recurrenceEnabled: false
            }))}
          >
            <strong>Encaixe</strong>
            <span>Conflito exige confirmação explícita.</span>
          </button>
        </div>

        <div className="agenda-form-grid">
          <label>
            Cliente
            <select
              required
              value={props.form.clientId}
              onChange={event => props.setForm(current => ({ ...current, clientId: event.target.value }))}
            >
              <option value="">Selecione o cliente</option>
              {props.clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
            </select>
          </label>

          <label>
            Serviço
            <select
              required
              value={props.form.serviceId}
              onChange={event => props.setForm(current => ({
                ...current,
                serviceId: event.target.value,
                recurrenceServiceIds: event.target.value ? [event.target.value] : [],
                date: '',
                conflictConfirmed: false
              }))}
            >
              <option value="">Selecione o serviço</option>
              {props.services.filter(item => item.active).map(service => (
                <option key={service.id} value={service.id}>
                  {service.name} — {currencyFormatter.format(service.price)}
                </option>
              ))}
            </select>
          </label>

          {props.settings.operationMode === 'team' ? (
            <label>
              Profissional
              <select
                required
                value={props.form.professionalId}
                onChange={event => props.setForm(current => ({
                  ...current,
                  professionalId: event.target.value,
                  date: '',
                  conflictConfirmed: false
                }))}
              >
                <option value="">Selecione o profissional</option>
                {eligibleProfessionals.map(professional => (
                  <option key={professional.id} value={professional.id}>
                    {professional.professionalName || professional.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="inline-status form-inline-status">
              <strong>{selectedProfessional?.name ?? 'Profissional principal'}</strong>
              <span>Selecionado automaticamente</span>
            </div>
          )}
        </div>

        {props.selectedService ? (
          <div className="booking-rule-strip">
            <span><strong>{props.selectedService.durationMinutes} min</strong>duração</span>
            <span><strong>{props.selectedService.bufferAfterMinutes} min</strong>buffer</span>
            <span>
              <strong>{formatNotice(props.settings.bookingRules.minBookingNoticeMinutes)}</strong>
              antecedência
            </span>
            <span><strong>{props.settings.bookingRules.maxBookingDaysAhead} dias</strong>limite futuro</span>
          </div>
        ) : null}

        <div className="booking-picker-layout">
          <div>
            <span className="field-caption">1. Escolha o dia</span>
            <SmartCalendar settings={props.settings} selectedDate={selectedDate} onSelect={selectDate} />
          </div>

          <div className="smart-time-panel">
            <div className="smart-time-heading">
              <div>
                <span className="field-caption">2. Escolha o horário</span>
                <strong>{formatSelectedDate(selectedDate)}</strong>
              </div>
              {props.form.date ? <span className="selection-ok">✓ Selecionado</span> : null}
            </div>

            {!props.selectedService || !selectedProfessional ? (
              <div className="picker-empty">
                <strong>Primeiro escolha serviço e profissional.</strong>
                <span>A duração e a agenda definem quais horários cabem.</span>
              </div>
            ) : loadingSlots ? (
              <div className="picker-empty"><span>Consultando agenda...</span></div>
            ) : availabilityError ? (
              <div className="picker-error">{availabilityError}</div>
            ) : availability?.closed ? (
              <div className="picker-empty">
                <strong>Sem expediente neste dia.</strong>
                <span>Escolha outro dia disponível no calendário.</span>
              </div>
            ) : (
              <div className="smart-time-grid">
                {availability?.slots.map(slot => {
                  const localValue = toLocalDateTimeInput(new Date(slot.start), props.settings.timezone);
                  const selected = props.form.date === localValue;
                  const selectable = slot.status === 'available' ||
                    (props.form.mode === 'fit_in' && slot.status === 'occupied');
                  return (
                    <button
                      key={slot.start}
                      type="button"
                      disabled={!selectable}
                      className={`smart-time-slot ${slot.status} ${selected ? 'selected' : ''} ${
                        props.form.mode === 'fit_in' && slot.status === 'occupied' ? 'fit-in-option' : ''
                      }`}
                      title={slot.reason ?? undefined}
                      onClick={() => props.setForm(current => ({
                        ...current,
                        date: localValue,
                        conflictConfirmed: false,
                        fitInReason: ''
                      }))}
                    >
                      <strong>{slot.label}</strong>
                      <small>
                        {slot.status === 'occupied' && props.form.mode === 'fit_in'
                          ? 'Encaixe'
                          : getSlotLabel(slot.status)}
                      </small>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {fitInHasConflict ? (
          <div className="conflict-confirmation-card">
            <div>
              <strong>⚠ Este horário já possui outro atendimento.</strong>
              <span>O sistema só salva o encaixe se você confirmar conscientemente a sobreposição.</span>
            </div>
            <label>
              Motivo do encaixe
              <textarea
                minLength={5}
                value={props.form.fitInReason}
                onChange={event => props.setForm(current => ({ ...current, fitInReason: event.target.value }))}
                placeholder="Ex.: atendimento rápido autorizado pelo profissional."
              />
            </label>
            <label className="review-confirmation">
              <input
                type="checkbox"
                checked={props.form.conflictConfirmed}
                onChange={event => props.setForm(current => ({
                  ...current,
                  conflictConfirmed: event.target.checked
                }))}
              />
              <span>Confirmo que revisei o conflito e quero criar o encaixe mesmo assim.</span>
            </label>
          </div>
        ) : null}

        {props.form.mode === 'normal' ? (
          <RecurrenceEditor
            form={props.form}
            setForm={props.setForm}
            services={props.services}
          />
        ) : null}

        <label>
          Observações
          <textarea
            value={props.form.notes}
            onChange={event => props.setForm(current => ({ ...current, notes: event.target.value }))}
            placeholder="Preferências ou informações importantes"
          />
        </label>

        <div className="booking-sticky-footer">
          <div className="booking-footer-summary">
            <span><small>Cliente</small><strong>{selectedClient?.name ?? '—'}</strong></span>
            <span><small>Serviço</small><strong>{props.selectedService?.name ?? '—'}</strong></span>
            <span>
              <small>Data</small>
              <strong>
                {props.form.date ? formatSelectedDate(props.form.date.slice(0, 10)) : '—'}
              </strong>
            </span>
            <span>
              <small>Horário</small>
              <strong>
                {props.form.date ? props.form.date.slice(11, 16) : '—'}
              </strong>
            </span>
          </div>
          {!valid ? <small className="booking-missing">Falta: {missing.join(', ')}.</small> : null}
          <div className="modal-actions sticky-actions">
            <button className="secondary-button" type="button" onClick={props.onClose}>Cancelar</button>
            <button disabled={props.actionLoading || !valid}>
              {props.actionLoading
                ? 'Salvando...'
                : props.form.recurrenceEnabled
                  ? 'Criar recorrência'
                  : props.form.mode === 'fit_in'
                    ? 'Criar encaixe'
                    : 'Criar agendamento'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function getMissingFields(
  form: AppointmentFormState,
  operationMode: BusinessSettings['operationMode'],
  fitInHasConflict: boolean
): string[] {
  const missing: string[] = [];
  if (!form.clientId) missing.push('cliente');
  if (!form.serviceId) missing.push('serviço');
  if (operationMode === 'team' && !form.professionalId) missing.push('profissional');
  if (!form.date) missing.push('horário');
  if (fitInHasConflict && form.fitInReason.trim().length < 5) missing.push('motivo do encaixe');
  if (fitInHasConflict && !form.conflictConfirmed) missing.push('confirmação do conflito');
  if (form.recurrenceEnabled) {
    const count = Number(form.recurrenceCount);
    if (!Number.isFinite(count) || count < 2 || count > 52) missing.push('quantidade da recorrência');
  }
  return missing;
}

function formatNotice(minutes: number): string {
  if (minutes <= 0) return 'Sem mínimo';
  if (minutes < 60) return `${minutes} min`;
  if (minutes % 1440 === 0) return `${minutes / 1440} dia(s)`;
  if (minutes % 60 === 0) return `${minutes / 60} h`;
  return `${minutes} min`;
}

function formatSelectedDate(dateText: string): string {
  return new Date(`${dateText}T12:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long'
  });
}

function getSlotLabel(status: AvailabilityResponse['slots'][number]['status']): string {
  if (status === 'available') return 'Livre';
  if (status === 'occupied') return 'Ocupado';
  if (status === 'blocked') return 'Bloqueado';
  return 'Indisponível';
}
