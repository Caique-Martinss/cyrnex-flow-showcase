import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { initializeBusinessDatabase } from '../../database/index.js';
import { asyncRoute } from '../../middleware/asyncRoute.js';
import { createRateLimiter } from '../../middleware/rateLimit.js';
import { normalizeText } from '../../utils/normalizers.js';
import { requireAuth } from '../../middleware/auth.js';
import {
  findAccountByEmail,
  findAccountByUsername,
  readAuthStore,
  removeExpiredSessions,
  saveAuthStore
} from './auth.store.js';
import type {
  AuthContext,
  AuthSessionResponse,
  BusinessMembership,
  LocalAccount
} from './auth.types.js';
import {
  createPasswordHash,
  validatePasswordStrength,
  verifyPassword
} from './password.js';
import { passwordRecoveryRouter } from './passwordRecovery.routes.js';
import {
  clearSessionCookie,
  createSession,
  hashSessionToken,
  readCookie,
  SESSION_COOKIE,
  setSessionCookie
} from './session.js';

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

  const validationError = validateRegistration({
    displayName,
    businessName,
    username,
    email,
    password
  });

  if (validationError) {
    response.status(400).json({ error: validationError });
    return;
  }

  if (await findAccountByUsername(username)) {
    response.status(409).json({ error: 'Esse nome de usuário já está em uso.' });
    return;
  }

  if (await findAccountByEmail(email)) {
    response.status(409).json({ error: 'Esse e-mail já está vinculado a uma conta.' });
    return;
  }

  const store = await readAuthStore();
  removeExpiredSessions(store);
  const businessId = randomUUID();
  const businessSlug = createUniqueBusinessSlug(businessName, store.accounts);
  const accountId = randomUUID();
  const now = new Date().toISOString();
  const passwordData = createPasswordHash(password);
  const membership: BusinessMembership = {
    businessId,
    businessName,
    businessSlug,
    role: 'owner',
    displayName,
    active: true
  };
  const account: LocalAccount = {
    id: accountId,
    username,
    normalizedUsername: username,
    email,
    passwordHash: passwordData.hash,
    passwordSalt: passwordData.salt,
    memberships: [membership],
    lastBusinessId: businessId,
    createdAt: now,
    updatedAt: now
  };

  store.accounts.push(account);
  const { session, token } = createSession(
    store,
    account.id,
    businessId,
    Boolean(request.body.rememberMe)
  );

  await initializeBusinessDatabase(
    businessId,
    businessName,
    businessSlug,
    store.accounts.length === 1,
    displayName
  );
  await saveAuthStore(store);
  setSessionCookie(response, token, session.expiresAt);
  response.status(201).json(toSessionResponse(buildAuthContext(account, membership), account));
}));

router.post('/login', loginLimiter, asyncRoute(async (request, response) => {
  const username = normalizeUsername(request.body.username);
  const password = String(request.body.password ?? '');
  const account = await findAccountByUsername(username);

  if (!account || !verifyPassword(password, account.passwordSalt, account.passwordHash)) {
    response.status(401).json({ error: 'Usuário ou senha incorretos.' });
    return;
  }

  const membership = account.memberships.find(item => (
    item.active && item.businessId === account.lastBusinessId
  )) ?? account.memberships.find(item => item.active);
  if (!membership) {
    response.status(403).json({ error: 'Sua conta não possui uma barbearia ativa.' });
    return;
  }

  const store = await readAuthStore();
  removeExpiredSessions(store);
  const { session, token } = createSession(
    store,
    account.id,
    membership.businessId,
    Boolean(request.body.rememberMe)
  );

  await saveAuthStore(store);
  setSessionCookie(response, token, session.expiresAt);
  response.json(toSessionResponse(buildAuthContext(account, membership), account));
}));

router.post('/businesses', requireAuth, asyncRoute(async (request, response) => {
  const businessName = normalizeText(request.body.businessName);

  if (businessName.length < 2 || businessName.length > 80) {
    response.status(400).json({ error: 'Informe um nome de barbearia com 2 a 80 caracteres.' });
    return;
  }

  const store = await readAuthStore();
  removeExpiredSessions(store);
  const account = store.accounts.find(item => item.id === request.auth.userId);

  if (!account) {
    response.status(401).json({ error: 'Sua sessão não é mais válida.' });
    return;
  }

  const ownedBusinesses = account.memberships.filter(item => item.active && item.role === 'owner');
  if (ownedBusinesses.length >= 20) {
    response.status(400).json({ error: 'Limite de barbearias por conta atingido.' });
    return;
  }

  const businessId = randomUUID();
  const businessSlug = createUniqueBusinessSlug(businessName, store.accounts);
  const currentMembership = account.memberships.find(item => item.businessId === request.auth.businessId);
  const membership: BusinessMembership = {
    businessId,
    businessName,
    businessSlug,
    role: 'owner',
    displayName: currentMembership?.displayName ?? request.auth.displayName,
    active: true
  };

  account.memberships.push(membership);
  account.lastBusinessId = businessId;
  account.updatedAt = new Date().toISOString();

  const token = readCookie(request.headers.cookie, SESSION_COOKIE);
  const currentHash = token ? hashSessionToken(token) : '';
  const currentSession = currentHash
    ? store.sessions.find(item => item.tokenHash === currentHash)
    : undefined;
  const rememberMe = currentSession ? isRememberedSession(currentSession) : false;
  if (currentHash) {
    store.sessions = store.sessions.filter(item => item.tokenHash !== currentHash);
  }

  const created = createSession(store, account.id, businessId, rememberMe);
  await initializeBusinessDatabase(businessId, businessName, businessSlug, false, membership.displayName);
  await saveAuthStore(store);
  setSessionCookie(response, created.token, created.session.expiresAt);
  response.status(201).json(toSessionResponse(buildAuthContext(account, membership), account));
}));

