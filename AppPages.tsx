import { api } from './http';

export async function sendSimulatedMessage(
  clientId: string,
  message: string
): Promise<void> {
  await api.post('/messages/send', { clientId, message });
}
