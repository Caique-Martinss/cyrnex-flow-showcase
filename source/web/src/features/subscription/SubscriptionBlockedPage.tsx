import type { AuthSession } from '../../domain/types';
import type { BusinessSubscription } from '../../domain/subscription.types';

interface Props {
  session: AuthSession;
  subscription: BusinessSubscription;
  onSwitchBusiness: (businessId: string) => Promise<boolean>;
  onLogout: () => void;
}

export function SubscriptionBlockedPage({
  session,
  subscription,
  onSwitchBusiness,
  onLogout
}: Props) {
  const title = subscription.status === 'cancelled'
    ? 'Assinatura cancelada'
    : subscription.effectiveStatus === 'trial_expired'
      ? 'Período de teste encerrado'
      : 'Acesso temporariamente suspenso';

  return (
    <main className="subscription-blocked-page">
      <section className="subscription-blocked-card">
        <span className="subscription-blocked-brand">CRX / CYRNEX FLOW</span>
        <p className="subscription-blocked-eyebrow">{session.business.name}</p>
        <h1>{title}</h1>
        <p>
          Os dados da empresa continuam preservados. Regularize ou reative a assinatura
          para recuperar o acesso operacional ao CYRNEX FLOW.
        </p>
        {subscription.retentionUntil ? (
          <div className="subscription-retention">
            Dados preservados até <strong>{formatDate(subscription.retentionUntil)}</strong>.
          </div>
        ) : null}
        {session.businesses.length > 1 ? (
          <label className="subscription-business-switch">
            <span>Trocar de empresa</span>
            <select
              value={session.business.id}
              onChange={event => void onSwitchBusiness(event.target.value)}
            >
              {session.businesses.map(business => (
                <option key={business.id} value={business.id}>{business.name}</option>
              ))}
            </select>
          </label>
        ) : null}
        <p className="subscription-support-copy">
          Para reativação, use o canal de atendimento informado na contratação da CYRNEX.
        </p>
        <div className="subscription-blocked-actions">
          {session.platformAdmin ? <a href="/admin">Abrir CYRNEX Admin</a> : null}
          <button type="button" onClick={onLogout}>Sair da conta</button>
        </div>
      </section>
    </main>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(value));
}
