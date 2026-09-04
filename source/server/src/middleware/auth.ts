import type { NextFunction, Request, Response } from 'express';
import {
  findSessionByHash,
  readAuthStore,
  removeExpiredSessions,
  saveAuthStore
} from '../modules/auth/auth.store.js';
import { usesSupabaseAuth } from '../modules/auth/auth.provider.js';
import type { AuthContext } from '../modules/auth/auth.types.js';
import {
  getSupabaseUser,
  loadSupabaseAuthState,
  refreshSupabaseSession
} from '../modules/auth/supabaseAuth.service.js';
import {
  readSupabaseSessionCookies,
  setBusinessCookie,
  setSupabaseSessionCookies
} from '../modules/auth/supabaseSession.js';
import {
  hashSessionToken,
  readCookie,
  SESSION_COOKIE
} from '../modules/auth/session.js';

export function requireAuth(
  request: Request,
  response: Response,
  next: NextFunction
): void {
  void authenticateRequest(request, response, false)
    .then(authenticated => {
      if (authenticated) next();
    })
    .catch(next);
}

export function optionalAuth(
  request: Request,
  response: Response,
  next: NextFunction
): void {
  void authenticateRequest(request, response, true)
    .then(() => next())
    .catch(() => next());
}

async function authenticateRequest(
  request: Request,
  response: Response,
  silent: boolean
): Promise<boolean> {
  return usesSupabaseAuth()
    ? authenticateSupabaseRequest(request, response, silent)
    : authenticateLocalRequest(request, response, silent);
}

async function authenticateSupabaseRequest(
  request: Request,
  response: Response,
  silent: boolean
): Promise<boolean> {
  const cookies = readSupabaseSessionCookies(request.headers.cookie);
  let accessToken = cookies.accessToken;
  let refreshToken = cookies.refreshToken;

  if (!accessToken && !refreshToken) {
    if (!silent) response.status(401).json({ error: 'Entre na sua conta para continuar.' });
    return false;
  }

  let userIsValid = false;
  if (accessToken) {
    try {
      await getSupabaseUser(accessToken);
      userIsValid = true;
    } catch {
      userIsValid = false;
    }
  }

  if (!userIsValid && refreshToken) {
    try {
      const refreshed = await refreshSupabaseSession(refreshToken);
      accessToken = refreshed.access_token;
      refreshToken = refreshed.refresh_token;
      setSupabaseSessionCookies(response, {
        accessToken,
        refreshToken,
        expiresIn: refreshed.expires_in
      }, true);
      userIsValid = true;
    } catch {
      userIsValid = false;
    }
  }

  if (!userIsValid || !accessToken) {
    if (!silent) response.status(401).json({ error: 'Sua sessão expirou. Entre novamente.' });
    return false;
  }

  const state = await loadSupabaseAuthState(accessToken, cookies.businessId);
  request.auth = state.context;
  if (cookies.businessId !== state.context.businessId) {
    setBusinessCookie(response, state.context.businessId, true);
  }
  return true;
}

async function authenticateLocalRequest(
  request: Request,
  response: Response,
  silent: boolean
): Promise<boolean> {
  const token = readCookie(request.headers.cookie, SESSION_COOKIE);

  if (!token) {
    if (!silent) response.status(401).json({ error: 'Entre na sua conta para continuar.' });
    return false;
  }

  const store = await readAuthStore();
  removeExpiredSessions(store);
  const session = findSessionByHash(store.sessions, hashSessionToken(token));

  if (!session) {
    await saveAuthStore(store);
    if (!silent) response.status(401).json({ error: 'Sua sessão expirou. Entre novamente.' });
    return false;
  }

  const account = store.accounts.find(item => item.id === session.userId);
  const membership = account?.memberships.find(item => (
    item.businessId === session.businessId && item.active
  ));

  if (!account || !membership) {
    if (!silent) response.status(401).json({ error: 'Acesso não encontrado para esta barbearia.' });
    return false;
  }

  session.lastSeenAt = new Date().toISOString();
  request.auth = buildLocalAuthContext(account, membership);
  await saveAuthStore(store);
  return true;
}

function buildLocalAuthContext(
  account: Awaited<ReturnType<typeof readAuthStore>>['accounts'][number],
  membership: Awaited<ReturnType<typeof readAuthStore>>['accounts'][number]['memberships'][number]
): AuthContext {
  return {
    userId: account.id,
    username: account.username,
    email: account.email,
    businessId: membership.businessId,
    businessName: membership.businessName,
    businessSlug: membership.businessSlug,
    role: membership.role,
    displayName: membership.displayName
  };
}
