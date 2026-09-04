import { useEffect, useState } from 'react';
import type { BookingFormState } from '../domain/forms';
import type { AvailabilitySlot } from '../domain/types';
import { getErrorMessage, loadAvailability } from '../services';

export function useBookingAvailability(
  bookingForm: BookingFormState,
  businessSlug: string
) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [closed, setClosed] = useState(false);
  const [error, setError] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(
    null
  );

  useEffect(() => {
    setSelectedSlot(null);
    setError('');

    if (
      !bookingForm.serviceId ||
      !bookingForm.professionalId ||
      !bookingForm.date
    ) {
      setSlots([]);
      setClosed(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void loadAvailability({
      slug: businessSlug,
      serviceId: bookingForm.serviceId,
      professionalId: bookingForm.professionalId,
      date: bookingForm.date
    })
      .then(result => {
        if (cancelled) return;
        setSlots(result.slots);
        setClosed(result.closed);
      })
      .catch(requestError => {
        if (cancelled) return;
        setSlots([]);
        setClosed(false);
        setError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    bookingForm.serviceId,
    bookingForm.professionalId,
    bookingForm.date,
    businessSlug
  ]);

  const resetAvailability = () => {
    setSlots([]);
    setLoading(false);
    setClosed(false);
    setError('');
    setSelectedSlot(null);
  };

  return {
    slots,
    loading,
    closed,
    error,
    selectedSlot,
    setSelectedSlot,
    resetAvailability
  };
}
