import type { OnboardingState } from '../domain/types';
import { api } from './http';

export interface SaveOnboardingPayload extends OnboardingState {
  currentStep: number;
}

export async function saveOnboarding(
  payload: SaveOnboardingPayload
): Promise<OnboardingState> {
  const response = await api.put<OnboardingState>('/onboarding', payload);
  return response.data;
}

export async function completeOnboarding(
  payload: SaveOnboardingPayload
): Promise<OnboardingState> {
  const response = await api.post<OnboardingState>(
    '/onboarding/complete',
    payload
  );
  return response.data;
}
