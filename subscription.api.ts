import { useCallback, useEffect, useState } from 'react';
import type { PlatformAdminSession } from '../domain/subscription.types';
import {
  getErrorMessage,
  getPlatformAdminSession,
  platformAdminLogin,
  platformAdminLogout
} from '../services';

export function usePlatformAdminSession() {
  const [session, setSession] = useState<PlatformAdminSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setSession(await getPlatformAdminSession());
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function signIn(username: string, password: string, rememberMe: boolean) {
    setSubmitting(true);
    setError('');
    try {
      setSession(await platformAdminLogin({ username, password, rememberMe }));
      return true;
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function signOut() {
    try {
      await platformAdminLogout();
    } finally {
      setSession(null);
    }
  }

  return { session, loading, submitting, error, setError, signIn, signOut };
}
