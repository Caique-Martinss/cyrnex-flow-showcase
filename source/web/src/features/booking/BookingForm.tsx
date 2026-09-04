import { useMemo, useState, type Dispatch } from 'react';
import type {
  FormEvent,
  SetStateAction
} from 'react';
import type { BookingFormState } from '../../domain/forms';
import type {
  AvailabilitySlot,
  BusinessSettings,
  Professional,
  Service
} from '../../domain/types';
import { getServiceDepositPercent } from '../../utils/deposits';
import {
  BookingDateStep,
  BookingTimeStep,
  CustomerDataStep,
  ProfessionalStep,
  ReviewStep,
  ServiceStep,
  publicPrice
} from './BookingSteps';

interface BookingFormProps {
  settings: BusinessSettings;
  services: Service[];
  professionals: Professional[];
  bookingForm: BookingFormState;
  setBookingForm: Dispatch<SetStateAction<BookingFormState>>;
  selectedBookingService: Service | undefined;
  bookingDateOptions: Date[];
  minimumBookingDate: string;
  maximumBookingDate: string;
  availabilitySlots: AvailabilitySlot[];
  availabilityLoading: boolean;
  availabilityClosed: boolean;
  availabilityError: string;
  selectedBookingSlot: AvailabilitySlot | null;
  actionLoading: boolean;
  onSelectBookingSlot: (slot: AvailabilitySlot | null) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

const stepLabels = [
  'Serviço',
  'Profissional',
  'Data',
  'Horário',
  'Seus dados',
  'Revisão'
];

export function BookingForm(props: BookingFormProps) {
  const [step, setStep] = useState(0);
  const compatibleProfessionals = useMemo(() => {
    if (!props.selectedBookingService) return props.professionals;
    return props.professionals.filter(professional => (
      props.selectedBookingService?.professionalIds.includes(professional.id)
    ));
  }, [props.professionals, props.selectedBookingService]);
  const selectedProfessional = props.professionals.find(
    item => item.id === props.bookingForm.professionalId
  );
  const depositPercent = props.selectedBookingService
    ? getServiceDepositPercent(props.selectedBookingService, props.settings)
    : 0;
  const canContinue = canContinueFromStep(
    step,
    props.bookingForm,
    props.selectedBookingSlot,
    props.settings
  );

  return (
    <form className="public-booking-journey" onSubmit={props.onSubmit}>
      <BookingProgress step={step} onGoTo={setStep} />
      <div className="booking-journey-shell">
        <div className="booking-step-content">
          {step === 0 ? (
            <ServiceStep
              services={props.services}
              selectedId={props.bookingForm.serviceId}
              onSelect={serviceId => selectService(props, serviceId)}
            />
          ) : null}
          {step === 1 ? (
            <ProfessionalStep
              settings={props.settings}
              professionals={compatibleProfessionals}
              selectedId={props.bookingForm.professionalId}
              onSelect={professionalId => props.setBookingForm(current => ({
                ...current,
                professionalId
              }))}
            />
          ) : null}
          {step === 2 ? (
            <BookingDateStep
              settings={props.settings}
              bookingForm={props.bookingForm}
              setBookingForm={props.setBookingForm}
              bookingDateOptions={props.bookingDateOptions}
              minimumBookingDate={props.minimumBookingDate}
              maximumBookingDate={props.maximumBookingDate}
            />
          ) : null}
          {step === 3 ? (
            <BookingTimeStep
              bookingForm={props.bookingForm}
              slots={props.availabilitySlots}
              loading={props.availabilityLoading}
              closed={props.availabilityClosed}
              error={props.availabilityError}
              selectedSlot={props.selectedBookingSlot}
              onSelectSlot={props.onSelectBookingSlot}
            />
          ) : null}
          {step === 4 ? (
            <CustomerDataStep
              settings={props.settings}
              bookingForm={props.bookingForm}
              setBookingForm={props.setBookingForm}
            />
          ) : null}
          {step === 5 ? (
            <ReviewStep
              settings={props.settings}
              service={props.selectedBookingService}
              professional={selectedProfessional}
              bookingForm={props.bookingForm}
              selectedSlot={props.selectedBookingSlot}
              depositPercent={depositPercent}
              onEdit={setStep}
            />
          ) : null}
        </div>
        <BookingSummary
          service={props.selectedBookingService}
          professional={selectedProfessional}
          form={props.bookingForm}
          slot={props.selectedBookingSlot}
        />
      </div>
      <BookingActions
        step={step}
        canContinue={canContinue}
        loading={props.actionLoading}
        onBack={() => setStep(current => Math.max(0, current - 1))}
        onNext={() => setStep(current => (
          Math.min(stepLabels.length - 1, current + 1)
        ))}
      />
    </form>
  );
}

function BookingProgress({
  step,
  onGoTo
}: {
  step: number;
  onGoTo: (step: number) => void;
}) {
  return (
    <div
      className="booking-journey-progress"
      aria-label="Progresso do agendamento"
    >
      {stepLabels.map((label, index) => (
        <button
          key={label}
          type="button"
          className={
            index < step ? 'done' : index === step ? 'current' : ''
          }
          disabled={index > step}
          onClick={() => index <= step && onGoTo(index)}
        >
          <i />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

function BookingSummary({
  service,
  professional,
  form,
  slot
}: {
  service: Service | undefined;
  professional: Professional | undefined;
  form: BookingFormState;
  slot: AvailabilitySlot | null;
}) {
  return (
    <aside className="booking-live-summary">
      <span className="eyebrow">Sua reserva</span>
      <h3>{service?.name || 'Comece escolhendo o serviço'}</h3>
      <SummaryLine
        label="Profissional"
        value={professional?.professionalName || professional?.name || 'A escolher'}
      />
      <SummaryLine label="Data" value={form.date || 'A escolher'} />
      <SummaryLine label="Horário" value={slot?.label || 'A escolher'} />
      {service ? (
        <>
          <SummaryLine
            label="Duração"
            value={`${service.durationMinutes} min`}
          />
          <SummaryLine label="Valor" value={publicPrice(service)} />
        </>
      ) : null}
      <p>
        Antes da confirmação, o servidor confere o horário novamente para
        evitar reserva duplicada.
      </p>
    </aside>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="booking-summary-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function BookingActions({
  step,
  canContinue,
  loading,
  onBack,
  onNext
}: {
  step: number;
  canContinue: boolean;
  loading: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  const lastStep = step === stepLabels.length - 1;
  return (
    <div className="booking-journey-actions">
      <button
        type="button"
        className="secondary-button"
        onClick={onBack}
        disabled={step === 0 || loading}
      >
        Voltar
      </button>
      {lastStep ? (
        <button type="submit" disabled={!canContinue || loading}>
          {loading ? 'Confirmando disponibilidade...' : 'Confirmar reserva'}
        </button>
      ) : (
        <button
          type="button"
          disabled={!canContinue || loading}
          onClick={onNext}
        >
          Continuar
        </button>
      )}
    </div>
  );
}

function selectService(props: BookingFormProps, serviceId: string) {
  const service = props.services.find(item => item.id === serviceId);
  props.setBookingForm(current => ({
    ...current,
    serviceId,
    professionalId: current.professionalId &&
      service?.professionalIds.includes(current.professionalId)
        ? current.professionalId
        : ''
  }));
}

function canContinueFromStep(
  step: number,
  form: BookingFormState,
  selectedSlot: AvailabilitySlot | null,
  settings: BusinessSettings
): boolean {
  if (step === 0) return Boolean(form.serviceId);
  if (step === 1) return Boolean(form.professionalId);
  if (step === 2) return Boolean(form.date);
  if (step === 3) return Boolean(selectedSlot);
  if (step === 4) return validCustomerData(form, settings);
  return Boolean(
    form.serviceId && form.professionalId && form.date && selectedSlot
  );
}

function validCustomerData(
  form: BookingFormState,
  settings: BusinessSettings
): boolean {
  const nameOk = !settings.bookingRules.requireClientName ||
    form.name.trim().length >= 3;
  const phoneOk = !settings.bookingRules.requireClientPhone ||
    form.phone.replace(/\D/g, '').length >= 10;
  const emailOk = !settings.bookingRules.requireClientEmail ||
    /^\S+@\S+\.\S+$/.test(form.email);
  return nameOk && phoneOk && emailOk;
}
