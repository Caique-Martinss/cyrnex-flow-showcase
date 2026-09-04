import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { ErrorState, LoadingState } from '../../components/ui/PageState';
import { createEmptyBookingForm } from '../../domain/forms';
import type { PublicBookingResult } from '../../domain/types';
import { useBookingAvailability } from '../../hooks/useBookingAvailability';
import {
  createPublicBooking,
  getErrorMessage,
  loadPublicPage,
  loadPublicStaffContext
} from '../../services';
import type { PublicPagePayload, PublicStaffContext } from '../../services/publicPage.api';
import { addDaysToDateText, getDateTextInTimeZone } from '../../utils/businessTime';
import { PublicBookingPage } from '../booking/PublicBookingPage';

export function PublicCustomerApp({ slug }: { slug: string }) {
  const [page, setPage] = useState<PublicPagePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [staffContext, setStaffContext] = useState<PublicStaffContext | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [bookingForm, setBookingForm] = useState(createEmptyBookingForm);
  const [bookingResult, setBookingResult] = useState<PublicBookingResult | null>(null);
  const availability = useBookingAvailability(bookingForm, slug);

  const refresh = async () => {
    setLoading(true);
    setPageError('');
    try {
      setPage(await loadPublicPage(slug));
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [slug]);

  useEffect(() => {
    if (isCustomerView()) {
      setStaffContext(null);
      return;
    }
    void loadPublicStaffContext(slug)
      .then(setStaffContext)
      .catch(() => setStaffContext(null));
  }, [slug]);

  useEffect(() => {
    if (!page || page.settings.operationMode !== 'solo') return;
    const professional = page.professionals[0];
    if (!professional) return;
    setBookingForm(current => current.professionalId
      ? current
      : { ...current, professionalId: professional.id });
  }, [page]);

  const selectedService = page?.services.find(item => item.id === bookingForm.serviceId);
  const bookingDateOptions = useMemo(() => {
    if (!page) return [];
    const firstDate = getDateTextInTimeZone(new Date(), page.settings.timezone);
    const count = Math.min(7, page.settings.bookingRules.maxBookingDaysAhead + 1);
    return Array.from({ length: count }, (_, index) => (
      localDateFromText(addDaysToDateText(firstDate, index))
    ));
  }, [page]);

  if (loading) return <LoadingState />;
  if (pageError || !page) {
    return <ErrorState message={pageError || 'Página não encontrada.'} onRetry={() => void refresh()} />;
  }

  const minimumBookingDate = getDateTextInTimeZone(new Date(), page.settings.timezone);
  const maximumBookingDate = addDaysToDateText(
    minimumBookingDate,
    page.settings.bookingRules.maxBookingDaysAhead
  );
  const bookingConfirmed = bookingResult
    ? bookingResult.appointment.depositStatus === 'paid'
      || bookingResult.appointment.depositStatus === 'waived'
    : false;

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!availability.selectedSlot) {
      setActionError('Escolha um horário disponível para continuar.');
      return;
    }
    setActionLoading(true);
    setActionError('');
    try {
      const result = await createPublicBooking({
        slug,
        name: bookingForm.name,
        phone: bookingForm.phone,
        email: bookingForm.email || undefined,
        serviceId: bookingForm.serviceId,
        professionalId: bookingForm.professionalId,
        date: availability.selectedSlot.start,
        bookingDate: bookingForm.date,
        notes: bookingForm.notes || undefined
      });
      setBookingResult(result);
    } catch (error) {
      setActionError(getErrorMessage(error));
      availability.setSelectedSlot(null);
    } finally {
      setActionLoading(false);
    }
  }

  function resetBooking() {
    setBookingResult(null);
    setBookingForm(createEmptyBookingForm());
    availability.resetAvailability();
    setActionError('');
  }

  return (
    <>
      {actionError ? <div className="public-action-error" role="alert">{actionError}</div> : null}
      <PublicBookingPage
        settings={page.settings}
        slug={slug}
        staffContext={staffContext}
        services={page.services}
        professionals={page.professionals}
        bookingForm={bookingForm}
        setBookingForm={setBookingForm}
        bookingResult={bookingResult}
        bookingConfirmed={bookingConfirmed}
        selectedBookingService={selectedService}
        bookingDateOptions={bookingDateOptions}
        minimumBookingDate={minimumBookingDate}
        maximumBookingDate={maximumBookingDate}
        availabilitySlots={availability.slots}
        availabilityLoading={availability.loading}
        availabilityClosed={availability.closed}
        availabilityError={availability.error}
        selectedBookingSlot={availability.selectedSlot}
        actionLoading={actionLoading}
        allowDepositSimulation={false}
        onSelectBookingSlot={availability.setSelectedSlot}
        onSubmit={submitBooking}
        onReset={resetBooking}
      />
    </>
  );
}

function localDateFromText(dateText: string): Date {
  const [year, month, day] = dateText.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function isCustomerView(): boolean {
  return new URLSearchParams(window.location.search).get('view') === 'customer';
}
