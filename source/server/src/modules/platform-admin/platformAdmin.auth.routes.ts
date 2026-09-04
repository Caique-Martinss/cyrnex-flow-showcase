import { Router } from 'express';
import { asyncRoute } from '../../middleware/asyncRoute.js';
import { requirePlatformAdmin } from '../../middleware/platformAdminAuth.js';
import {
  getSupabaseUser,
  signInSupabaseWithUsername,
  signOutSupabase
} from '../auth/supabaseAuth.service.js';
import {
  clearSupabaseSessionCookies,
  readSupabaseSessionCookies,
  setSupabaseSessionCookies
} from '../auth/supabaseSession.js';
import { loadPlatformAdminContext } from './platformAdmin.repository.js';

export const platformAdminAuthRouter = Router();

platformAdminAuthRouter.post('/login', asyncRoute(async (request, response) => {
  const username = String(request.body.username ?? '').trim();
  const password = String(request.body.password ?? '');
  const rememberMe = Boolean(request.body.rememberMe);
  if (!username || !password) {
    response.status(400).json({ error: 'Informe usuário e senha.' });
    return;
  }

  const tokens = await signInSupabaseWithUsername(username, password);
  const user = await getSupabaseUser(tokens.access_token);
  const admin = await loadPlatformAdminContext({ userId: user.id, email: user.email ?? '' });
  if (!admin) {
    await signOutSupabase(tokens.access_token);
    response.status(403).json({ error: 'Esta conta não possui acesso ao CYRNEX Admin.' });
    return;
  }

  setSupabaseSessionCookies(response, {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in
  }, rememberMe);
  response.json({ authenticated: true, admin });
}));

platformAdminAuthRouter.get('/me', requirePlatformAdmin, (request, response) => {
  response.json({ authenticated: true, admin: request.platformAdmin });
});

platformAdminAuthRouter.post('/logout', asyncRoute(async (request, response) => {
  const cookies = readSupabaseSessionCookies(request.headers.cookie);
  if (cookies.accessToken) await signOutSupabase(cookies.accessToken);
  clearSupabaseSessionCookies(response);
  response.status(204).end();
}));
