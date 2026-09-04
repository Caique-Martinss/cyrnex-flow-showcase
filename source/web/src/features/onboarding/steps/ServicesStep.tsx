import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { OnboardingState, Service, ServiceAddonDraft } from '../../../domain/types';
import { createService } from '../onboarding.helpers';

interface StepProps {
  draft: OnboardingState;
  setDraft: Dispatch<SetStateAction<OnboardingState>>;
}

const commonServices = [
  ['Corte', 'Cabelo'],
  ['Barba', 'Barba'],
  ['Corte + Barba', 'Combos'],
  ['Sobrancelha', 'Outros'],
  ['Corte infantil', 'Infantil']
] as const;

export function ServicesStep({ draft, setDraft }: StepProps) {
  const active = draft.services.filter(item => item.active);
  const serviceProfessionals = draft.professionals.filter(item => item.active && item.servesClients);
  const [expanded, setExpanded] = useState<string[]>(() => active[0] ? [active[0].id] : []);

  function addService(name = '', category = 'Cabelo') {
    const service = createService(name, category);
    service.professionalIds = serviceProfessionals.map(item => item.id);
    setDraft(current => ({ ...current, services: [...current.services, service] }));
    setExpanded(current => [...current, service.id]);
  }

  function updateService(id: string, patch: Partial<Service>) {
    setDraft(current => ({
      ...current,
      services: current.services.map(item => item.id === id ? { ...item, ...patch } : item)
    }));
  }

  function toggleExpanded(id: string) {
    setExpanded(current => current.includes(id)
      ? current.filter(item => item !== id)
      : [...current, id]);
  }

  return (
    <section className="onboarding-step">
      <header>
        <span className="eyebrow">Etapa 5</span>
        <h1>Quais serviços você oferece?</h1>
        <p>
          Cadastre quantos quiser. Cada serviço pode ser recolhido para a página continuar organizada
          mesmo quando você tiver uma lista grande.
        </p>
      </header>

      <div className="section-card quick-service-card">
        <div className="section-card-header">
          <div>
            <h2>Adicionar serviço comum</h2>
            <p>Escolha um atalho ou crie do zero.</p>
          </div>
        </div>
        <div className="selectable-chip-list">
          {commonServices.map(([name, category]) => (
            <button type="button" className="selectable-chip" key={name} onClick={() => addService(name, category)}>
              + {name}
            </button>
          ))}
          <button type="button" className="selectable-chip add-chip" onClick={() => addService()}>
            + Criar do zero
          </button>
        </div>
      </div>

      {active.length === 0 ? (
        <div className="empty-inline large-empty">
          Nenhum serviço cadastrado ainda. Adicione pelo menos um para continuar.
        </div>
      ) : null}

      <div className="service-editor-list">
        {active.map((service, index) => (
          <ServiceEditor
            key={service.id}
            index={index}
            service={service}
            draft={draft}
            expanded={expanded.includes(service.id)}
            onToggle={() => toggleExpanded(service.id)}
            onChange={patch => updateService(service.id, patch)}
            onRemove={() => updateService(service.id, { active: false })}
          />
        ))}
      </div>

      <button type="button" className="secondary-button add-wide-button" onClick={() => addService()}>
        + Adicionar outro serviço
      </button>
    </section>
  );
}

