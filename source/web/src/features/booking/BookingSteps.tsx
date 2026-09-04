import type { Dispatch, SetStateAction } from 'react';
import type { BookingFormState } from '../../domain/forms';
import type {
  AvailabilitySlot,
  BusinessSettings,
  Professional,
  Service
} from '../../domain/types';
import { currencyFormatter } from '../../utils/formatters';
import { AvailabilityPanel } from './AvailabilityPanel';
import { DateSelection } from './DateSelection';

export function ServiceStep({
  services,
  selectedId,
  onSelect
}: {
  services: Service[];
  selectedId: string;
  onSelect: (serviceId: string) => void;
}) {
  return (
    <div className="booking-progressive-step">
      <StepHeading
        eyebrow="1 de 6 • Serviço"
        title="Escolha o seu serviço"
        copy="Selecione o atendimento que combina com você."
      />
      <div className="booking-choice-list booking-service-choices">
        {services.map(service => (
          <button
            key={service.id}
            type="button"
            className={
              `booking-choice ${selectedId === service.id ? 'selected' : ''}`
            }
            onClick={() => onSelect(service.id)}
          >
            <span>
              <strong>{service.name}</strong>
              <small>
                {service.description || service.category || 'Serviço'} •{' '}
                {service.durationMinutes} min
              </small>
            </span>
            <b>{publicPrice(service)}</b>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ProfessionalStep({
  settings,
  professionals,
  selectedId,
  onSelect
}: {
  settings: BusinessSettings;
  professionals: Professional[];
  selectedId: string;
  onSelect: (professionalId: string) => void;
}) {
  if (settings.operationMode === 'solo' && professionals.length === 1) {
    const professional = professionals[0];
    return (
      <div className="booking-progressive-step">
        <StepHeading
          eyebrow="2 de 6 • Profissional"
          title="Seu atendimento já tem profissional"
          copy={
            'Neste estabelecimento o atendimento online está configurado ' +
            'em modo solo.'
          }
        />
        <ProfessionalChoice
          professional={professional}
          selected={selectedId === professional.id}
          onSelect={() => onSelect(professional.id)}
          actionLabel="Selecionar"
        />
      </div>
    );
  }

  return (
    <div className="booking-progressive-step">
      <StepHeading
        eyebrow="2 de 6 • Profissional"
        title="Escolha quem vai cuidar de você"
        copy="Mostramos somente profissionais compatíveis com o serviço escolhido."
      />
      <div className="booking-choice-list booking-professional-choices">
        {professionals.map(professional => (
          <ProfessionalChoice
            key={professional.id}
            professional={professional}
            selected={selectedId === professional.id}
            onSelect={() => onSelect(professional.id)}
            actionLabel="↗"
          />
        ))}
      </div>
    </div>
  );
}

function ProfessionalChoice({
  professional,
  selected,
  onSelect,
  actionLabel
}: {
  professional: Professional;
  selected: boolean;
  onSelect: () => void;
  actionLabel: string;
}) {
  return (
    <button
      type="button"
      className={`booking-choice ${selected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <span className="booking-professional-choice">
        <i>{initials(professional.professionalName || professional.name)}</i>
        <span>
          <strong>{professional.professionalName || professional.name}</strong>
          <small>{professionalRoleLabel(professional.role)}</small>
        </span>
      </span>
      <b>{actionLabel}</b>
    </button>
  );
}

export function BookingDateStep({
  settings,
  bookingForm,
  setBookingForm,
  bookingDateOptions,
  minimumBookingDate,
  maximumBookingDate
}: {
  settings: BusinessSettings;
  bookingForm: BookingFormState;
  setBookingForm: Dispatch<SetStateAction<BookingFormState>>;
  bookingDateOptions: Date[];
  minimumBookingDate: string;
  maximumBookingDate: string;
}) {
  return (
    <div className="booking-progressive-step">
      <StepHeading
        eyebrow="3 de 6 • Data"
        title="Escolha o melhor dia"
        copy={
          `Escolha entre ${minimumBookingDate} e ${maximumBookingDate}. ` +
          'Dias fechados ou fora das regras ficam indisponíveis.'
        }
      />
      <DateSelection
        settings={settings}
        bookingForm={bookingForm}
        setBookingForm={setBookingForm}
        bookingDateOptions={bookingDateOptions}
      />
    </div>
  );
}

export function BookingTimeStep({
  bookingForm,
  slots,
  loading,
  closed,
  error,
  selectedSlot,
  onSelectSlot
}: {
  bookingForm: BookingFormState;
  slots: AvailabilitySlot[];
  loading: boolean;
  closed: boolean;
  error: string;
  selectedSlot: AvailabilitySlot | null;
  onSelectSlot: (slot: AvailabilitySlot | null) => void;
}) {
  return (
    <div className="booking-progressive-step">
      <StepHeading
        eyebrow="4 de 6 • Horário"
        title="Agora escolha o horário"
        copy={
          'Os horários vêm do mesmo motor de disponibilidade usado pela Agenda.'
        }
      />
      <AvailabilityPanel
        bookingForm={bookingForm}
        slots={slots}
        loading={loading}
        closed={closed}
        error={error}
        selectedSlot={selectedSlot}
        onSelectSlot={onSelectSlot}
      />
    </div>
  );
}

export function CustomerDataStep({
  settings,
  bookingForm,
  setBookingForm
}: {
  settings: BusinessSettings;
  bookingForm: BookingFormState;
  setBookingForm: Dispatch<SetStateAction<BookingFormState>>;
}) {
  return (
    <div className="booking-progressive-step">
      <StepHeading
        eyebrow="5 de 6 • Seus dados"
        title="Só falta confirmar seus dados"
        copy={
          'Pedimos somente os dados exigidos pelas regras do estabelecimento.'
        }
      />
      <div className="booking-customer-grid">
        <label>
          Nome completo
          <input
            required={settings.bookingRules.requireClientName}
            value={bookingForm.name}
            onChange={event => setBookingForm(current => ({
              ...current,
              name: event.target.value
            }))}
            placeholder="Seu nome"
          />
          <small>Usado para identificar sua reserva.</small>
        </label>
        <label>
          WhatsApp
          <input
            required={settings.bookingRules.requireClientPhone}
            value={bookingForm.phone}
            onChange={event => setBookingForm(current => ({
              ...current,
              phone: event.target.value
            }))}
            placeholder="(11) 99999-9999"
          />
          <small>Para confirmação e informações do atendimento.</small>
        </label>
        <label className="full">
          E-mail {settings.bookingRules.requireClientEmail ? '' : '(opcional)'}
          <input
            required={settings.bookingRules.requireClientEmail}
            type="email"
            value={bookingForm.email}
            onChange={event => setBookingForm(current => ({
              ...current,
              email: event.target.value
            }))}
            placeholder="voce@email.com"
          />
        </label>
        {settings.bookingRules.allowClientNotes ? (
          <label className="full">
            Observação (opcional)
            <textarea
              rows={3}
              value={bookingForm.notes}
              onChange={event => setBookingForm(current => ({
                ...current,
                notes: event.target.value
              }))}
              placeholder="Algo que o profissional precisa saber?"
            />
          </label>
        ) : null}
      </div>
      <div className="booking-privacy-note">
        🔒 Seus dados são utilizados para o atendimento e não ficam expostos na
        página pública.
      </div>
    </div>
  );
}

export function ReviewStep({
  settings,
  service,
  professional,
  bookingForm,
  selectedSlot,
  depositPercent,
  onEdit
}: {
  settings: BusinessSettings;
  service: Service | undefined;
  professional: Professional | undefined;
  bookingForm: BookingFormState;
  selectedSlot: AvailabilitySlot | null;
  depositPercent: number;
  onEdit: (step: number) => void;
}) {
  return (
    <div className="booking-progressive-step">
      <StepHeading
        eyebrow="6 de 6 • Revisão"
        title="Revise sua reserva"
        copy="Você pode editar qualquer escolha sem reiniciar o processo."
      />
      <div className="booking-review-card">
        <ReviewRow
          label="Serviço"
          value={service?.name || '—'}
          onEdit={() => onEdit(0)}
        />
        <ReviewRow
          label="Profissional"
          value={
            professional?.professionalName || professional?.name || '—'
          }
          onEdit={() => onEdit(1)}
        />
        <ReviewRow
          label="Data"
          value={bookingForm.date || '—'}
          onEdit={() => onEdit(2)}
        />
        <ReviewRow
          label="Horário"
          value={selectedSlot?.label || '—'}
          onEdit={() => onEdit(3)}
        />
        <ReviewRow
          label="Duração"
          value={service ? `${service.durationMinutes} min` : '—'}
        />
        <ReviewRow
          label="Valor"
          value={service ? publicPrice(service) : '—'}
        />
        {service && depositPercent > 0 ? (
          <ReviewRow
            label="Sinal"
            value={depositLabel(service, depositPercent)}
          />
        ) : null}
        <ReviewRow
          label="Cliente"
          value={`${bookingForm.name} • ${bookingForm.phone}`}
          onEdit={() => onEdit(4)}
        />
      </div>
      <div className="booking-revalidation-note">
        ✓ Ao confirmar, o backend consulta o horário novamente. Se ele acabou de
        ser ocupado, a página deve explicar o que aconteceu e pedir outra escolha.
      </div>
      {settings.cancellationPolicy ? (
        <p className="policy-text">{settings.cancellationPolicy}</p>
      ) : null}
    </div>
  );
}

export function StepHeading({
  eyebrow,
  title,
  copy
}: {
  eyebrow: string;
  title: string;
  copy: string;
}) {
  return (
    <header className="booking-progressive-heading">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{copy}</p>
    </header>
  );
}

function ReviewRow({
  label,
  value,
  onEdit
}: {
  label: string;
  value: string;
  onEdit?: () => void;
}) {
  return (
    <div className="booking-review-row">
      <span>{label}</span>
      <strong>{value}</strong>
      {onEdit ? (
        <button type="button" onClick={onEdit}>Editar</button>
      ) : <i />}
    </div>
  );
}

function depositLabel(service: Service, depositPercent: number): string {
  if (!service.publicPriceVisible) return 'Configurado para confirmação';
  return currencyFormatter.format(
    service.price * depositPercent / 100
  );
}

export function publicPrice(service: Service): string {
  if (!service.publicPriceVisible || service.priceType === 'consult') {
    return 'Sob consulta';
  }
  const value = currencyFormatter.format(service.price);
  return service.priceType === 'from' ? `A partir de ${value}` : value;
}

function initials(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('');
}

function professionalRoleLabel(role: Professional['role']): string {
  const labels: Record<Professional['role'], string> = {
    owner: 'Proprietário / profissional',
    barber: 'Barbeiro',
    manager: 'Gerente',
    receptionist: 'Recepção',
    assistant: 'Assistente',
    other: 'Profissional'
  };
  return labels[role];
}
