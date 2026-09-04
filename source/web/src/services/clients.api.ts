import type { Client } from '../domain/types';
import { api } from './http';

export async function loadClients(): Promise<Client[]> {
  const response = await api.get<Client[]>('/clients');
  return response.data;
}

export async function createClient(input: {
  name: string;
  phone: string;
  email?: string;
}): Promise<Client> {
  const response = await api.post<Client>('/clients', input);
  return response.data;
}


export async function updateClient(
  clientId: string,
  input: { name: string; phone: string; email?: string }
): Promise<Client> {
  const response = await api.patch<Client>(`/clients/${clientId}`, input);
  return response.data;
}
