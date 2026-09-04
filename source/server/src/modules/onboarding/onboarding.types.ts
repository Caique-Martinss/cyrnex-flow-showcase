import type {
  BusinessSettings,
  Professional,
  Service
} from '../../domain/types.js';

export interface OnboardingState {
  settings: BusinessSettings;
  services: Service[];
  professionals: Professional[];
}

export interface SaveOnboardingInput extends OnboardingState {
  currentStep: number;
}
