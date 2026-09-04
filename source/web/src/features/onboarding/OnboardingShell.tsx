import type { ReactNode } from 'react';
import { ThemeSwitch } from '../../components/ui/ThemeSwitch';
import type { Theme } from '../../hooks/useTheme';
import { onboardingSteps } from './onboarding.constants';

interface OnboardingShellProps {
  step: number;
  maxReachedStep: number;
  mode: 'initial' | 'edit';
  saving: boolean;
  error: string;
  completionBlockCount: number;
  theme: Theme;
  children: ReactNode;
  onThemeChange: (theme: Theme) => void;
  onStepChange: (step: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  onComplete: () => void;
  onCancel?: () => void;
}

export function OnboardingShell(props: OnboardingShellProps) {
  const lastStep = props.step === onboardingSteps.length - 1;
  const completionBlocked = lastStep && props.completionBlockCount > 0;
  const progress = Math.round(((props.step + 1) / onboardingSteps.length) * 100);
  const currentLabel = onboardingSteps[props.step]?.label ?? 'Configuração';

  return (
    <div className="onboarding-screen premium-onboarding-shell">
      <aside className="onboarding-sidebar">
        <div className="onboarding-brand">
          <span className="brand-mark">CRX</span>
          <div>
            <strong>CYRNEX FLOW</strong>
            <small>Configuração da barbearia</small>
          </div>
        </div>

        <div className="onboarding-progress-card">
          <div className="onboarding-progress-copy">
            <span>{props.mode === 'initial' ? 'Primeira configuração' : 'Editando configuração'}</span>
            <strong>{props.step + 1} de {onboardingSteps.length}</strong>
          </div>
          <strong className="onboarding-mobile-current">{currentLabel}</strong>
          <div className="onboarding-progress-track" aria-label={`Progresso ${progress}%`}>
            <span style={{ width: `${progress}%` }} />
          </div>
          <small>{progress}% concluído</small>
        </div>

        <nav aria-label="Etapas da configuração">
          {onboardingSteps.map((item, index) => {
            const active = index === props.step;
            const completed = index < props.step || index <= props.maxReachedStep && index !== props.step;
            return (
              <button
                key={item.id}
                type="button"
                className={`${active ? 'active' : ''} ${completed ? 'completed' : ''}`.trim()}
                disabled={props.mode === 'initial' && index > props.maxReachedStep}
                onClick={() => props.onStepChange(index)}
              >
                <span>{completed && !active ? '✓' : index + 1}</span>
                <div>
                  <strong>{item.label}</strong>
                  <small>{stepSupportText(index)}</small>
                </div>
              </button>
            );
          })}
        </nav>

        <div className="onboarding-sidebar-note">
          <strong>Você não perde o que já salvou.</strong>
          <span>Tudo poderá ser alterado depois em Configurações.</span>
        </div>
      </aside>

      <main className="onboarding-main">
        <div className="onboarding-topbar">
          <div className="onboarding-topbar-copy">
            <span className="eyebrow">{props.mode === 'initial' ? 'Configuração guiada' : 'Configurações'}</span>
            <strong>{currentLabel}</strong>
          </div>
          <div className="onboarding-topbar-actions">
            <span className="onboarding-autosave-status">
              <i aria-hidden="true" />
              Alterações salvas durante o processo
            </span>
            <ThemeSwitch
              theme={props.theme}
              onChange={props.onThemeChange}
              label="Tema do onboarding"
              compact
            />
          </div>
        </div>

        <div className="onboarding-content">
          {props.error ? (
            <div className="onboarding-error" role="alert">
              {props.error}
            </div>
          ) : null}

          {props.children}

          <footer className="onboarding-actions">
            <div>
              {props.mode === 'edit' && props.onCancel ? (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={props.onCancel}
                  disabled={props.saving}
                >
                  Voltar ao painel
                </button>
              ) : null}
            </div>

            <div>
              {props.step > 0 ? (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={props.onPrevious}
                  disabled={props.saving}
                >
                  ← Voltar
                </button>
              ) : null}

              <button
                type="button"
                onClick={lastStep ? props.onComplete : props.onNext}
                disabled={props.saving || completionBlocked}
              >
                {getPrimaryLabel(
                  props.saving,
                  lastStep,
                  props.mode,
                  props.completionBlockCount
                )}
              </button>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}

function stepSupportText(index: number): string {
  return [
    'Nome e endereço',
    'Identidade e mídia',
    'Equipe e operação',
    'Expediente',
    'Catálogo e preços',
    'Regras do booking',
    'Formas de receber',
    'Recursos do sistema',
    'Experiência do cliente',
    'Checklist final'
  ][index] ?? '';
}

function getPrimaryLabel(
  saving: boolean,
  lastStep: boolean,
  mode: 'initial' | 'edit',
  completionBlockCount: number
): string {
  if (saving) return 'Salvando...';
  if (!lastStep) return 'Salvar e continuar →';
  if (completionBlockCount > 0) {
    return `${completionBlockCount} ajuste(s) necessário(s) antes de concluir`;
  }
  return mode === 'initial'
    ? 'Concluir configuração e entrar no painel'
    : 'Salvar alterações';
}
