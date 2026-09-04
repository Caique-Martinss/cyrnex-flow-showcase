import type { BusinessSubscription } from '../../domain/subscription.types';

export function SubscriptionNotice({ subscription }: { subscription: BusinessSubscription }) {
  if (subscription.status !== 'past_due' || !subscription.allowed) return null;
  return (
    <div className="subscription-notice" role="status">
      <strong>Pagamento pendente.</strong>
      <span>
        {subscription.gracePeriodEnd
          ? ` O acesso permanece ativo até ${formatDate(subscription.gracePeriodEnd)}.`
          : ' Regularize a assinatura para evitar interrupção.'}
      </span>
    </div>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(value));
}
