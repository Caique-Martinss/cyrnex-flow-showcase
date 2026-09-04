import type { Dispatch, FormEvent, SetStateAction } from 'react';
import type { BookingFormState } from '../../domain/forms';
import type {
  AvailabilitySlot,
  BusinessSettings,
  Professional,
  PublicBookingResult,
  Service
} from '../../domain/types';
import type { PublicStaffContext } from '../../services/publicPage.api';
import { PublicPageRenderer } from '../public-page/PublicPageRenderer';
import { BookingConfirmation } from './BookingConfirmation';
import { BookingForm } from './BookingForm';

interface PublicBookingPageProps {
  settings: BusinessSettings;
  slug?: string;
  staffContext?: PublicStaffContext | null;
  services: Service[];
  professionals: Professional[];
  bookingForm: BookingFormState;
  setBookingForm: Dispatch<SetStateAction<BookingFormState>>;
  bookingResult: PublicBookingResult | null;
  bookingConfirmed: boolean;
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
  allowDepositSimulation?: boolean;
  onSelectBookingSlot: (slot: AvailabilitySlot | null) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onConfirmDeposit?: () => void;
  onOpenConfirmation?: () => void;
  onReset: () => void;
}

export function PublicBookingPage(props: PublicBookingPageProps) {
  const booking = (
    <article className="public-booking-card">
      {props.bookingResult ? (
        <BookingConfirmation
          result={props.bookingResult}
          settings={props.settings}
          confirmed={props.bookingConfirmed}
          actionLoading={props.actionLoading}
          allowDepositSimulation={props.allowDepositSimulation}
          onConfirmDeposit={props.onConfirmDeposit}
          onOpenConfirmation={props.onOpenConfirmation}
          onReset={props.onReset}
        />
      ) : (
        <BookingForm
          settings={props.settings}
          services={props.services}
          professionals={props.professionals}
          bookingForm={props.bookingForm}
          setBookingForm={props.setBookingForm}
          selectedBookingService={props.selectedBookingService}
          bookingDateOptions={props.bookingDateOptions}
          minimumBookingDate={props.minimumBookingDate}
          maximumBookingDate={props.maximumBookingDate}
          availabilitySlots={props.availabilitySlots}
          availabilityLoading={props.availabilityLoading}
          availabilityClosed={props.availabilityClosed}
          availabilityError={props.availabilityError}
          selectedBookingSlot={props.selectedBookingSlot}
          actionLoading={props.actionLoading}
          onSelectBookingSlot={props.onSelectBookingSlot}
          onSubmit={props.onSubmit}
        />
      )}
    </article>
  );

  return (
    <PublicPageRenderer
      settings={props.settings}
      slug={props.slug}
      staffContext={props.staffContext}
      services={props.services}
      professionals={props.professionals}
      booking={booking}
      onSelectService={serviceId => selectPublicService(props, serviceId)}
      onSelectProfessional={professionalId => props.setBookingForm(current => ({
        ...current,
        professionalId
      }))}
    />
  );
}


function selectPublicService(props: PublicBookingPageProps, serviceId: string) {
  const service = props.services.find(item => item.id === serviceId);
  props.onSelectBookingSlot(null);
  props.setBookingForm(current => ({
    ...current,
    serviceId,
    professionalId: current.professionalId &&
      service?.professionalIds.includes(current.professionalId)
        ? current.professionalId
        : '',
    date: ''
  }));
}
