import { useEffect, useMemo, useState } from 'react';
import { PlatformDangerDialogs } from './PlatformDangerDialogs';
import type { PlatformBusinessDetails } from '../../services';

type AdminAction =
  | 'update_settings'
  | 'start_trial'
  | 'activate'
  | 'mark_past_due'
  | 'suspend'
  | 'cancel';

type DangerousAction = 'suspend' | 'cancel';

interface Props {
  details: PlatformBusinessDetails;
  loading: boolean;
  canMutate: boolean;
  onRequestDelete: () => void;
  onAction: (input: {
    action: AdminAction;
    reason: string;
    planCode: string;
    trialDays: number;
    graceDays: number;
    retentionDays: number;
    currentPeriodEnd: string | null;
  }) => Promise<void>;
}

export function PlatformSubscriptionControls({ details, loading, canMutate, onRequestDelete, onAction }: Props) {
  const [planCode, setPlanCode] = useState(details.subscription.planCode);
  const [trialDays, setTrialDays] = useState(14);
  const [graceDays, setGraceDays] = useState(5);
  const [retentionDays, setRetentionDays] = useState(60);
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState(
    toDateInput(details.subscription.currentPeriodEnd)
  );
  const [adminNote, setAdminNote] = useState(details.subscription.adminNote ?? '');
  const [dangerAction, setDangerAction] = useState<DangerousAction | null>(null);
  const [dangerReason, setDangerReason] = useState('');

  useEffect(() => {
    setPlanCode(details.subscription.planCode);
    setCurrentPeriodEnd(toDateInput(details.subscription.currentPeriodEnd));
    setAdminNote(details.subscription.adminNote ?? '');
    setDangerAction(null);
    setDangerReason('');
  }, [
    details.business.id,
    details.subscription.planCode,
    details.subscription.currentPeriodEnd,
    details.subscription.adminNote
  ]);

  const settingsDirty = useMemo(() => {
    return planCode.trim() !== details.subscription.planCode
      || currentPeriodEnd !== toDateInput(details.subscription.currentPeriodEnd)
      || adminNote.trim() !== (details.subscription.adminNote ?? '').trim();
  }, [planCode, currentPeriodEnd, adminNote, details.subscription]);

  const statusGuide = getStatusGuide(details.subscription.status);

  async function run(action: Exclude<AdminAction, DangerousAction>, reason = adminNote) {
    if (!canMutate || loading) return;
    try {
      await onAction(buildPayload(action, reason));
    } catch {
      // O dashboard já apresenta o erro em um aviso visual; mantém o painel aberto para correção.
    }
  }

  async function confirmDangerAction() {
    if (!dangerAction || !dangerReason.trim() || !canMutate || loading) return;
    const action = dangerAction;
    try {
      await onAction(buildPayload(action, dangerReason));
      setDangerAction(null);
      setDangerReason('');
    } catch {
      // Falhou no backend: mantém a confirmação aberta e preserva o motivo digitado.
    }
  }

  function buildPayload(action: AdminAction, reason: string) {
    return {
      action,
      reason: reason.trim(),
      planCode: planCode.trim(),
      trialDays,
      graceDays,
      retentionDays,
      currentPeriodEnd: currentPeriodEnd || null
    };
  }

  function setCycleFromToday(days: number) {
    setCurrentPeriodEnd(toDateInput(addDays(new Date(), days)));
  }

  function setNextMonthCycle() {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    setCurrentPeriodEnd(toDateInput(date.toISOString()));
  }

  return (
    <section className="platform-subscription-controls">
      <div className={`platform-admin-status-guide is-${details.subscription.status}`}>
        <div>
          <span>AGORA</span>
          <strong>{statusGuide.title}</strong>
          <p>{statusGuide.description}</p>
        </div>
        <span className={`subscription-status is-${details.subscription.status}`}>
          {statusGuide.badge}
        </span>
      </div>

      {!canMutate ? (
        <div className="platform-admin-readonly-note">
          Perfil de suporte: você pode consultar tudo, mas somente um Super Admin altera cobranças e acessos.
        </div>
      ) : null}

      <section className="platform-admin-control-section">
        <div className="platform-admin-section-heading">
          <div>
            <span>CONFIGURAÇÃO RÁPIDA</span>
            <h3>Plano e próximo vencimento</h3>
            <p>Edite só o necessário e salve sem mudar o status da empresa.</p>
          </div>
          <button
            type="button"
            className="platform-admin-save-button"
            disabled={!canMutate || loading || !settingsDirty || !planCode.trim()}
            onClick={() => void run('update_settings')}
          >
            {loading ? 'Salvando...' : settingsDirty ? 'Salvar alterações' : 'Tudo salvo'}
          </button>
        </div>

        <div className="platform-admin-field-grid is-compact">
          <label>
            <span>Plano</span>
            <input
              value={planCode}
              onChange={event => setPlanCode(event.target.value)}
              placeholder="Ex.: pilot"
              disabled={!canMutate || loading}
            />
            <small>Código interno do plano contratado.</small>
          </label>
          <label>
            <span>Vencimento / fim do ciclo</span>
            <input
              type="date"
              value={currentPeriodEnd}
              onChange={event => setCurrentPeriodEnd(event.target.value)}
              disabled={!canMutate || loading}
            />
            <div className="platform-admin-date-shortcuts">
              <button
                type="button"
                onClick={() => setCycleFromToday(30)}
                disabled={!canMutate || loading}
              >
                +30 dias
              </button>
              <button type="button" onClick={setNextMonthCycle} disabled={!canMutate || loading}>+1 mês</button>
              <button
                type="button"
                onClick={() => setCurrentPeriodEnd('')}
                disabled={!canMutate || loading}
              >
                Sem data
              </button>
            </div>
          </label>
          <label className="platform-admin-note-field">
            <span>Observação interna</span>
            <input
              value={adminNote}
              onChange={event => setAdminNote(event.target.value)}
              placeholder="Ex.: cobrança via Pix; vencimento todo dia 10"
              disabled={!canMutate || loading}
            />
            <small>Visível apenas no CYRNEX Admin e registrada nas alterações.</small>
          </label>
        </div>
      </section>

      <section className="platform-admin-control-section">
        <div className="platform-admin-section-heading is-stacked">
          <div>
            <span>AÇÕES RÁPIDAS</span>
            <h3>O que você quer fazer com esta empresa?</h3>
            <p>Os botões mudam o acesso imediatamente após confirmação do servidor.</p>
          </div>
        </div>

        <div className="platform-admin-context-actions">
          {details.subscription.status === 'trial' ? (
            <QuickAction
              title="Converter teste em cliente ativo"
              description="Mantém os dados e libera o uso normal da assinatura."
              emphasis="primary"
              disabled={loading || !canMutate}
              onClick={() => void run('activate')}
            />
          ) : null}

          {details.subscription.status === 'past_due' ? (
            <QuickAction
              title="Pagamento recebido"
              description="Reativa imediatamente e remove o estado de atraso."
              emphasis="primary"
              disabled={loading || !canMutate}
              onClick={() => void run('activate', 'Pagamento regularizado')}
            />
          ) : null}

          {details.subscription.status === 'suspended' ? (
            <QuickAction
              title="Reativar acesso"
              description="O painel, API privada e agendamentos voltam a funcionar."
              emphasis="primary"
              disabled={loading || !canMutate}
              onClick={() => void run('activate', 'Acesso reativado pelo CYRNEX Admin')}
            />
          ) : null}

          {details.subscription.status === 'cancelled' ? (
            <QuickAction
              title="Reativar cliente"
              description="Cancela a retenção e devolve o acesso sem perder os dados preservados."
              emphasis="primary"
              disabled={loading || !canMutate}
              onClick={() => void run('activate', 'Cliente reativado')}
            />
          ) : null}

          {details.subscription.status === 'active' ? (
            <QuickAction
              title="Marcar mensalidade em atraso"
              description={`Mantém o acesso por ${graceDays} dia${graceDays === 1 ? '' : 's'} de tolerância.`}
              emphasis="warning"
              disabled={loading || !canMutate}
              onClick={() => void run('mark_past_due', 'Pagamento ainda não identificado')}
            />
          ) : null}

          {details.subscription.status !== 'trial' ? (
            <QuickAction
              title="Iniciar novo período de teste"
              description={`Concede ${trialDays} dias de teste a partir de agora.`}
              disabled={loading || !canMutate}
              onClick={() => void run('start_trial', 'Período de teste concedido pelo CYRNEX Admin')}
            />
          ) : null}
        </div>

        <div className="platform-admin-rule-presets">
          <fieldset>
            <legend>Teste</legend>
            {[7, 14, 30].map(days => (
              <button
                key={days}
                type="button"
                className={trialDays === days ? 'is-selected' : ''}
                onClick={() => setTrialDays(days)}
                disabled={!canMutate || loading}
              >
                {days} dias
              </button>
            ))}
          </fieldset>
          <fieldset>
            <legend>Tolerância</legend>
            {[0, 3, 5, 7].map(days => (
              <button
                key={days}
                type="button"
                className={graceDays === days ? 'is-selected' : ''}
                onClick={() => setGraceDays(days)}
                disabled={!canMutate || loading}
              >
                {days === 0 ? 'Sem tolerância' : `${days} dias`}
              </button>
            ))}
          </fieldset>
          <fieldset>
            <legend>Retenção ao cancelar</legend>
            {[30, 60, 90, 180].map(days => (
              <button
                key={days}
                type="button"
                className={retentionDays === days ? 'is-selected' : ''}
                onClick={() => setRetentionDays(days)}
                disabled={!canMutate || loading}
              >
                {days} dias
              </button>
            ))}
          </fieldset>
        </div>
      </section>

      <section className="platform-admin-danger-zone">
        <div>
          <span>CONTROLE DE ACESSO</span>
          <h3>Suspender ou encerrar</h3>
          <p>Suspensão e cancelamento preservam os dados e podem ser administrados sem exclusão.</p>
        </div>
        <div className="platform-admin-danger-actions">
          {details.subscription.status !== 'suspended' && details.subscription.status !== 'cancelled' ? (
            <button
              className="is-warning"
              disabled={loading || !canMutate}
              type="button"
              onClick={() => {
                setDangerReason('');
                setDangerAction('suspend');
              }}
            >
              Suspender acesso
            </button>
          ) : null}
          {details.subscription.status !== 'cancelled' ? (
            <button
              className="is-danger"
              disabled={loading || !canMutate}
              type="button"
              onClick={() => {
                setDangerReason('');
                setDangerAction('cancel');
              }}
            >
              Cancelar assinatura
            </button>
          ) : null}
        </div>
      </section>

      <section className="platform-admin-hard-delete-zone">
        <div>
          <span>ZONA IRREVERSÍVEL</span>
          <h3>Excluir empresa e dados</h3>
          <p>Remove definitivamente o tenant, os dados vinculados e os arquivos administrados pelo CYRNEX.</p>
        </div>
        <button
          type="button"
          className="platform-hard-delete-button"
          disabled={loading || !canMutate}
          onClick={onRequestDelete}
        >
          Excluir definitivamente
        </button>
      </section>

      <PlatformDangerDialogs
        action={dangerAction}
        businessName={details.business.name}
        reason={dangerReason}
        retentionDays={retentionDays}
        loading={loading}
        onReasonChange={setDangerReason}
        onClose={() => {
          if (loading) return;
          setDangerAction(null);
          setDangerReason('');
        }}
        onConfirm={confirmDangerAction}
      />
    </section>
  );
}

