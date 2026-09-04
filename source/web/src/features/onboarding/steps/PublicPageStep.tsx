import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { OnboardingState, PublicSectionKey } from '../../../domain/types';
import { publicSectionLabels } from '../onboarding.constants';
import { CustomerPagePreview, publicPageCompleteness } from '../CustomerPagePreview';
interface StepProps {
    draft: OnboardingState;
    setDraft: Dispatch<SetStateAction<OnboardingState>>;
}
export function PublicPageStep({ draft, setDraft }: StepProps) {
    const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('mobile');
    const [customerPreviewOpen, setCustomerPreviewOpen] = useState(false);
    const [testMessage, setTestMessage] = useState('');
    const settings = draft.settings;
    const profile = settings.profile;
    function updateProfile<K extends keyof typeof profile>(field: K, value: typeof profile[K]) {
        setDraft(current =>
          ({
            ...current,
            settings: {
              ...current.settings,
              profile: { ...current.settings.profile, [field]: value }
            }
          }));
    }
    function updateContact(field: keyof typeof settings.contact, value: string) {
        setDraft(current =>
          ({
            ...current,
            settings: {
              ...current.settings,
              contact: { ...current.settings.contact, [field]: value }
            }
          }));
    }
    function toggleSection(section: PublicSectionKey) {
        const current = profile.publicSections;
        updateProfile(
          'publicSections',
          current.includes(section) ? current.filter(item => item !== section) : [...current, section]
        );
    }
    function moveSection(section: PublicSectionKey, direction: -1 | 1) {
        const order = [...profile.sectionOrder];
        const index = order.indexOf(section);
        const next = index + direction;
        if (index < 0 || next < 0 || next >= order.length)
            return;
        [order[index], order[next]] = [order[next], order[index]];
        updateProfile('sectionOrder', order);
    }
    function testWhatsApp() {
        const digits = settings.contact.whatsapp.replace(/\D/g, '');
        if (digits.length < 10) {
          setTestMessage('Adicione um WhatsApp válido nesta etapa para testar esse botão.');
          return;
        }
        const destination = digits.startsWith('55') ? digits : `55${digits}`;
        setTestMessage('WhatsApp válido. Abrindo o contato em uma nova guia.');
        window.open(`https://wa.me/${destination}`, '_blank', 'noopener,noreferrer');
    }
    function testPrimaryAction() {
        if (profile.primaryAction === 'whatsapp') {
          testWhatsApp();
          return;
        }
        if (profile.primaryAction === 'services') {
          const serviceList = document.querySelector('.customer-preview-modal .preview-service-list');
          if (!serviceList) {
            setTestMessage('Ative a seção Serviços para testar esse botão.');
            return;
          }
          setTestMessage('Seção Serviços localizada na prévia.');
          serviceList.closest('.customer-preview-section')?.scrollIntoView({ behavior: 'smooth' });
          return;
        }
        const onlineServices = draft.services.filter(item => item.active && item.onlineBookingEnabled);
        setTestMessage(onlineServices.length
          ? 'Modo de teste: agora o cliente seguiria para escolher serviço, profissional e horário.'
          : 'Ative pelo menos um serviço para agendamento online antes de testar essa ação.');
    }
    const completeness = publicPageCompleteness(draft);
    return (<section className="onboarding-step public-builder-step">
      <header>
        <span className="eyebrow">Etapa 9</span>
        <h1>Monte a página que seus clientes vão ver</h1>
        <p>
          Agora tudo o que você configurou começa a virar uma página de verdade.
          Alterações aparecem na prévia imediatamente.
        </p>
      </header>

      <div className="public-builder-layout">
        <div className="public-builder-controls">
          <div className="section-card completeness-card">
            <div className="completeness-row">
<div>
<span className="eyebrow">Sua página</span>
<h2>{completeness}% completa</h2>
</div>
<strong>{profile.publicPageEnabled ? 'Preparada para publicar' : 'Privada'}</strong>
</div>
            <div className="progress-track">
<span style={{ width: `${completeness}%` }}/>
</div>
            <p>Itens opcionais não impedem a publicação. Eles só deixam a página mais completa.</p>
          </div>

          {testMessage ? (
            <div className="info-callout public-test-feedback" role="status">
              <strong>Teste da página</strong>
              <p>{testMessage}</p>
            </div>
          ) : null}

          <div className="section-card">
            <div className="section-card-header">
<div>
<h2>Link e publicação</h2>
</div>
</div>
            <label>Seu link<div className="input-prefix">
<span>smartcommerce.app/</span>
<input value={settings.bookingSlug} readOnly/>
</div>
</label>
            <Toggle
              title="Ativar página pública"
              description="Se desligar, o painel continua funcionando, mas o perfil público fica oculto."
              checked={profile.publicPageEnabled}
              onChange={value => updateProfile('publicPageEnabled', value)}
            />
            <Toggle
              title="Publicar ao concluir o onboarding"
              description="Se desativado, a página fica pronta em modo privado até você publicar manualmente."
              checked={profile.publishOnComplete}
              onChange={value => updateProfile('publishOnComplete', value)}
            />
          </div>

          <div className="section-card">
            <div className="section-card-header">
<div>
<h2>Contato e localização</h2>
<p>Essas informações não precisam ser preenchidas na Etapa 1.</p>
</div>
</div>
            <div className="onboarding-form-grid two-columns">
              <label>WhatsApp<input
                value={settings.contact.whatsapp}
                onChange={event => updateContact('whatsapp', event.target.value)}
                placeholder="(11) 99999-9999"
              />
</label>
              <label>Instagram<input
                value={settings.contact.instagram}
                onChange={event => updateContact('instagram', event.target.value)}
                placeholder="@rplbarber"
              />
</label>
              <label>Telefone <span className="optional-label">opcional</span>
<input value={settings.contact.phone} onChange={event => updateContact('phone', event.target.value)}/>
</label>
              <label>E-mail <span className="optional-label">opcional</span>
<input
                type="email"
                value={settings.contact.email}
                onChange={event => updateContact('email', event.target.value)}
              />
</label>
              <label className="wide-field">Endereço<input
                value={settings.contact.addressLine}
                onChange={event => updateContact('addressLine', event.target.value)}
                placeholder="Rua, número e complemento"
              />
</label>
              <label>
                Cidade
                <input
                  value={settings.contact.city}
                  onChange={event => updateContact('city', event.target.value)}
                />
              </label>
              <label>Estado<input
                maxLength={2}
                value={settings.contact.state}
                onChange={event => updateContact('state', event.target.value.toUpperCase())}
              />
</label>
              <label>CEP<input
                value={settings.contact.postalCode}
                onChange={event => updateContact('postalCode', event.target.value)}
                placeholder="00000-000"
              />
</label>
            </div>
            <label>Como mostrar a localização?<select
              value={profile.locationVisibility}
              onChange={event => updateProfile(
                'locationVisibility',
                event.target.value as typeof profile.locationVisibility
              )}
            >
<option value="full">Endereço completo</option>
<option value="area">Somente cidade/região</option>
<option value="hidden">Não mostrar localização</option>
</select>
</label>
          </div>

          <div className="section-card">
            <div className="section-card-header">
<div>
<h2>O que aparece na página?</h2>
<p>Ative somente o que você quer tornar público.</p>
</div>
</div>
            <div className="public-section-editor">
              {profile.sectionOrder.map((section, index) => (<div className="public-section-row" key={section}>
                  <label className="inline-check">
<input
                    type="checkbox"
                    checked={profile.publicSections.includes(section)}
                    onChange={() => toggleSection(section)}
                  /> {publicSectionLabels[section]}</label>
                  <div>
<button
                    type="button"
                    className="icon-button"
                    disabled={index === 0}
                    onClick={() => moveSection(section, -1)}
                  >↑</button>
<button
                    type="button"
                    className="icon-button"
                    disabled={index === profile.sectionOrder.length - 1}
                    onClick={() => moveSection(section, 1)}
                  >↓</button>
</div>
                </div>))}
            </div>
          </div>

          <div className="section-card">
            <div className="section-card-header">
<div>
<h2>O que você quer que o cliente faça primeiro?</h2>
<p>Essa será a ação mais destacada no topo da sua página pública.</p>
</div>
</div>
            <div className="choice-grid compact-choice-grid">
              {([
                ['booking', 'Agendar horário'],
                ['whatsapp', 'Falar no WhatsApp'],
                ['services', 'Ver serviços']
              ] as const).map(([value, label]) => <button
                type="button"
                key={value}
                className={profile.primaryAction === value ? 'choice-card active' : 'choice-card'}
                onClick={() => updateProfile('primaryAction', value)}
              >
<strong>{label}</strong>
</button>)}
            </div>
            <label>Aparência da página<select
              value={profile.theme}
              onChange={event => updateProfile('theme', event.target.value as typeof profile.theme)}
            >
<option value="auto">Seguir o aparelho do cliente</option>
<option value="light">Claro</option>
<option value="dark">Escuro</option>
</select>
</label>
          </div>
        </div>

        <div className="public-preview-column">
          <div className="preview-toolbar">
<strong>Prévia em tempo real</strong>
<div>
<button
            type="button"
            className={previewMode === 'mobile' ? 'active' : ''}
            onClick={() => setPreviewMode('mobile')}
          >📱 Celular</button>
<button
            type="button"
            className={previewMode === 'desktop' ? 'active' : ''}
            onClick={() => setPreviewMode('desktop')}
          >🖥️ Computador</button>
</div>
</div>
          <CustomerPagePreview
            draft={draft}
            mode={previewMode}
            onPrimaryAction={() => setCustomerPreviewOpen(true)}
            onWhatsApp={() => setCustomerPreviewOpen(true)}
          />
          <button
            type="button"
            className="secondary-button view-client-button"
            onClick={() => setCustomerPreviewOpen(true)}
          >👁 Ver como cliente</button>
          <div className="info-callout">
<strong>QR Code</strong>
<p>
  O QR Code definitivo será gerado a partir do link publicado, evitando criar um código
  para um endereço que ainda pode mudar durante o onboarding.
</p>
</div>
        </div>
      </div>

      {customerPreviewOpen ? (
        <div className="customer-preview-modal-backdrop" role="dialog" aria-modal="true">
          <div className="customer-preview-modal">
            <div className="preview-toolbar">
              <div>
                <strong>Visualização do cliente</strong>
                <small>Modo de teste: nenhuma ação cria atendimento real.</small>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setCustomerPreviewOpen(false)}
              >
                Fechar
              </button>
            </div>
            <CustomerPagePreview
              draft={draft}
              mode="full"
              onPrimaryAction={testPrimaryAction}
              onWhatsApp={testWhatsApp}
            />
          </div>
        </div>
      ) : null}
    </section>);
}
function Toggle(props: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="settings-toggle-row">
      <span>
        <strong>{props.title}</strong>
        <small>{props.description}</small>
      </span>
      <input
        type="checkbox"
        checked={props.checked}
        onChange={event => props.onChange(event.target.checked)}
      />
    </label>
  );
}