function ServiceEditor(props: {
  index: number;
  service: Service;
  draft: OnboardingState;
  expanded: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<Service>) => void;
  onRemove: () => void;
}) {
  const service = props.service;
  const team = props.draft.settings.operationMode === 'team';
  const professionals = props.draft.professionals.filter(item => item.active && item.servesClients);

  function toggleProfessional(id: string) {
    const current = service.professionalIds;
    props.onChange({
      professionalIds: current.includes(id)
        ? current.filter(item => item !== id)
        : [...current, id]
    });
  }

  function addAddon() {
    props.onChange({
      addons: [
        ...service.addons,
        { id: crypto.randomUUID(), name: '', priceDelta: 0, durationDeltaMinutes: 0, active: true }
      ]
    });
  }

  function updateAddon(id: string, patch: Partial<ServiceAddonDraft>) {
    props.onChange({ addons: service.addons.map(item => item.id === id ? { ...item, ...patch } : item) });
  }

  return (
    <article
      className={props.expanded
        ? 'section-card service-editor-card'
        : 'section-card service-editor-card collapsed'}
    >
      <div className="service-summary-header">
        <button type="button" className="service-summary-main" onClick={props.onToggle}>
          <div>
            <span className="eyebrow">Serviço {props.index + 1}</span>
            <h2>{service.name || 'Novo serviço'}</h2>
          </div>
          <div className="service-summary-data">
            <span>{service.priceType === 'consult' ? 'Sob consulta' : formatMoney(service.price)}</span>
            <span>{service.durationMinutes} min</span>
<span>
              {props.draft.settings.bookingRules.requireDeposit
                ? `Sinal: ${props.draft.settings.defaultDepositPercent}% (padrão)`
                : 'Sinal: não exigido'}
            </span>
          </div>
        </button>
        <div className="service-summary-actions">
          <button type="button" className="secondary-button" onClick={props.onToggle}>
            {props.expanded ? 'Recolher' : 'Expandir'}
          </button>
          <button type="button" className="danger-link" onClick={props.onRemove}>Remover</button>
        </div>
      </div>

      {!props.expanded ? null : (
        <div className="service-expanded-content">
          <div className="onboarding-form-grid three-columns service-primary-fields">
            <label>
              Nome do serviço
              <input
                value={service.name}
                onChange={event => props.onChange({ name: event.target.value })}
                placeholder="Ex.: Corte degradê"
              />
            </label>
            <label>
              Categoria
              <select
                value={service.category ?? 'Outros'}
                onChange={event => props.onChange({ category: event.target.value })}
              >
                {['Cabelo', 'Barba', 'Combos', 'Química', 'Prótese capilar', 'Infantil', 'Outros'].map(item => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              Como mostrar o preço?
              <select
                value={service.priceType}
                onChange={event => props.onChange({ priceType: event.target.value as Service['priceType'] })}
              >
                <option value="fixed">Valor fixo</option>
                <option value="from">A partir de</option>
                <option value="consult">Sob consulta</option>
              </select>
            </label>
            {service.priceType !== 'consult' ? (
              <label>
                Preço
                <div className="input-prefix"><span>R$</span><input
                  type="number"
                  min="0"
                  step="0.01"
                  value={service.price}
                  onChange={event => props.onChange({ price: Number(event.target.value) })}
                /></div>
              </label>
            ) : null}
            <label>
              Quanto tempo costuma levar?
              <select
                value={service.durationMinutes}
                onChange={event => props.onChange({ durationMinutes: Number(event.target.value) })}
              >
                {[15, 20, 30, 40, 45, 50, 60, 75, 90, 120, 150, 180].map(item => (
                  <option key={item} value={item}>{item} min</option>
                ))}
              </select>
            </label>
            <label>
              Tempo livre depois
              <select
                value={service.bufferAfterMinutes}
                onChange={event => props.onChange({ bufferAfterMinutes: Number(event.target.value) })}
              >
                {[0, 5, 10, 15, 20, 30, 45, 60].map(item => (
                  <option key={item} value={item}>{item === 0 ? 'Nenhum' : `${item} min`}</option>
                ))}
              </select>
              <small>Tempo para limpar, organizar ou se preparar antes do próximo cliente.</small>
            </label>
            <label>
              Retorno recomendado <span className="optional-label">opcional</span>
              <select
                value={service.recommendedReturnDays ?? ''}
                onChange={event => props.onChange({
                  recommendedReturnDays: event.target.value ? Number(event.target.value) : null
                })}
              >
                <option value="">Não definir agora</option>
                {[7, 14, 21, 30, 45, 60, 90].map(days => <option key={days} value={days}>{days} dias</option>)}
              </select>
              <small>Ajuda “Clientes para retornar” a lembrar quem está na hora de voltar.</small>
            </label>
          </div>

          <label>
            Descrição para o cliente <span className="optional-label">opcional</span>
            <textarea
              value={service.description ?? ''}
              onChange={event => props.onChange({ description: event.target.value || null })}
              placeholder="Explique brevemente o que está incluído."
            />
          </label>

          <div className="settings-toggle-list compact-toggle-list">
            <Toggle
              title="Pode ser agendado online?"
              description="Desative para serviços que precisam de avaliação ou contato prévio."
              checked={service.onlineBookingEnabled}
              onChange={value => props.onChange({ onlineBookingEnabled: value })}
            />
            <Toggle
              title="Mostrar preço na página pública?"
              description="Você pode esconder o valor mesmo mantendo o serviço visível."
              checked={service.publicPriceVisible}
              onChange={value => props.onChange({ publicPriceVisible: value })}
            />
          </div>

          <div className="section-card service-deposit-card">
            <div className="section-card-header compact-header">
              <div>
                <strong>Sinal deste serviço</strong>
                <p>Usa a regra padrão definida na etapa Agendamento.</p>
              </div>
              <span className="recommended-badge">Regra padrão</span>
            </div>
            <div className="info-callout compact-callout">
              {props.draft.settings.bookingRules.requireDeposit
                ? `Sinal de ${props.draft.settings.defaultDepositPercent}% por Pix manual com comprovante.`
                : 'Este serviço não exige sinal no momento.'}
              {' '}Percentual diferente por serviço pode ser liberado depois sem alterar este fluxo.
            </div>
          </div>

          {team ? (
            <div className="service-professionals">
              <strong>Quem realiza este serviço?</strong>
              <div className="selectable-chip-list">
                {professionals.map(professional => (
                  <button
                    key={professional.id}
                    type="button"
                    className={service.professionalIds.includes(professional.id)
                      ? 'selectable-chip active'
                      : 'selectable-chip'}
                    onClick={() => toggleProfessional(professional.id)}
                  >
                    {service.professionalIds.includes(professional.id) ? '✓ ' : ''}
                    {professional.professionalName || professional.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="service-addons section-card">
            <div className="section-card-header">
              <div>
                <strong>Adicionais</strong>
                <p>Ex.: sobrancelha adiciona R$ 15 e mais 10 minutos ao atendimento.</p>
              </div>
              <button type="button" className="secondary-button" onClick={addAddon}>
                + Adicionar adicional
              </button>
            </div>
            {service.addons.filter(item => item.active).map(addon => (
              <div className="addon-field-card" key={addon.id}>
                <label>
                  Nome do adicional
                  <input
                    value={addon.name}
                    onChange={event => updateAddon(addon.id, { name: event.target.value })}
                    placeholder="Ex.: Sobrancelha"
                  />
                </label>
                <label>
                  Preço adicional
                  <div className="input-prefix"><span>R$</span><input
                    type="number"
                    min="0"
                    step="0.01"
                    value={addon.priceDelta}
                    onChange={event => updateAddon(addon.id, { priceDelta: Number(event.target.value) })}
                  /></div>
                </label>
                <label>
                  Tempo adicional
                  <div className="number-suffix"><input
                    type="number"
                    min="0"
                    value={addon.durationDeltaMinutes}
                    onChange={event => updateAddon(addon.id, { durationDeltaMinutes: Number(event.target.value) })}
                  /><span>min</span></div>
                </label>
                <button className="danger-link" type="button" onClick={() => updateAddon(addon.id, { active: false })}>
                  Remover
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

function Toggle(props: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="settings-toggle-row">
      <span><strong>{props.title}</strong><small>{props.description}</small></span>
      <input type="checkbox" checked={props.checked} onChange={event => props.onChange(event.target.checked)} />
    </label>
  );
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
}
