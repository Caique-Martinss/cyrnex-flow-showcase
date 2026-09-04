import { useEffect } from 'react';
import type { PlatformBusinessDetails } from '../../services';
import { PlatformSubscriptionControls } from './PlatformSubscriptionControls';

interface Props {
  details: PlatformBusinessDetails;
  actionLoading: boolean;
  canMutate: boolean;
  onClose: () => void;
  onRequestDelete: () => void;
  onAction: Parameters<typeof PlatformSubscriptionControls>[0]['onAction'];
}

export function PlatformBusinessDetailsPanel({
  details,
  actionLoading,
  canMutate,
  onClose,
  onRequestDelete,
  onAction
}: Props) {
  const { business, subscription, members } = details;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (document.querySelector('[data-action-dialog-open="true"]')) return;
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <div className="platform-business-drawer-layer">
      <button
        type="button"
        className="platform-business-drawer-backdrop"
        aria-label="Fechar detalhes da empresa"
        onClick={onClose}
      />
      <aside
        className="platform-business-panel"
        role="dialog"
        aria-modal="true"
        aria-label={`Gerenciar ${business.name}`}
      >
        <div className="platform-business-panel-head">
          <div>
            <span>EMPRESA</span>
            <h2>{business.name}</h2>
            <p>/{business.slug}</p>
          </div>
          <button type="button" className="platform-panel-close" onClick={onClose} aria-label="Fechar painel">×</button>
        </div>

        <div className="platform-subscription-summary">
          <div>
            <span>Status</span>
            <strong className={`subscription-status is-${subscription.status}`}>
              {statusLabel(subscription.status)}
            </strong>
          </div>
          <div><span>Plano</span><strong>{subscription.planCode}</strong></div>
          <div>
            <span>Vencimento</span>
            <strong>{subscription.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : '—'}</strong>
          </div>
          <div><span>Membros</span><strong>{members.filter(item => item.active).length}</strong></div>
          <div>
            <span>Retenção</span>
            <strong>{subscription.retentionUntil ? formatDate(subscription.retentionUntil) : '—'}</strong>
          </div>
        </div>

        <PlatformSubscriptionControls
          details={details}
          loading={actionLoading}
          canMutate={canMutate}
          onRequestDelete={onRequestDelete}
          onAction={onAction}
        />

        <section className="platform-members-list">
          <h3>Equipe vinculada</h3>
          {members.length === 0 ? <p>Nenhum membro vinculado.</p> : null}
          {members.map(member => (
            <div key={`${member.userId}-${member.role}`}>
              <span>{member.displayName}</span>
              <small>{member.role}{member.active ? '' : ' · inativo'}</small>
            </div>
          ))}
        </section>

        <section className="platform-audit-list">
          <h3>Histórico administrativo</h3>
          {details.auditLogs.length === 0 ? <p>Nenhuma alteração administrativa registrada.</p> : null}
          {details.auditLogs.map(log => (
            <div key={log.id}>
              <span>
                <strong>{auditLabel(log.action)}</strong>
                <small>{auditReason(log.metadata)}</small>
              </span>
              <time>{formatDateTime(log.createdAt)}</time>
            </div>
          ))}
        </section>
      </aside>
    </div>
  );
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    trial: 'Teste', active: 'Ativo', past_due: 'Em atraso', suspended: 'Suspenso', cancelled: 'Cancelado'
  };
  return labels[status] ?? status;
}
function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(value));
}
function auditLabel(action: string): string {
  const labels: Record<string, string> = {
    'subscription.update_settings': 'Configuração da assinatura atualizada',
    'subscription.start_trial': 'Período de teste iniciado',
    'subscription.activate': 'Assinatura ativada',
    'subscription.mark_past_due': 'Assinatura marcada em atraso',
    'subscription.suspend': 'Acesso suspenso',
    'subscription.cancel': 'Assinatura cancelada',
    'business.hard_delete': 'Empresa excluída definitivamente'
  };
  return labels[action] ?? action;
}
function auditReason(metadata: Record<string, unknown>): string {
  const reason = typeof metadata.reason === 'string' ? metadata.reason.trim() : '';
  return reason || 'Sem observação.';
}
function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}
