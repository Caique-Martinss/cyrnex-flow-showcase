import type { NextFunction, Request, Response } from 'express';
import {
  getSupabaseUser,
  refreshSupabaseSession
} from '../modules/auth/supabaseAuth.service.js';
import {
  readSupabaseSessionCookies,
  setSupabaseSessionCookies
} from '../modules/auth/supabaseSession.js';
import { loadPlatformAdminContext } from '../modules/platform-admin/platformAdmin.repository.js';

export function requirePlatformAdmin(
  request: Request,
  response: Response,
  next: NextFunction
): void {
  void authenticatePlatformAdmin(request, response)
    .then(authenticated => {
      if (authenticated) next();
    })
    .catch(next);
}

async function authenticatePlatformAdmin(
  request: Request,
  response: Response
): Promise<boolean> {
  const cookies = readSupabaseSessionCookies(request.headers.cookie);
  let accessToken = cookies.accessToken;
  let refreshToken = cookies.refreshToken;

  if (!accessToken && !refreshToken) {
    response.status(401).json({ error: 'Entre no CYRNEX Admin para continuar.' });
    return false;
  }

  let user = accessToken ? await getSupabaseUser(accessToken).catch(() => null) : null;
  if (!user && refreshToken) {
    try {
      const refreshed = await refreshSupabaseSession(refreshToken);
      accessToken = refreshed.access_token;
      refreshToken = refreshed.refresh_token;
      setSupabaseSessionCookies(response, {
        accessToken,
        refreshToken,
        expiresIn: refreshed.expires_in
      }, true);
      user = await getSupabaseUser(accessToken);
    } catch {
      user = null;
    }
  }

  if (!user || !accessToken) {
    response.status(401).json({ error: 'Sua sessão administrativa expirou.' });
    return false;
  }

  const admin = await loadPlatformAdminContext({
    userId: user.id,
    email: user.email ?? ''
  });
  if (!admin) {
    response.status(403).json({ error: 'Esta conta não possui acesso ao CYRNEX Admin.' });
    return false;
  }
  request.platformAdmin = admin;
  return true;
}
