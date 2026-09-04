import type { Dispatch, SetStateAction } from 'react';
import type { OnboardingState } from '../../../domain/types';
import { slugify } from '../onboarding.helpers';

interface StepProps {
  draft: OnboardingState;
  setDraft: Dispatch<SetStateAction<OnboardingState>>;
}

export function BusinessStep({ draft, setDraft }: StepProps) {
  const settings = draft.settings;

  return (
    <section className="onboarding-step compact-onboarding-step">
      <header>
        <span className="eyebrow">Etapa 1</span>
        <h1>Vamos começar pela sua barbearia</h1>
        <p>Informe o nome que seus clientes conhecem. O restante será configurado passo a passo.</p>
      </header>

      <div className="section-card onboarding-start-card">
        <label>
          Nome da barbearia
          <input
            autoFocus
            value={settings.businessName}
            onChange={event => {
              const name = event.target.value;
              setDraft(current => {
                const oldAutoSlug = slugify(current.settings.businessName);
                const shouldUpdateSlug = !current.settings.bookingSlug || current.settings.bookingSlug === oldAutoSlug;
                return {
                  ...current,
                  settings: {
                    ...current.settings,
                    businessName: name,
                    bookingSlug: shouldUpdateSlug ? slugify(name) : current.settings.bookingSlug
                  }
                };
              });
            }}
            placeholder="Ex.: RPL Barber"
          />
          <small>Use o nome que aparece na fachada, Instagram ou que seus clientes já conhecem.</small>
        </label>

        <label>
          Seu endereço no CYRNEX
          <div className="input-prefix">
            <span>smartcommerce.app/</span>
            <input
              value={settings.bookingSlug}
              onChange={event => {
                const bookingSlug = slugify(event.target.value);
                setDraft(current => ({
                  ...current,
                  settings: { ...current.settings, bookingSlug }
                }));
              }}
              placeholder="rpl-barber"
            />
          </div>
          <small>Geramos automaticamente pelo nome. Você pode personalizar agora ou depois.</small>
        </label>
      </div>
    </section>
  );
}