function QuickAction({
  title,
  description,
  emphasis = 'default',
  disabled,
  onClick
}: {
  title: string;
  description: string;
  emphasis?: 'default' | 'primary' | 'warning';
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`platform-quick-action is-${emphasis}`}
      onClick={onClick}
      disabled={disabled}
    >
      <strong>{title}</strong>
      <small>{description}</small>
      <span>Executar →</span>
    </button>
  );
}

function getStatusGuide(status: PlatformBusinessDetails['subscription']['status']) {
  const guides = {
    trial: {
      title: 'Empresa em período de teste',
      description: 'Ela pode usar o sistema normalmente até o fim do teste.',
      badge: 'Teste'
    },
    active: {
      title: 'Assinatura ativa',
      description: 'A empresa está liberada para operar normalmente.',
      badge: 'Ativo'
    },
    past_due: {
      title: 'Pagamento pendente',
      description: 'A empresa ainda está dentro da tolerância. Registre o pagamento ou suspenda quando necessário.',
      badge: 'Em atraso'
    },
    suspended: {
      title: 'Acesso suspenso',
      description: 'Os dados estão preservados, mas a operação está bloqueada até você reativar.',
      badge: 'Suspenso'
    },
    cancelled: {
      title: 'Assinatura cancelada',
      description: 'A empresa está fora de operação e os dados seguem a política de retenção.',
      badge: 'Cancelado'
    }
  } as const;
  return guides[status];
}

function toDateInput(value: string | null): string {
  return value ? value.slice(0, 10) : '';
}

function addDays(date: Date, days: number): string {
  return new Date(date.getTime() + days * 86_400_000).toISOString();
}
