import { useState } from 'react';
import type { OnboardingState } from '../../domain/types';
import { publicPageCompleteness } from './CustomerPagePreview';

interface OnboardingSuccessProps {
  state: OnboardingState;
  onEnterDashboard: () => void;
}

export function OnboardingSuccess({ state, onEnterDashboard }: OnboardingSuccessProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const settings = state.settings;
  const publicUrl = `https://smartcommerce.app/${settings.bookingSlug}`;
  const activeServices = state.services.filter(item => item.active).length;
  const activeDays = settings.businessHours.weeklySchedule.filter(item => item.enabled).length;
  const activeModules = settings.modules.filter(item => item.enabled).length;

  async function copyPublicLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setCopyError(false);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopyError(true);
    }
  }

  return (
    <div className="onboarding-success-screen">
      <main className="onboarding-success-card">
        <span className="success-celebration" aria-hidden="true">✓</span>
        <span className="eyebrow">Configuração concluída</span>
        <h1>{settings.businessName} está pronta!</h1>
        <p>
          Sua agenda, serviços, regras e recursos foram configurados. Você pode
          alterar qualquer informação depois sem precisar refazer o onboarding.
        </p>

        <div className="success-summary-grid">
          <div><strong>{activeDays}</strong><span>dias de atendimento</span></div>
          <div><strong>{activeServices}</strong><span>serviços</span></div>
          <div><strong>{activeModules}</strong><span>recursos ativos</span></div>
          <div>
            <strong>{publicPageCompleteness(state)}%</strong>
            <span>página completa</span>
          </div>
        </div>

        <div className="success-public-link">
          <span className="eyebrow">Página da barbearia</span>
          <strong>smartcommerce.app/{settings.bookingSlug}</strong>
          <small>
            {settings.profile.publicPageEnabled && settings.profile.publishOnComplete
              ? 'Endereço planejado para publicação quando o domínio estiver conectado.'
              : 'Mantida privada conforme sua configuração.'}
          </small>
          {copyError ? (
            <small role="status">
              Não foi possível copiar automaticamente. Selecione o endereço acima e copie manualmente.
            </small>
          ) : null}
        </div>

        <div className="success-actions">
          <button type="button" onClick={onEnterDashboard}>
            Entrar no meu painel
          </button>
          <button type="button" className="secondary-button" onClick={() => void copyPublicLink()}>
            {copied ? '✓ Endereço copiado' : 'Copiar endereço planejado'}
          </button>
        </div>

        <div className="info-callout">
          <strong>QR Code e domínio público</strong>
          <p>
            O QR Code definitivo deve ser gerado quando o domínio público estiver
            conectado. Assim ele nunca aponta para um endereço provisório ou incorreto.
          </p>
        </div>
      </main>
    </div>
  );
}
