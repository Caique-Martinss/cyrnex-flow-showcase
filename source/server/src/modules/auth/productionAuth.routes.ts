import { Router } from 'express';
import { asyncRoute } from '../../middleware/asyncRoute.js';
import { requireAuth } from '../../middleware/auth.js';
import { createRateLimiter } from '../../middleware/rateLimit.js';
import { normalizeText } from '../../utils/normalizers.js';
import { validatePasswordStrength } from './password.js';
import { supabasePasswordRecoveryRouter } from './supabasePasswordRecovery.routes.js';
import {
  createSupabaseBusiness,
  loadSupabaseAuthState,
  registerSupabaseOwner,
  signInSupabaseWithUsername,
  signOutSupabase
} from './supabaseAuth.service.js';
import {
  clearSupabaseSessionCookies,
  readSupabaseSessionCookies,
  setBusinessCookie,
  setSupabaseSessionCookies
} from './supabaseSession.js';

const router = Router();
const registerLimiter = createRateLimiter({
  windowMs: 60 * 60_000,
  max: 8,
  message: 'Muitas tentativas de cadastro. Aguarde antes de tentar novamente.'
});
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60_000,
  max: 12,
  message: 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.'
});

router.post('/register', registerLimiter, asyncRoute(async (request, response) => {
  const displayName = normalizeText(request.body.displayName);
  const businessName = normalizeText(request.body.businessName);
  const username = normalizeUsername(request.body.username);
  const email = normalizeEmail(request.body.email);
  const password = String(request.body.password ?? '');
  const rememberMe = Boolean(request.body.rememberMe);
  const validationError = validateRegistration({ displayName, businessName, username, email, password });

  if (validationError) {
    response.status(400).json({ error: validationError });
    return;
  }

  const tokens = await registerSupabaseOwner({ username, email, password, displayName, businessName });
  const state = await loadSupabaseAuthState(tokens.access_token);
  setSupabaseSessionCookies(response, {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in
  }, rememberMe);
  setBusinessCookie(response, state.context.businessId, rememberMe);
  response.status(201).json(state.session);
}));

router.post('/login', loginLimiter, asyncRoute(async (request, response) => {
  const username = normalizeUsername(request.body.username);
  const password = String(request.body.password ?? '');
  const rememberMe = Boolean(request.body.rememberMe);

  if (!username || !password) {
    response.status(400).json({ error: 'Informe usuário e senha.' });
    return;
  }

  const tokens = await signInSupabaseWithUsername(username, password);
  const state = await loadSupabaseAuthState(tokens.access_token);
  setSupabaseSessionCookies(response, {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in
  }, rememberMe);
  setBusinessCookie(response, state.context.businessId, rememberMe);
  response.json(state.session);
}));

router.post('/businesses', requireAuth, asyncRoute(async (request, response) => {
  const businessName = normalizeText(request.body.businessName);
  if (businessName.length < 2 || businessName.length > 120) {
    response.status(400).json({ error: 'Informe um nome de barbearia com 2 a 120 caracteres.' });
    return;
  }
  if (!request.auth.accessToken) {
    response.status(401).json({ error: 'Sessão de produção inválida.' });
    return;
  }

  const created = await createSupabaseBusiness(request.auth.accessToken, businessName);
  setBusinessCookie(response, created.id, true);
  const state = await loadSupabaseAuthState(request.auth.accessToken, created.id);
  response.status(201).json(state.session);
}));

router.post('/businesses/switch', requireAuth, asyncRoute(async (request, response) => {
  const businessId = String(request.body.businessId ?? '');
  if (!request.auth.accessToken || !/^[a-f0-9-]{36}$/i.test(businessId)) {
    response.status(400).json({ error: 'Barbearia inválida.' });
    return;
  }

  const state = await loadSupabaseAuthState(request.auth.accessToken, businessId);
  if (state.context.businessId !== businessId) {
    response.status(404).json({ error: 'Barbearia não encontrada para esta conta.' });
    return;
  }
  setBusinessCookie(response, businessId, true);
  response.json(state.session);
}));

router.get('/me', requireAuth, asyncRoute(async (request, response) => {
  if (!request.auth.accessToken) {
    response.status(401).json({ error: 'Sessão de produção inválida.' });
    return;
  }
  const state = await loadSupabaseAuthState(request.auth.accessToken, request.auth.businessId);
  response.json(state.session);
}));

router.post('/logout', asyncRoute(async (request, response) => {
  const cookies = readSupabaseSessionCookies(request.headers.cookie);
  if (cookies.accessToken) await signOutSupabase(cookies.accessToken);
  clearSupabaseSessionCookies(response);
  response.status(204).send();
}));

router.use('/recovery', supabasePasswordRecoveryRouter);

function validateRegistration(input: {
  displayName: string;
  businessName: string;
  username: string;
  email: string;
  password: string;
}): string {
  if (input.displayName.length < 2) return 'Informe seu nome.';
  if (input.businessName.length < 2) return 'Informe o nome da barbearia.';
  if (!/^[a-z0-9._-]{3,32}$/.test(input.username)) {
    return 'O usuário deve ter de 3 a 32 caracteres, usando letras, números, ponto, hífen ou underline.';
  }
  if (!/^\S+@\S+\.\S+$/.test(input.email)) return 'Informe um e-mail válido para recuperação da conta.';
  return validatePasswordStrength(input.password);
}

function normalizeUsername(value: unknown): string {
  return normalizeText(value).toLocaleLowerCase('pt-BR');
}

function normalizeEmail(value: unknown): string {
  return normalizeText(value).toLocaleLowerCase('pt-BR');
}

export { router as productionAuthRouter };
