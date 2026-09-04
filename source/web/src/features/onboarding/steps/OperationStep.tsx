import { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { DaySchedule, OnboardingState, OperationMode, Professional } from '../../../domain/types';
import { roleLabels } from '../onboarding.constants';
import { createProfessional } from '../onboarding.helpers';
import { ProfessionalHoursEditor } from '../ProfessionalHoursEditor';
interface StepProps {
    draft: OnboardingState;
    setDraft: Dispatch<SetStateAction<OnboardingState>>;
}
export function OperationStep({ draft, setDraft }: StepProps) {
    useEffect(() => {
        if (draft.professionals.some(item => item.active))
            return;
        setDraft(current => ({ ...current, professionals: [createProfessional(0, true)] }));
    }, [draft.professionals, setDraft]);
    function selectMode(mode: OperationMode) {
        setDraft(current => {
            const active = current.professionals.filter(item => item.active);
            const owner = active.find(item => item.isOwner) ?? active[0] ?? createProfessional(0, true);
            const professionals = mode === 'solo'
                ? current.professionals.map(item => item.id === owner.id
                    ? { ...item, active: true, isOwner: true, role: 'owner' as const, receivesCommission: false }
                    : { ...item, active: false })
                : current.professionals.some(item => item.id === owner.id)
                    ? current.professionals.map(item => (
                        item.id === owner.id
                          ? { ...item, active: true, isOwner: true }
                          : item
                      ))
                    : [owner, ...current.professionals];
            return { ...current, settings: { ...current.settings, operationMode: mode }, professionals };
        });
    }
    const active = draft.professionals.filter(item => item.active);
    return (<section className="onboarding-step">
      <header>
        <span className="eyebrow">Etapa 3</span>
        <h1>Como sua barbearia trabalha?</h1>
        <p>Essa escolha adapta a agenda e esconde recursos que não fazem sentido para sua rotina.</p>
      </header>

      <div className="choice-grid">
        <button
          type="button"
          className={draft.settings.operationMode === 'solo' ? 'choice-card active' : 'choice-card'}
          onClick={() => selectMode('solo')}
        >
          <strong>Trabalho sozinho</strong>
          <span>Os atendimentos ficam associados automaticamente a você.</span>
        </button>
        <button
          type="button"
          className={draft.settings.operationMode === 'team' ? 'choice-card active' : 'choice-card'}
          onClick={() => selectMode('team')}
        >
          <strong>Tenho equipe</strong>
          <span>Cadastre agora quem trabalha com você. Login individual pode ser criado depois.</span>
        </button>
      </div>

      <div className="section-card">
        <div className="section-card-header">
          <div>
            <span className="eyebrow">Equipe</span>
            <h2>
              {draft.settings.operationMode === 'solo'
                ? 'Seu perfil profissional'
                : 'Quem trabalha na barbearia?'}
            </h2>
            <p>O dono fica protegido e não pode ser removido durante o onboarding.</p>
          </div>
          {draft.settings.operationMode === 'team' ? (<button
            type="button"
            className="secondary-button"
            onClick={() => setDraft(current =>
              ({
                ...current,
                professionals: [
                  ...current.professionals,
                  createProfessional(current.professionals.length)
                ]
              }))}
          >+ Adicionar profissional</button>) : null}
        </div>

        <div className="professional-card-list">
          {active.map(professional => (<ProfessionalEditor
            key={professional.id}
            professional={professional}
            team={draft.settings.operationMode === 'team'}
            businessSchedule={draft.settings.businessHours.weeklySchedule}
            onChange={patch => updateProfessional(setDraft, professional.id, patch)}
            onRemove={() => removeProfessional(setDraft, professional.id)}
          />))}
        </div>

        {draft.settings.operationMode === 'team' ? (<div className="info-callout">
            <strong>Login da equipe vem depois</strong>
            <p>
              Você pode cadastrar nome, função e contato agora. Depois, dentro do sistema,
              enviaremos um convite para cada pessoa criar a própria senha e receber somente
              as permissões autorizadas.
            </p>
          </div>) : null}
      </div>
    </section>);
}
function ProfessionalEditor(props: {
    professional: Professional;
    team: boolean;
    businessSchedule: DaySchedule[];
    onChange: (patch: Partial<Professional>) => void;
    onRemove: () => void;
}) {
    const p = props.professional;
    return (<article className={p.isOwner ? 'professional-editor owner-professional' : 'professional-editor'}>
      <div className="professional-editor-heading">
        <div>
<strong>{p.name || (p.isOwner ? 'Dono' : 'Novo profissional')}</strong>
<span>{p.isOwner ? 'Proprietário principal' : roleLabels[p.role]}</span>
</div>
        {p.isOwner
          ? <span className="protected-badge">Dono protegido</span>
          : <button className="danger-link" type="button" onClick={props.onRemove}>Remover</button>}
      </div>

      <div className="onboarding-form-grid two-columns">
        <label>Nome completo<input
          value={p.name}
          onChange={event => props.onChange({ name: event.target.value })}
          placeholder="Ex.: Lucas Ferreira"
        />
</label>
        <label>Nome profissional <span className="optional-label">opcional</span>
<input
          value={p.professionalName ?? ''}
          onChange={event => props.onChange({ professionalName: event.target.value || null })}
          placeholder="Ex.: Lucas"
        />
</label>
        {props.team ? <label>Cargo / função<select
          value={p.role}
          disabled={p.isOwner}
          onChange={event => props.onChange({ role: event.target.value as Professional['role'] })}
        >{Object.entries(roleLabels).filter(([key]) => key !== 'owner' || p.isOwner).map(
          ([key, label]) => <option key={key} value={key}>{label}</option>
        )}</select>
</label> : null}
        <label>Telefone <span className="optional-label">opcional</span>
<input
          value={p.phone ?? ''}
          onChange={event => props.onChange({ phone: event.target.value || null })}
          placeholder="(11) 99999-9999"
        />
</label>
        {props.team ? <label>E-mail <span className="optional-label">opcional</span>
<input
          type="email"
          value={p.email ?? ''}
          onChange={event => props.onChange({ email: event.target.value || null })}
          placeholder="Para futuro convite de acesso"
        />
</label> : null}
      </div>

      {props.team ? (<div className="settings-toggle-list compact-toggle-list">
          <Toggle
            title="Essa pessoa atende clientes?"
            description="Se não atende, ela não precisa aparecer como opção na agenda."
            checked={p.servesClients}
            onChange={value =>
              props.onChange({ servesClients: value, acceptsOnlineBooking: value ? p.acceptsOnlineBooking : false })}
          />
          {p.servesClients ? <Toggle
            title="Pode aparecer para agendamento online?"
            description="O cliente poderá escolher essa pessoa quando o serviço permitir."
            checked={p.acceptsOnlineBooking}
            onChange={value => props.onChange({ acceptsOnlineBooking: value })}
          /> : null}
          <Toggle
            title="Mostrar profissional na página pública?"
            description="Você pode manter pessoas internas sem expô-las no site."
            checked={p.publicVisible}
            onChange={value => props.onChange({ publicVisible: value })}
          />
          {!p.isOwner ? <Toggle
            title="Essa pessoa recebe comissão?"
            description="Os percentuais detalhados poderão ser ajustados por serviço depois."
            checked={p.receivesCommission}
            onChange={value => props.onChange({ receivesCommission: value })}
          /> : null}
          {p.receivesCommission ? <label className="commission-inline">Comissão padrão<div className="number-suffix">
<input
            type="number"
            min="0"
            max="100"
            value={p.commissionPercent}
            onChange={event => props.onChange({ commissionPercent: Number(event.target.value) })}
          />
<span>%</span>
</div>
</label> : null}
        </div>) : <div className="inline-status">
<strong>Dono e profissional principal</strong>
<span>O sistema não calcula comissão própria no modo individual.</span>
</div>}
      {p.servesClients ? (
        <ProfessionalHoursEditor
          professional={p}
          businessSchedule={props.businessSchedule}
          onChange={props.onChange}
        />
      ) : null}
    </article>);
}
function Toggle(props: {
    title: string;
    description: string;
    checked: boolean;
    onChange: (value: boolean) => void;
}) {
    return <label className="settings-toggle-row">
<span>
<strong>{props.title}</strong>
<small>{props.description}</small>
</span>
<input type="checkbox" checked={props.checked} onChange={event => props.onChange(event.target.checked)}/>
</label>;
}
function updateProfessional(
  setDraft: Dispatch<SetStateAction<OnboardingState>>,
  id: string,
  patch: Partial<Professional>
) {
    setDraft(current => ({
      ...current,
      professionals: current.professionals.map(item => item.id === id ? { ...item, ...patch } : item)
    }));
}
function removeProfessional(setDraft: Dispatch<SetStateAction<OnboardingState>>, id: string) {
    setDraft(current => ({
      ...current,
      professionals: current.professionals.map(item => (
        item.id === id && !item.isOwner
          ? { ...item, active: false }
          : item
      ))
    }));
}
