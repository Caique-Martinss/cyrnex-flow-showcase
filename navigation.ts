import type {
  Appointment,
  AvailabilityResponse,
  PaymentMethod,
  RetroactiveProofType,
  RetroactiveServiceRequest,
  ScheduleBlock,
  ScheduleBlockType
} from '../domain/types';
import { api } from './http';

export async function loadAdminAvailability(input: {
  serviceId: string;
  professionalId: string;
  date: string;
  ignoredAppointmentId?: string;
}): Promise<AvailabilityResponse> {
  const response = await api.get<AvailabilityResponse>(
    '/scheduling/availability',
    { params: input }
  );
  return response.data;
}

export async function loadScheduleBlocks(): Promise<ScheduleBlock[]> {
  const response = await api.get<ScheduleBlock[]>('/scheduling/blocks');
  return response.data;
}

export async function createScheduleBlock(input: {
  professionalId: string | null;
  startsAt: string;
  endsAt: string;
  blockType: ScheduleBlockType;
  reason: string;
}): Promise<ScheduleBlock> {
  const response = await api.post<ScheduleBlock>('/scheduling/blocks', input);
  return response.data;
}

export async function deleteScheduleBlock(id: string): Promise<void> {
  await api.delete(`/scheduling/blocks/${id}`);
}

export async function rescheduleAppointment(
  id: string,
  date: string,
  scope: 'this' | 'future' | 'all' = 'this'
): Promise<Appointment> {
  const response = await api.patch<Appointment>(
    `/appointments/${id}/reschedule`,
    { date, scope }
  );
  return response.data;
}

export async function loadRetroactiveRequests(): Promise<RetroactiveServiceRequest[]> {
  const response = await api.get<RetroactiveServiceRequest[]>(
    '/retroactive-services'
  );
  return response.data;
}

export async function createRetroactiveRequest(input: {
  clientId: string;
  serviceId: string;
  professionalId: string;
  startsAt: string;
  price: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  reason: string;
  proofType: RetroactiveProofType;
  proofReference: string;
  proofDescription: string;
}): Promise<RetroactiveServiceRequest> {
  const response = await api.post<RetroactiveServiceRequest>(
    '/retroactive-services',
    input
  );
  return response.data;
}

export async function approveRetroactiveRequest(
  id: string,
  input: {
    reviewNote?: string;
    evidenceConfirmed?: boolean;
    confirmConflict?: boolean;
    conflictJustification?: string;
  } = {}
): Promise<{ request: RetroactiveServiceRequest; appointment: Appointment }> {
  const response = await api.patch<{
    request: RetroactiveServiceRequest;
    appointment: Appointment;
  }>(`/retroactive-services/${id}/approve`, {
    reviewNote: input.reviewNote ?? '',
    evidenceConfirmed: input.evidenceConfirmed ?? true,
    confirmConflict: input.confirmConflict ?? false,
    conflictJustification: input.conflictJustification ?? ''
  });
  return response.data;
}

export async function rejectRetroactiveRequest(
  id: string,
  reviewNote: string
): Promise<RetroactiveServiceRequest> {
  const response = await api.patch<RetroactiveServiceRequest>(
    `/retroactive-services/${id}/reject`,
    { reviewNote }
  );
  return response.data;
}
