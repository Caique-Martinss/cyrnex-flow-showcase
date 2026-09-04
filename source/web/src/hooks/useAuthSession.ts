import { useCallback, useEffect, useState } from 'react';
import type { AuthSession } from '../domain/types';
import {
  createBusiness,
  getCurrentSession,
  getErrorMessage,
  login,
  logout,
  register,
  switchBusiness,
  type LoginInput,
  type RegisterInput
} from '../services';

export function useAuthSession() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const refreshSession = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      setSession(await getCurrentSession());
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSession();

    const handleUnauthorized = () => setSession(null);
    window.addEventListener('cyrnex:unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('cyrnex:unauthorized', handleUnauthorized);
    };
  }, [refreshSession]);

  async function signIn(input: LoginInput): Promise<boolean> {
    setSubmitting(true);
    setError('');

    try {
      setSession(await login(input));
      return true;
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function signUp(input: RegisterInput): Promise<boolean> {
    setSubmitting(true);
    setError('');

    try {
      setSession(await register(input));
      return true;
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function addBusiness(businessName: string): Promise<boolean> {
    setSubmitting(true);
    setError('');

    try {
      setSession(await createBusiness({ businessName }));
      return true;
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function changeBusiness(businessId: string): Promise<boolean> {
    setSubmitting(true);
    setError('');

    try {
      setSession(await switchBusiness(businessId));
      return true;
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function signOut(): Promise<void> {
    setSubmitting(true);

    try {
      await logout();
    } finally {
      setSession(null);
      setSubmitting(false);
    }
  }

  return {
    session,
    loading,
    submitting,
    error,
    setError,
    signIn,
    signUp,
    addBusiness,
    changeBusiness,
    signOut,
    refreshSession
  };
}
