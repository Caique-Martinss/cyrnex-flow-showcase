import type { BookingFormState } from '../../domain/forms';
import type { AvailabilitySlot } from '../../domain/types';

interface AvailabilityPanelProps {
  bookingForm: BookingFormState;
  slots: AvailabilitySlot[];
  loading: boolean;
  closed: boolean;
  error: string;
  selectedSlot: AvailabilitySlot | null;
  onSelectSlot: (slot: AvailabilitySlot | null) => void;
}

export function AvailabilityPanel({
  bookingForm,
  slots,
  loading,
  closed,
  error,
  selectedSlot,
  onSelectSlot
}: AvailabilityPanelProps) {
  const hasRequiredFilters = Boolean(
    bookingForm.serviceId &&
      bookingForm.professionalId &&
      bookingForm.date
  );

  return (
    <div className="availability-panel">
      <div className="availability-heading">
        <div>
          <span className="eyebrow">2. Escolha o horário</span>
          <strong>Horários do barbeiro</strong>
        </div>

        <div
          className="availability-legend"
          aria-label="Legenda dos horários"
        >
          <span>
            <i className="legend-dot available" />Livre
          </span>
          <span>
            <i className="legend-dot occupied" />Ocupado
          </span>
        </div>
      </div>

      <AvailabilityContent
        hasRequiredFilters={hasRequiredFilters}
        slots={slots}
        loading={loading}
        closed={closed}
        error={error}
        selectedSlot={selectedSlot}
        onSelectSlot={onSelectSlot}
      />

      {selectedSlot ? (
        <div className="selected-slot-message">
          ✓ Horário escolhido: <strong>{selectedSlot.label}</strong>
        </div>
      ) : null}
    </div>
  );
}

interface AvailabilityContentProps {
  hasRequiredFilters: boolean;
  slots: AvailabilitySlot[];
  loading: boolean;
  closed: boolean;
  error: string;
  selectedSlot: AvailabilitySlot | null;
  onSelectSlot: (slot: AvailabilitySlot | null) => void;
}

function AvailabilityContent({
  hasRequiredFilters,
  slots,
  loading,
  closed,
  error,
  selectedSlot,
  onSelectSlot
}: AvailabilityContentProps) {
  if (!hasRequiredFilters) {
    return (
      <div className="availability-empty">
        Escolha o serviço, o barbeiro e o dia para visualizar a agenda.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="availability-empty">
        <span className="mini-spinner" />
        Carregando horários...
      </div>
    );
  }

  if (error) {
    return <div className="availability-empty error">{error}</div>;
  }

  if (closed) {
    return (
      <div className="availability-empty">
        A barbearia não abre neste dia. Escolha outra data.
      </div>
    );
  }

  if (!slots.length) {
    return (
      <div className="availability-empty">
        Não há horários que comportem esse serviço neste dia.
      </div>
    );
  }

  return (
    <div className="time-slot-grid">
      {slots.map(slot => {
        const selected = selectedSlot?.start === slot.start;
        const disabled = slot.status !== 'available';

        return (
          <button
            key={slot.start}
            type="button"
            disabled={disabled}
            className={`time-slot ${slot.status} ${selected ? 'selected' : ''}`}
            onClick={() => onSelectSlot(slot)}
          >
            <strong>{slot.label}</strong>
            <span>{getAvailabilityLabel(slot)}</span>
          </button>
        );
      })}
    </div>
  );
}

function getAvailabilityLabel(slot: AvailabilitySlot): string {
  if (slot.status === 'available') return 'Livre';
  if (slot.status === 'occupied') return 'Ocupado';
  return 'Já passou';
}
