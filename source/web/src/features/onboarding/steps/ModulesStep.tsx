import type { Dispatch, SetStateAction } from 'react';
import type { BusinessModuleKey, BusinessRuleSetting, OnboardingState } from '../../../domain/types';
import { isLaunchReadyModule, moduleLabels, ruleLabels } from '../onboarding.constants';
interface StepProps {
    draft: OnboardingState;
    setDraft: Dispatch<SetStateAction<OnboardingState>>;
}

export function ModulesStep({ draft, setDraft }: StepProps) {
    const modules = draft.settings.modules.filter(item => (
      item.key !== 'commissions' || draft.settings.operationMode === 'team'
    ));
    function updateModule(key: BusinessModuleKey, enabled: boolean) {
        setDraft(current => ({
            ...current,
            settings: {
                ...current.settings,
                modules: current.settings.modules.map(item => item.key === key ? { ...item, enabled } : item)
            }
        }));
    }
    function updateRule(key: BusinessRuleSetting['key'], patch: Partial<BusinessRuleSetting>) {
        setDraft(current => ({ ...current, settings: {
          ...current.settings,
          rules: current.settings.rules.map(item => item.key === key ? { ...item, ...patch } : item)
        } }));
    }
    const selected = modules.filter(item => item.enabled && isLaunchReadyModule(item.key));
    return (<section className="onboarding-step">
      <header>
        <span className="eyebrow">Etapa 8</span>
        <h1>Escolha o que você quer usar</h1>
        <p>Não sabe se vai usar tudo? Sem problema. Você pode ativar ou desativar recursos depois.</p>
      </header>

      <div className="module-card-grid">
        {modules.map(module => {
            const copy = moduleLabels[module.key];
            const available = isLaunchReadyModule(module.key);
            return (<article
              className={available && module.enabled
                ? 'module-choice-card active'
                : 'module-choice-card module-coming-soon'}
              key={module.key}
            >
              <div className="module-card-top">
<div>
{available && copy.recommended ? <span className="recommended-badge">Recomendado</span> : null}
{!available ? <span className="recommended-badge development-badge">Em desenvolvimento</span> : null}
<h2>{copy.title}</h2>
</div>
<button
                type="button"
                className={available && module.enabled ? 'module-toggle active' : 'module-toggle'}
                onClick={() => available && updateModule(module.key, !module.enabled)}
                disabled={!available}
              >{available ? (module.enabled ? '✓ Ativado' : 'Ativar') : 'Indisponível'}</button>
</div>
              <p>{copy.description}</p>
              {!available ? (
                <small>
                  Este recurso permanece visível para mostrar o roadmap, mas não pode
                  ser ativado no lançamento atual.
                </small>
              ) : null}
            </article>);
        })}
      </div>

      <div className="section-card module-summary-card">
        <div>
<span className="eyebrow">Sua escolha</span>
<h2>{selected.length} recursos ativados</h2>
</div>
        <div className="chip-list">
          {selected.map(item => (
            <span key={item.key}>{moduleLabels[item.key].title}</span>
          ))}
        </div>
        <p>
          Recursos prontos podem ser ativados ou desativados. Os que ainda estão em
          desenvolvimento permanecem visíveis, mas indisponíveis até serem concluídos.
        </p>
      </div>

      <div className="section-card">
        <div className="section-card-header">
<div>
<span className="eyebrow">Regras especiais</span>
<h2>Situações reais da barbearia</h2>
<p>Essas opções são independentes dos módulos acima.</p>
</div>
</div>
        <div className="settings-toggle-list">
          {draft.settings.rules.map(rule => {
            const label = ruleLabels[rule.key];
            return (<div className="rule-setting-row" key={rule.key}>
                <label className="settings-toggle-row">
<span>
<strong>{label.title}</strong>
<small>{label.description}</small>
</span>
<input
                  type="checkbox"
                  checked={rule.key === 'repeat_no_show_deposit' ? false : rule.enabled}
                  disabled={rule.key === 'repeat_no_show_deposit'}
                  onChange={event => updateRule(rule.key, { enabled: event.target.checked })}
                />
</label>
                {rule.enabled && rule.key === 'groom_courtesy' ? <div className="rule-config-note">
<strong>100% de desconto</strong>
<span>O valor original continua registrado para o financeiro saber quanto foi concedido em cortesia.</span>
</div> : null}
                {rule.key === 'repeat_no_show_deposit' ? (
                  <div className="rule-config-note">
                    <strong>Em desenvolvimento</strong>
                    <span>
                      Esta regra depende do fluxo de sinal online e será liberada
                      quando o pagamento estiver conectado.
                    </span>
                  </div>
                ) : null}
              </div>);
        })}
        </div>
      </div>
    </section>);
}
