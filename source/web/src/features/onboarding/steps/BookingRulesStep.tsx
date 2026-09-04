import type { Dispatch, SetStateAction } from 'react';
import type { BookingRules, OnboardingState } from '../../../domain/types';
interface StepProps {
    draft: OnboardingState;
    setDraft: Dispatch<SetStateAction<OnboardingState>>;
}
export function BookingRulesStep({ draft, setDraft }: StepProps) {
    const settings = draft.settings;
    const rules = settings.bookingRules;
    function updateRule<K extends keyof BookingRules>(field: K, value: BookingRules[K]) {
        setDraft(current => ({
            ...current,
            settings: {
                ...current.settings,
                bookingRules: { ...current.settings.bookingRules, [field]: value }
            }
        }));
    }
    return (<section className="onboarding-step">
      <header>
        <span className="eyebrow">Etapa 6</span>
        <h1>Como seus clientes poderão marcar horários?</h1>
        <p>
          Defina as regras em linguagem simples. O sistema usa tudo isso para oferecer
          apenas horários que realmente cabem na agenda.
        </p>
      </header>

      <div className="section-card">
        <div className="section-card-header">
<div>
<h2>Disponibilidade para agendar</h2>
<p>Você poderá mudar essas regras depois.</p>
</div>
</div>
        <div className="onboarding-form-grid three-columns">
          <label>Até quanto tempo antes o cliente pode marcar?<select
            value={rules.minBookingNoticeMinutes}
            onChange={event => updateRule('minBookingNoticeMinutes', Number(event.target.value))}
          >{[0, 15, 30, 60, 120, 240, 720, 1440].map(
            value => <option value={value} key={value}>{formatNotice(value)}</option>
          )}</select>
<small>Ex.: com 30 minutos, às 14:00 o primeiro horário possível será 14:30.</small>
</label>
          <label>Com quantos dias de antecedência ele pode marcar?<select
            value={rules.maxBookingDaysAhead}
            onChange={event => updateRule('maxBookingDaysAhead', Number(event.target.value))}
          >
            {[7, 15, 30, 45, 60, 90, 120, 180].map(value => (
              <option key={value} value={value}>{value} dias</option>
            ))}
          </select>
<small>Limita até onde aparecem datas futuras.</small>
</label>
          <label>Até quanto tempo antes pode cancelar ou reagendar?<select
            value={rules.cancellationNoticeMinutes}
            onChange={event => updateRule('cancellationNoticeMinutes', Number(event.target.value))}
          >{[0, 60, 120, 360, 720, 1440, 2880].map(
            value => <option key={value} value={value}>{formatNotice(value)}</option>
          )}</select>
<small>Depois desse prazo, o cliente precisa falar com a barbearia.</small>
</label>
        </div>
      </div>

      <div className="section-card">
        <div className="section-card-header">
<div>
<h2>O que o cliente pode fazer sozinho?</h2>
</div>
</div>
        <div className="settings-toggle-list">
          <Toggle
            title="Cancelar online"
            description="Quando permitido, o horário volta a ficar disponível automaticamente."
            checked={rules.allowClientCancel}
            onChange={value => updateRule('allowClientCancel', value)}
          />
          <Toggle
            title="Reagendar online"
            description="O cliente pode trocar o próprio horário dentro do prazo definido."
            checked={rules.allowClientReschedule}
            onChange={value => updateRule('allowClientReschedule', value)}
          />
          <Toggle
            title="Entrar na lista de espera — Em desenvolvimento"
            description={
              'A estrutura existe, mas ficará indisponível no primeiro lançamento ' +
              'até o fluxo ser finalizado.'
            }
            checked={false}
            disabled
            onChange={() => undefined}
          />
          <Toggle
            title="Deixar uma observação"
            description="Ex.: “quero o degradê mais baixo” ou outra informação antes do atendimento."
            checked={rules.allowClientNotes}
            onChange={value => updateRule('allowClientNotes', value)}
          />
        </div>
      </div>

      <div className="section-card">
        <div className="section-card-header">
<div>
<h2>Confirmação do horário</h2>
<p>Escolha se o horário entra direto na agenda ou precisa de aprovação.</p>
</div>
</div>
        <div className="choice-grid compact-choice-grid">
          <button
            type="button"
            className={rules.confirmationMode === 'automatic' ? 'choice-card active' : 'choice-card'}
            onClick={() => updateRule('confirmationMode', 'automatic')}
          >
<strong>Confirmar automaticamente</strong>
<span>O cliente escolhe uma vaga válida e ela já fica reservada.</span>
</button>
          <button
            type="button"
            className={rules.confirmationMode === 'manual' ? 'choice-card active' : 'choice-card'}
            onClick={() => updateRule('confirmationMode', 'manual')}
          >
<strong>Quero aprovar antes</strong>
<span>A solicitação fica pendente até alguém da barbearia aprovar.</span>
</button>
        </div>
      </div>

      <div className="section-card">
        <div className="section-card-header">
<div>
<h2>O que pedir ao cliente?</h2>
</div>
</div>
        <div className="settings-toggle-list">
          <Toggle
            title="Nome"
            description="Recomendado e obrigatório por padrão."
            checked={rules.requireClientName}
            disabled
            onChange={() => undefined}
          />
          <Toggle
            title="Telefone"
            description="Usado para contato, confirmação e identificação do cliente."
            checked={rules.requireClientPhone}
            onChange={value => updateRule('requireClientPhone', value)}
          />
          <Toggle
            title="E-mail"
            description="Pode ser solicitado, mas não precisa ser obrigatório."
            checked={rules.requireClientEmail}
            onChange={value => updateRule('requireClientEmail', value)}
          />
        </div>
      </div>

      <div className="section-card">
        <div className="section-card-header">
<div>
<h2>Sinal para reservar</h2>
<p>Esta é a regra geral. Um serviço específico pode ter uma regra diferente.</p>
</div>
</div>
        <Toggle
          title="Exigir sinal por padrão"
          description="O cliente paga por Pix diretamente para a barbearia e envia o comprovante para confirmação."
          checked={rules.requireDeposit}
          onChange={value => updateRule('requireDeposit', value)}
        />
        {rules.requireDeposit ? (
          <label className="deposit-default-field">
            Percentual padrão do sinal
            <div className="number-suffix">
              <input
                type="number"
                min="1"
                max="100"
                step="1"
                value={settings.defaultDepositPercent}
                onChange={event => setDraft(current => ({
                  ...current,
                  settings: {
                    ...current.settings,
                    defaultDepositPercent: Number(event.target.value)
                  }
                }))}
              />
              <span>%</span>
            </div>
            <small>Ex.: em um serviço de R$ 60 com 30%, o cliente paga R$ 18 de sinal.</small>
          </label>
        ) : null}
        <div className="info-callout subtle-callout">
          <strong>Pix manual com confirmação segura.</strong>
          <p>
            O comprovante enviado pelo cliente não confirma nada sozinho. Dono, gerente ou recepção
            autorizada precisa validar o pagamento na Agenda.
          </p>
        </div>
      </div>

      <div className="section-card">
        <div className="section-card-header">
<div>
<h2>Hora extra e exceções</h2>
</div>
</div>
        <Toggle
          title="Permitir que o dono autorize hora extra"
          description={
            'O cliente nunca ignora o expediente sozinho. O dono ou alguém autorizado ' +
            'pode estender um dia específico ou criar um encaixe fora do horário normal.'
          }
          checked={rules.allowManualOvertime}
          onChange={value => updateRule('allowManualOvertime', value)}
        />
        <div className="info-callout subtle-callout">
<strong>O sistema nunca corta um serviço no meio.</strong>
<p>
  Se um corte dura 60 minutos e a barbearia fecha às 18:00, 17:30 não será oferecido.
  Se você quiser atender até 18:30 naquele dia, poderá autorizar hora extra pela Agenda.
</p>
</div>
      </div>

      <label>Política de cancelamento <span className="optional-label">texto mostrado ao cliente</span>
<textarea
        value={settings.cancellationPolicy}
        onChange={event =>
          setDraft(current => ({
            ...current,
            settings: {
              ...current.settings,
              cancellationPolicy: event.target.value
            }
          }))
        }
        placeholder="Explique de forma simples como funcionam cancelamentos, reagendamentos e sinal."
      />
</label>
    </section>);
}
function Toggle(props: {
    title: string;
    description: string;
    checked: boolean;
    onChange: (value: boolean) => void;
    disabled?: boolean;
}) {
    return <label className="settings-toggle-row">
<span>
<strong>{props.title}</strong>
<small>{props.description}</small>
</span>
<input
      type="checkbox"
      checked={props.checked}
      disabled={props.disabled}
      onChange={event => props.onChange(event.target.checked)}
    />
</label>;
}
function formatNotice(minutes: number): string {
    if (minutes === 0)
        return 'Sem limite';
    if (minutes < 60)
        return `${minutes} minutos`;
    if (minutes % 1440 === 0)
        return `${minutes / 1440} dia(s)`;
    return `${minutes / 60} hora(s)`;
}
