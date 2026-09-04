import { useEffect, useMemo, useState } from 'react';
import { ErrorState, LoadingState } from '../../components/ui/PageState';
import type { AvailabilitySlot, BusinessSettings } from '../../domain/types';
import {
  cancelPublicBooking,
  getErrorMessage,
  loadPublicBookingManagement,
  loadPublicBookingManagementAvailability,
  reschedulePublicBooking,
  submitPublicBookingPaymentProof
} from '../../services';
import type { PublicBookingManagement } from '../../services/publicBookingManagement.api';
import { addDaysToDateText, getDateTextInTimeZone } from '../../utils/businessTime';
import { PublicAppointmentManager } from '../booking/PublicAppointmentManager';

export function PublicAppointmentApp(props: { slug: string; token: string }) {
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [management, setManagement] = useState<PublicBookingManagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);

  async function refresh() {
    setLoading(true);
    setPageError('');
    try {
      const result = await loadPublicBookingManagement({
        slug: props.slug,
        token: props.token
      });
      setSettings(result.settings);
      setManagement(result.management);
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [props.slug, props.token]);

  useEffect(() => {
    if (management?.payment.proofStatus !== 'submitted') return;
    let cancelled = false;
    const timer = window.setInterval(() => {
      void loadPublicBookingManagement({
        slug: props.slug,
        token: props.token
      }).then(result => {
        if (cancelled) return;
        setSettings(result.settings);
        setManagement(result.management);
      }).catch(() => undefined);
    }, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [management?.payment.proofStatus, props.slug, props.token]);

  useEffect(() => {
    setSelectedSlot(null);
    setAvailabilitySlots([]);
    setAvailabilityError('');
    if (!rescheduleDate || !management?.canReschedule) return;
    let cancelled = false;
    setAvailabilityLoading(true);
    void loadPublicBookingManagementAvailability({
      slug: props.slug,
      token: props.token,
      date: rescheduleDate
    }).then(result => {
      if (!cancelled) setAvailabilitySlots(result.slots);
    }).catch(error => {
      if (!cancelled) setAvailabilityError(getErrorMessage(error));
    }).finally(() => {
      if (!cancelled) setAvailabilityLoading(false);
    });
    return () => { cancelled = true; };
  }, [rescheduleDate, management?.canReschedule, props.slug, props.token]);

  const dateBounds = useMemo(() => {
    if (!settings) return { minimum: '', maximum: '' };
    const minimum = getDateTextInTimeZone(new Date(), settings.timezone);
    return {
      minimum,
      maximum: addDaysToDateText(
        minimum,
        settings.bookingRules.maxBookingDaysAhead
      )
    };
  }, [settings]);

  if (loading) return <LoadingState />;
  if (pageError || !settings || !management) {
    return (
      <ErrorState
        message={pageError || 'Agendamento não encontrado ou link expirado.'}
        onRetry={() => void refresh()}
      />
    );
  }

  async function reschedule() {
    if (!selectedSlot) {
      setActionError('Escolha um novo horário para continuar.');
      return;
    }
    setActionLoading(true);
    setActionError('');
    try {
      const result = await reschedulePublicBooking({
        slug: props.slug,
        token: props.token,
        startsAt: selectedSlot.start
      });
      setManagement(result);
      setRescheduleDate('');
      setSelectedSlot(null);
      setAvailabilitySlots([]);
    } catch (error) {
      setActionError(getErrorMessage(error));
      setSelectedSlot(null);
    } finally {
      setActionLoading(false);
    }
  }

  async function cancel(reason: string) {
    setActionLoading(true);
    setActionError('');
    try {
      setManagement(await cancelPublicBooking({
        slug: props.slug,
        token: props.token,
        reason: reason || undefined
      }));
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  }

  async function submitPaymentProof(file: File) {
    const validationError = validatePaymentProofFile(file);
    if (validationError) {
      setActionError(validationError);
      return;
    }
    setActionLoading(true);
    setActionError('');
    try {
      const dataUrl = await fileToDataUrl(file);
      setManagement(await submitPublicBookingPaymentProof({
        slug: props.slug,
        token: props.token,
        dataUrl
      }));
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <PublicAppointmentManager
      key={`${management.booking.appointment.status}-${management.booking.appointment.date}`}
      management={management}
      settings={settings}
      availabilitySlots={availabilitySlots}
      availabilityLoading={availabilityLoading}
      availabilityError={availabilityError}
      selectedSlot={selectedSlot}
      rescheduleDate={rescheduleDate}
      minimumDate={dateBounds.minimum}
      maximumDate={dateBounds.maximum}
      actionLoading={actionLoading}
      actionError={actionError}
      onRescheduleDate={setRescheduleDate}
      onSelectSlot={setSelectedSlot}
      onReschedule={() => void reschedule()}
      onCancel={reason => void cancel(reason)}
      onSubmitPaymentProof={file => void submitPaymentProof(file)}
    />
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Não foi possível ler o comprovante.'));
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.readAsDataURL(file);
  });
}


function validatePaymentProofFile(file: File): string | null {
  const allowedTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ]);
  if (!allowedTypes.has(file.type)) {
    return 'Envie um comprovante em JPG, PNG, WebP ou PDF.';
  }
  if (file.size <= 0) return 'O arquivo selecionado está vazio.';
  if (file.size > 5 * 1024 * 1024) {
    return 'O comprovante precisa ter no máximo 5 MB.';
  }
  return null;
}
