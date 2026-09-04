import type {
  Appointment,
  AppointmentStatus,
  AvailabilityResponse,
  DepositStatus,
  PaymentMethod,
  PublicBookingResult,
  RecurrenceFrequency,
  RecurrenceSeries
} from '../domain/types';
import { api } from './http';

export interface AppointmentRecurrenceInput {
  frequency: RecurrenceFrequency;
  intervalWeeks?: number;
  weekdays?: number[];
  count?: number;
  serviceIds?: string[];
}

export async function loadAppointments(): Promise<Appointment[]> {
  const response = await api.get<Appointment[]>('/appointments');
  return response.data;
}

export async function createAppointment(input: {
  clientId: string;
  serviceId: string;
  professionalId: string;
  date: string;
  notes?: string;
  isFitIn?: boolean;
  conflictConfirmed?: boolean;
  fitInReason?: string;
  recurrence?: AppointmentRecurrenceInput;
}): Promise<Appointment | {
  appointment: Appointment;
  appointments: Appointment[];
  recurrenceId: string;
}> {
  const response = await api.post('/appointments', input);
  return response.data;
}

export async function loadAvailability(input: {
  slug: string;
  serviceId: string;
  professionalId: string;
  date: string;
}): Promise<AvailabilityResponse> {
  const response = await api.get<AvailabilityResponse>(
    '/public/availability',
    { params: input }
  );

  return response.data;
}

export async function createPublicBooking(input: {
  slug: string;
  name: string;
  phone: string;
  email?: string;
  serviceId: string;
  professionalId: string;
  date: string;
  bookingDate: string;
  notes?: string;
}): Promise<PublicBookingResult> {
  const response = await api.post<PublicBookingResult>(
    '/public/bookings',
    input
  );

  return response.data;
}

export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus,
  input?: {
    serviceId?: string;
    price?: number;
    paymentMethod?: PaymentMethod;
    cardFee?: number;
    notes?: string;
    confirmEarlyStart?: boolean;
    reason?: string;
  }
): Promise<Appointment> {
  const response = await api.patch<Appointment>(
    `/appointments/${id}/status`,
    { status, ...input }
  );

  return response.data;
}

export async function updateRecurrenceState(
  appointmentId: string,
  action: 'pause' | 'resume'
): Promise<RecurrenceSeries> {
  const response = await api.patch<RecurrenceSeries>(
    `/appointments/${appointmentId}/recurrence`,
    { action }
  );
  return response.data;
}

export async function updateDepositStatus(
  id: string,
  depositStatus: DepositStatus
): Promise<Appointment> {
  const response = await api.patch<Appointment>(
    `/appointments/${id}/deposit`,
    { depositStatus }
  );

  return response.data;
}

export interface AppointmentPaymentProof {
  id: string;
  amount: number;
  mimeType: string;
  sizeBytes: number;
  status: 'submitted' | 'confirmed' | 'rejected';
  submittedAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
  signedUrl: string;
}

export async function loadAppointmentPaymentProof(
  appointmentId: string
): Promise<AppointmentPaymentProof | null> {
  const response = await api.get<AppointmentPaymentProof | null>(
    `/appointments/${appointmentId}/payment-proof`
  );
  return response.data;
}

export async function reviewAppointmentPaymentProof(
  appointmentId: string,
  proofId: string,
  action: 'confirm' | 'reject',
  note?: string
): Promise<{ appointment: Appointment | null; proof: AppointmentPaymentProof | null }> {
  const response = await api.patch<{
    appointment: Appointment | null;
    proof: AppointmentPaymentProof | null;
  }>(
    `/appointments/${appointmentId}/payment-proof/${proofId}`,
    { action, note }
  );
  return response.data;
}
