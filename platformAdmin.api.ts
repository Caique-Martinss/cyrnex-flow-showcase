import type { BusinessSettings, Professional, Service } from '../domain/types';
import { api } from './http';

export async function loadSettings(): Promise<BusinessSettings> {
  const response = await api.get<BusinessSettings>('/settings');
  return response.data;
}

export async function loadServices(): Promise<Service[]> {
  const response = await api.get<Service[]>('/services');
  return response.data;
}

export async function loadProfessionals(): Promise<Professional[]> {
  const response = await api.get<Professional[]>('/professionals');
  return response.data;
}
