import { useState } from 'react';
import type { ReactNode } from 'react';
import type { OnboardingState } from '../../../domain/types';
import { currencyFormatter } from '../../../utils/formatters';
import { moduleLabels, paymentLabels, weekdayLabels } from '../onboarding.constants';
import { CustomerPagePreview } from '../CustomerPagePreview';
import { getReviewIssues } from '../onboarding.helpers';
interface ReviewStepProps {
    draft: OnboardingState;
    onEdit?: (step: number) => void;
}
export function ReviewStep({ draft, onEdit }: ReviewStepProps) {
    const [customerPreviewOpen, setCustomerPreviewOpen] = useState(false);
    const settings = draft.settings;
    const activeDays = settings.businessHours.weeklySchedule.filter(day => day.enabled);
    const activeModules = settings.modules.filter(
      item => item.enabled && (item.key !== 'commissions' || settings.operationMode === 'team')
    );
    const activeServices = draft.services.filter(item => item.active);
    const activeProfessionals = draft.professionals.filter(item => item.active);
    const issues = getReviewIssues(draft);
    const errors = issues.filter(item => item.severity === 'error');
    const recommendations = issues.filter(item => item.severity === 'recommendation');
    return (<section className="onboarding-step review-final-step">
      <header>
        <span className="eyebrow">Etapa 10</span>
        <h1>{errors.length ? 'Faltam alguns ajustes antes de concluir' : 'Sua barbearia está quase pronta'}</h1>
        <p>Confira o sistema inteiro. Você pode editar qualquer etapa sem perder o restante da configuração.</p>
      </header>

      <div className={errors.length ? 'launch-status warning' : 'launch-status success'}>
        <div>
<span className="eyebrow">Checklist de lançamento</span>
<h2>{errors.length ? `${errors.length} ajuste(s) obrigatório(s)` : 'Tudo pronto para começar'}</h2>
</div>
        <strong>{errors.length ? 'Revise antes de concluir' : '100% pronto'}</strong>
      </div>

      {errors.map((item, index) => <IssueCard key={`e-${index}`} issue={item} onEdit={onEdit}/>)}
      {recommendations.length ? (<div className="section-card recommendation-section">
<div className="section-card-header">
<div>
<span className="eyebrow">Opcional</span>
<h2>Você pode deixar ainda melhor</h2>
<p>Esses itens não impedem a conclusão.</p>
</div>
</div>
{recommendations.map((item, index) => (
  <IssueCard key={`r-${index}`} issue={item} onEdit={onEdit}/>
))}
</div>) : null}

      <div className="review-step-grid">
        <SummaryCard step={0} title="Barbearia" onEdit={onEdit}>
<strong>{settings.businessName}</strong>
<span>smartcommerce.app/{settings.bookingSlug}</span>
</SummaryCard>
        <SummaryCard step={1} title="Sobre" onEdit={onEdit}>
<strong>{settings.profile.specialties.length} especialidade(s)</strong>
<span>
  {settings.profile.spaceMedia.length} foto(s) do espaço •{' '}
  {settings.profile.portfolioMedia.length} trabalho(s)
</span>
</SummaryCard>
        <SummaryCard step={2} title="Operação" onEdit={onEdit}>
<strong>{settings.operationMode === 'solo' ? 'Trabalho sozinho' : 'Tenho equipe'}</strong>
<span>{activeProfessionals.length} profissional(is) ativo(s)</span>
</SummaryCard>
        <SummaryCard step={3} title="Horários" onEdit={onEdit}>
<strong>{activeDays.length} dias por semana</strong>
<span>{activeDays.map(day => weekdayLabels[day.weekday].replace('-feira', '')).join(', ')}</span>
</SummaryCard>
        <SummaryCard step={4} title="Serviços" onEdit={onEdit}>
<strong>{activeServices.length} serviço(s)</strong>
<span>{activeServices.slice(0, 4).map(item => item.name).join(' • ')}</span>
</SummaryCard>
        <SummaryCard step={5} title="Agendamento" onEdit={onEdit}>
<strong>
  {settings.bookingRules.confirmationMode === 'automatic'
    ? 'Confirmação automática'
    : 'Aprovação manual'}
</strong>
<span>Até {settings.bookingRules.maxBookingDaysAhead} dias à frente</span>
</SummaryCard>
        <SummaryCard step={6} title="Pagamentos" onEdit={onEdit}>
<strong>
  {settings.paymentMethods
    .filter(item => item.active)
    .map(item => paymentLabels[item.method])
    .join(', ')}
</strong>
<span>{settings.bookingRules.requireDeposit
  ? `Sinal padrão de ${settings.defaultDepositPercent}%`
  : 'Sinal não obrigatório'}</span>
</SummaryCard>
        <SummaryCard step={7} title="Recursos" onEdit={onEdit}>
<strong>{activeModules.length} módulo(s) ativo(s)</strong>
<span>{activeModules.slice(0, 4).map(item => moduleLabels[item.key].title).join(' • ')}</span>
</SummaryCard>
        <SummaryCard step={8} title="Página pública" onEdit={onEdit}>
<strong>{settings.profile.publicPageEnabled ? 'Página preparada' : 'Página privada'}</strong>
<span>{settings.profile.publishOnComplete ? 'Publicar ao concluir' : 'Manter privada por enquanto'}</span>
</SummaryCard>
      </div>

      <div className="section-card customer-experience-card">
        <span className="eyebrow">Experiência do cliente</span>
        <h2>O que seu cliente poderá fazer</h2>
        <div className="check-list">
          <span>✓ Ver serviços e horários disponíveis</span>
          <span>✓ Escolher apenas horários em que o serviço cabe por completo</span>
          {settings.bookingRules.allowClientReschedule
            ? <span>✓ Reagendar dentro das regras</span>
            : <span>• Reagendamento somente pela barbearia</span>}
          {settings.bookingRules.allowClientCancel
            ? <span>✓ Cancelar dentro das regras</span>
            : <span>• Cancelamento somente pela barbearia</span>}
          {settings.bookingRules.allowWaitlist && settings.modules.some(
            item => item.key === 'waitlist' && item.enabled
          ) ? <span>✓ Entrar na lista de espera quando não houver vaga</span> : null}
          {settings.bookingRules.allowClientNotes ? <span>✓ Deixar observação no agendamento</span> : null}
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={() => setCustomerPreviewOpen(true)}
        >👁 Ver como cliente em modo de teste</button>
      </div>

      <div className="section-card launch-consequences">
        <span className="eyebrow">Ao concluir</span>
        <h2>O CYRNEX FLOW vai:</h2>
        <div className="check-list">
          <span>✓ Salvar todas as configurações desta barbearia</span>
          <span>✓ Criar a agenda usando os horários e serviços definidos</span>
          <span>✓ Mostrar somente os módulos que você ativou</span>
          <span>✓ {settings.profile.publishOnComplete && settings.profile.publicPageEnabled
            ? 'Publicar a página da barbearia'
            : 'Manter a página privada até você publicar'}</span>
          <span>✓ Entrar no painel desta unidade</span>
        </div>
      </div>

      <div className="section-card public-privacy-review">
        <span className="eyebrow">Privacidade da página</span>
        <h2>O que ficará público</h2>
        <div className="check-list">
          {settings.profile.publicSections.map(section => (
            <span key={section}>✓ {moduleSafeSectionLabel(section)}</span>
          ))}
          <span>• Localização: {locationVisibilityLabel(settings.profile.locationVisibility)}</span>
        </div>
        {onEdit ? (
          <button type="button" className="secondary-button" onClick={() => onEdit(8)}>
            Revisar informações públicas
          </button>
        ) : null}
      </div>

      <div className="section-card final-services-review">
        <div className="section-card-header">
<div>
<span className="eyebrow">Serviços</span>
<h2>{activeServices.length} configurado(s)</h2>
</div>{onEdit
  ? <button className="secondary-button" type="button" onClick={() => onEdit(4)}>Editar serviços</button>
  : null}</div>
        <div className="review-service-list">{activeServices.map(service => <div key={service.id}>
<span>
<strong>{service.name}</strong>
<small>
  {service.durationMinutes} min
  {service.bufferAfterMinutes ? ` + ${service.bufferAfterMinutes} min livres` : ''}
</small>
</span>
<strong>{service.priceType === 'consult'
  ? 'Sob consulta'
  : `${service.priceType === 'from' ? 'A partir de ' : ''}${currencyFormatter.format(service.price)}`}</strong>
</div>)}</div>
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
              >Fechar</button>
            </div>
            <CustomerPagePreview
              draft={draft}
              mode="full"
              onPrimaryAction={() => setCustomerPreviewOpen(false)}
              onWhatsApp={() => setCustomerPreviewOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </section>);
}
function SummaryCard(props: {
    step: number;
    title: string;
    children: ReactNode;
    onEdit?: (step: number) => void;
}) {
    return <article className="review-card">
<div className="review-card-heading">
<span>{props.title}</span>
{props.onEdit
  ? <button type="button" onClick={() => props.onEdit?.(props.step)}>Editar</button>
  : null}
</div>
{props.children}
</article>;
}
function IssueCard({ issue, onEdit }: {
    issue: ReturnType<typeof getReviewIssues>[number];
    onEdit?: (step: number) => void;
}) {
    return <article className={`review-issue ${issue.severity}`}>
<div>
<strong>{issue.title}</strong>
<p>
<b>Por que:</b> {issue.why}</p>
<p>
<b>Como corrigir:</b> {issue.fix}</p>
</div>{onEdit
  ? <button type="button" className="secondary-button" onClick={() => onEdit(issue.step)}>Corrigir agora</button>
  : null}</article>;
}

function moduleSafeSectionLabel(section: string): string {
  const labels: Record<string, string> = {
    hero: 'Capa e identidade',
    services: 'Serviços',
    portfolio: 'Portfólio',
    team: 'Equipe',
    space: 'Fotos do espaço',
    about: 'História da barbearia',
    hours: 'Horários',
    location: 'Localização',
    differentials: 'Diferenciais'
  };
  return labels[section] ?? section;
}

function locationVisibilityLabel(value: 'full' | 'area' | 'hidden'): string {
  if (value === 'full') return 'endereço completo';
  if (value === 'area') return 'somente cidade/região';
  return 'oculta';
}