router.post('/businesses/switch', requireAuth, asyncRoute(async (request, response) => {
  const businessId = String(request.body.businessId ?? '');
  const store = await readAuthStore();
  removeExpiredSessions(store);
  const account = store.accounts.find(item => item.id === request.auth.userId);
  const membership = account?.memberships.find(item => (
    item.active && item.businessId === businessId
  ));

  if (!account || !membership) {
    response.status(404).json({ error: 'Barbearia não encontrada para esta conta.' });
    return;
  }

  account.lastBusinessId = businessId;
  account.updatedAt = new Date().toISOString();

  const token = readCookie(request.headers.cookie, SESSION_COOKIE);
  const currentHash = token ? hashSessionToken(token) : '';
  const currentSession = currentHash
    ? store.sessions.find(item => item.tokenHash === currentHash)
    : undefined;
  const rememberMe = currentSession ? isRememberedSession(currentSession) : false;
  if (currentHash) {
    store.sessions = store.sessions.filter(item => item.tokenHash !== currentHash);
  }

  const created = createSession(store, account.id, businessId, rememberMe);
  await saveAuthStore(store);
  setSessionCookie(response, created.token, created.session.expiresAt);
  response.json(toSessionResponse(buildAuthContext(account, membership), account));
}));

router.get('/me', requireAuth, asyncRoute(async (request, response) => {
  const store = await readAuthStore();
  const account = store.accounts.find(item => item.id === request.auth.userId);
  if (!account) {
    response.status(401).json({ error: 'Sua conta não foi encontrada.' });
    return;
  }
  response.json(toSessionResponse(request.auth, account));
}));

router.post('/logout', asyncRoute(async (request, response) => {
  const token = readCookie(request.headers.cookie, SESSION_COOKIE);

  if (token) {
    const store = await readAuthStore();
    const tokenHash = hashSessionToken(token);
    store.sessions = store.sessions.filter(item => item.tokenHash !== tokenHash);
    await saveAuthStore(store);
  }

  clearSessionCookie(response);
  response.status(204).send();
}));

router.use('/recovery', passwordRecoveryRouter);

function buildAuthContext(
  account: LocalAccount,
  membership: BusinessMembership
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

function toSessionResponse(
  context: AuthContext,
  account: LocalAccount
): AuthSessionResponse {
  return {
    authenticated: true,
    user: {
      id: context.userId,
      username: context.username,
      email: context.email,
      displayName: context.displayName
    },
    business: {
      id: context.businessId,
      name: context.businessName,
      slug: context.businessSlug
    },
    role: context.role,
    platformAdmin: null,
    businesses: account.memberships
      .filter(item => item.active)
      .map(item => ({
        id: item.businessId,
        name: item.businessName,
        slug: item.businessSlug,
        role: item.role,
        active: item.active
      }))
  };
}

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
  if (!/^\S+@\S+\.\S+$/.test(input.email)) {
    return 'Informe um e-mail válido para recuperação da conta.';
  }
  return validatePasswordStrength(input.password);
}

function normalizeUsername(value: unknown): string {
  return normalizeText(value).toLocaleLowerCase('pt-BR');
}

function normalizeEmail(value: unknown): string {
  return normalizeText(value).toLocaleLowerCase('pt-BR');
}

function createUniqueBusinessSlug(
  businessName: string,
  accounts: LocalAccount[]
): string {
  const base = businessName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'barbearia';
  const used = new Set(
    accounts.flatMap(account => account.memberships.map(item => item.businessSlug))
  );

  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}



function isRememberedSession(session: { createdAt: string; expiresAt: string }): boolean {
  const lifetimeMs = new Date(session.expiresAt).getTime() - new Date(session.createdAt).getTime();
  return lifetimeMs > 2 * 24 * 60 * 60 * 1000;
}

export { router as localAuthRouter };
