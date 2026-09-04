import { useCallback, useEffect, useState } from 'react';
import type { BusinessSubscription } from '../domain/subscription.types';
import { getErrorMessage, getSubscriptionStatus } from '../services';

export function useBusinessSubscription(businessId: string) {
  const [subscription, setSubscription] = useState<BusinessSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setSubscription(await getSubscriptionStatus());
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    void refresh();
    const handleBlocked = () => void refresh();
    window.addEventListener('cyrnex:subscription-blocked', handleBlocked);
    return () => window.removeEventListener('cyrnex:subscription-blocked', handleBlocked);
  }, [refresh]);

  return { subscription, loading, error, refresh };
}
