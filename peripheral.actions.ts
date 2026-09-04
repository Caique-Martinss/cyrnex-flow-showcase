import type {
  AvailabilityResponse,
  BusinessSettings,
  PublicBookingResult
} from '../domain/types';
import { api } from './http';

export interface PublicBookingPaymentState {
  required: boolean;
  method: 'pix' | null;
  pixKeyType: BusinessSettings['paymentPreferences']['pixKeyType'];
  pixKey: string;
  receiverName: string;
  proofId: string | null;
  proofStatus: 'none' | 'submitted' | 'confirmed' | 'rejected';
  proofSubmittedAt: string | null;
  proofReviewedAt: string | null;
  proofReviewNote: string | null;
}

export interface PublicBookingManagement {
  booking: PublicBookingResult;
  canReschedule: boolean;
  canCancel: boolean;
  changeDeadline: string | null;
  managementExpiresAt: string;
  payment: PublicBookingPaymentState;
}

export interface PublicBookingManagementPage {
  management: PublicBookingManagement;
  settings: BusinessSettings;
}

interface AccessInput {
  slug: string;
  token: string;
}

function accessHeaders(token: string) {
  return { 'x-booking-access-token': token };
}

export async function loadPublicBookingManagement(
  input: AccessInput
): Promise<PublicBookingManagementPage> {
  const response = await api.get<PublicBookingManagementPage>('/public/bookings/manage', {
    params: { slug: input.slug },
    headers: accessHeaders(input.token)
  });
  return response.data;
}

export async function loadPublicBookingManagementAvailability(
  input: AccessInput & { date: string }
): Promise<AvailabilityResponse> {
  const response = await api.get<AvailabilityResponse>(
    '/public/bookings/manage/availability',
    {
      params: { slug: input.slug, date: input.date },
      headers: accessHeaders(input.token)
    }
  );
  return response.data;
}

export async function reschedulePublicBooking(
  input: AccessInput & { startsAt: string }
): Promise<PublicBookingManagement> {
  const response = await api.patch<PublicBookingManagement>(
    '/public/bookings/manage/reschedule',
    { slug: input.slug, startsAt: input.startsAt },
    { headers: accessHeaders(input.token) }
  );
  return response.data;
}

export async function cancelPublicBooking(
  input: AccessInput & { reason?: string }
): Promise<PublicBookingManagement> {
  const response = await api.patch<PublicBookingManagement>(
    '/public/bookings/manage/cancel',
    { slug: input.slug, reason: input.reason },
    { headers: accessHeaders(input.token) }
  );
  return response.data;
}

export async function submitPublicBookingPaymentProof(
  input: AccessInput & { dataUrl: string }
): Promise<PublicBookingManagement> {
  const response = await api.post<PublicBookingManagement>(
    '/public/bookings/manage/payment-proof',
    { slug: input.slug, dataUrl: input.dataUrl },
    { headers: accessHeaders(input.token) }
  );
  return response.data;
}
