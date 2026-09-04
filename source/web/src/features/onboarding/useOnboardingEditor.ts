import { useEffect, useRef, useState } from 'react';
import type { OnboardingState } from '../../domain/types';
import {
  completeOnboarding,
  getErrorMessage,
  saveOnboarding
} from '../../services';
import { cloneOnboardingState, validateStep } from './onboarding.helpers';
import { onboardingSteps } from './onboarding.constants';

const AUTO_SAVE_DELAY_MS = 900;

interface UseOnboardingEditorOptions {
  initialState: OnboardingState;
  mode: 'initial' | 'edit';
  onComplete: (state: OnboardingState) => void;
  initialStep?: number;
}

export function useOnboardingEditor(options: UseOnboardingEditorOptions) {
  const initialStep = options.mode === 'initial'
    ? Math.min(
        options.initialState.settings.onboarding.currentStep,
        onboardingSteps.length - 1
      )
    : Math.min(Math.max(options.initialStep ?? 0, 0), onboardingSteps.length - 1);
  const [draft, setDraft] = useState(() => cloneOnboardingState(options.initialState));
  const [step, setStep] = useState(initialStep);
  const [maxReachedStep, setMaxReachedStep] = useState(initialStep);
  const [returnToReview, setReturnToReview] = useState(false);
  const [completedState, setCompletedState] = useState<OnboardingState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const lastAutosaved = useRef(JSON.stringify(options.initialState));
  const autosaveTimer = useRef<number | null>(null);

  useEffect(() => {
    const serialized = JSON.stringify(draft);
    if (serialized === lastAutosaved.current || saving || completedState) return;
    if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);

    autosaveTimer.current = window.setTimeout(() => {
      void saveOnboarding({ ...draft, currentStep: maxReachedStep })
        .then(() => { lastAutosaved.current = serialized; })
        .catch(() => {
          // O avanço manual continuará exibindo o erro completo se a API estiver indisponível.
        });
    }, AUTO_SAVE_DELAY_MS);

    return () => {
      if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    };
  }, [completedState, draft, maxReachedStep, saving]);

  function changeStep(nextStep: number) {
    if (nextStep < 0 || nextStep >= onboardingSteps.length) return;
    if (options.mode === 'initial' && nextStep > maxReachedStep) return;
    setReturnToReview(false);
    setError('');
    setStep(nextStep);
  }

  function editFromReview(nextStep: number) {
    if (nextStep < 0 || nextStep >= onboardingSteps.length - 1) return;
    setReturnToReview(true);
    setError('');
    setStep(nextStep);
  }

  async function saveAndContinue() {
    const validationError = validateStep(draft, step);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError('');

    try {
      const normalNextStep = Math.min(step + 1, onboardingSteps.length - 1);
      const nextStep = returnToReview
        ? onboardingSteps.length - 1
        : normalNextStep;
      const nextMaxReached = Math.max(maxReachedStep, normalNextStep);
      const saved = await saveOnboarding({
        ...draft,
        currentStep: nextMaxReached
      });
      const cloned = cloneOnboardingState(saved);
      setDraft(cloned);
      lastAutosaved.current = JSON.stringify(cloned);
      setMaxReachedStep(nextMaxReached);
      setReturnToReview(false);
      setStep(nextStep);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function skipOptionalStep() {
    if (step !== 1) return;
    await saveAndContinue();
  }

  async function finish() {
    const validationError = validateStep(draft, onboardingSteps.length - 1);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError('');

    try {
      const saved = await completeOnboarding({
        ...draft,
        currentStep: onboardingSteps.length - 1
      });
      const cloned = cloneOnboardingState(saved);
      setDraft(cloned);
      lastAutosaved.current = JSON.stringify(cloned);

      if (options.mode === 'initial') {
        setCompletedState(cloned);
      } else {
        options.onComplete(cloned);
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  function enterDashboard() {
    if (completedState) options.onComplete(completedState);
  }

  return {
    draft,
    setDraft,
    step,
    maxReachedStep,
    completedState,
    saving,
    error,
    changeStep,
    editFromReview,
    previous: () => {
      setReturnToReview(false);
      setError('');
      setStep(current => Math.max(0, current - 1));
    },
    saveAndContinue,
    skipOptionalStep,
    finish,
    enterDashboard
  };
}
