import type { OnboardingState } from '../../domain/types';
import type { Theme } from '../../hooks/useTheme';
import { OnboardingShell } from './OnboardingShell';
import { OnboardingSuccess } from './OnboardingSuccess';
import { getReviewIssues } from './onboarding.helpers';
import { useOnboardingEditor } from './useOnboardingEditor';
import { AboutStep } from './steps/AboutStep';
import { BookingRulesStep } from './steps/BookingRulesStep';
import { BusinessStep } from './steps/BusinessStep';
import { HoursStep } from './steps/HoursStep';
import { ModulesStep } from './steps/ModulesStep';
import { OperationStep } from './steps/OperationStep';
import { PaymentsStep } from './steps/PaymentsStep';
import { PublicPageStep } from './steps/PublicPageStep';
import { ReviewStep } from './steps/ReviewStep';
import { ServicesStep } from './steps/ServicesStep';

interface OnboardingPageProps {
  initialState: OnboardingState;
  mode: 'initial' | 'edit';
  onComplete: (state: OnboardingState) => void;
  onCancel?: () => void;
  initialStep?: number;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}

export function OnboardingPage(props: OnboardingPageProps) {
  const editor = useOnboardingEditor({
    initialState: props.initialState,
    mode: props.mode,
    onComplete: props.onComplete,
    initialStep: props.initialStep
  });

  if (editor.completedState) {
    return (
      <OnboardingSuccess
        state={editor.completedState}
        onEnterDashboard={editor.enterDashboard}
      />
    );
  }

  const completionBlockCount = getReviewIssues(editor.draft)
    .filter(item => item.severity === 'error')
    .length;

  return (
    <OnboardingShell
      step={editor.step}
      maxReachedStep={editor.maxReachedStep}
      mode={props.mode}
      saving={editor.saving}
      error={editor.error}
      completionBlockCount={completionBlockCount}
      theme={props.theme}
      onThemeChange={props.onThemeChange}
      onStepChange={editor.changeStep}
      onPrevious={editor.previous}
      onNext={() => void editor.saveAndContinue()}
      onComplete={() => void editor.finish()}
      onCancel={props.onCancel}
    >
      {renderStep(
        editor.step,
        editor.draft,
        editor.setDraft,
        editor.editFromReview,
        editor.skipOptionalStep
      )}
    </OnboardingShell>
  );
}

function renderStep(
  step: number,
  draft: OnboardingState,
  setDraft: ReturnType<typeof useOnboardingEditor>['setDraft'],
  onEditFromReview: (step: number) => void,
  onSkip: () => void
) {
  const sharedProps = { draft, setDraft };

  switch (step) {
    case 0:
      return <BusinessStep {...sharedProps} />;
    case 1:
      return <AboutStep {...sharedProps} onSkip={onSkip} />;
    case 2:
      return <OperationStep {...sharedProps} />;
    case 3:
      return <HoursStep {...sharedProps} />;
    case 4:
      return <ServicesStep {...sharedProps} />;
    case 5:
      return <BookingRulesStep {...sharedProps} />;
    case 6:
      return <PaymentsStep {...sharedProps} />;
    case 7:
      return <ModulesStep {...sharedProps} />;
    case 8:
      return <PublicPageStep {...sharedProps} />;
    default:
      return <ReviewStep draft={draft} onEdit={onEditFromReview} />;
  }
}
