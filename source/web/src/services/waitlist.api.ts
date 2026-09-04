import type { WaitlistEntry, WaitlistStatus } from '../domain/types';
import { api } from './http';

export async function loadWaitlistEntries(): Promise<WaitlistEntry[]> {
  const response = await api.get<WaitlistEntry[]>('/waitlist');
  return response.data;
}

export async function createWaitlistEntry(input: {
  clientId: string;
  serviceId: string;
  professionalId?: string;
  desiredFrom: string;
  desiredTo: string;
  notes?: string;
}): Promise<WaitlistEntry> {
  const response = await api.post<WaitlistEntry>('/waitlist', input);
  return response.data;
}

export async function updateWaitlistStatus(id: string, status: WaitlistStatus): Promise<WaitlistEntry> {
  const response = await api.patch<WaitlistEntry>(`/waitlist/${id}/status`, { status });
  return response.data;
}
