import type { BusinessSubscription } from '../domain/subscription.types';
import { api } from './http';

export async function getSubscriptionStatus(): Promise<BusinessSubscription> {
  const response = await api.get<BusinessSubscription>('/subscription/status');
  return response.data;
}
