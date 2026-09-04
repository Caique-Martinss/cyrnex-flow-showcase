import {
  createHash,
  randomBytes,
  randomInt,
  randomUUID,
  scryptSync,
  timingSafeEqual
} from 'node:crypto';
import { Router } from 'express';
import { asyncRoute } from '../../middleware/asyncRoute.js';
import { normalizeText } from '../../utils/normalizers.js';
import {
  findAccountByEmail,
  findActivePasswordRecovery,
  readAuthStore,
  removeExpiredPasswordRecoveries,
  saveAuthStore
} from './auth.store.js';
import {
  createPasswordHash,
  validatePasswordStrength,
  verifyPassword
} from './password.js';
import {
  canExposeDevelopmentCode,
  isRecoveryDeliveryConfigured,
  sendPasswordChangedEmail,
  sendRecoveryCodeEmail
} from './recoveryEmail.js';

const router = Router();
const RECOVERY_MINUTES = readPositiveNumber('PASSWORD_RECOVERY_CODE_MINUTES', 10);
const RESEND_SECONDS = readPositiveNumber('PASSWORD_RECOVERY_RESEND_SECONDS', 60);
const MAX_CODE_ATTEMPTS = 5;
const GENERIC_MESSAGE = 'Se esse e-mail estiver cadastrado, enviaremos as instruções de recuperação.';
const transientRequests = new Map<string, number>();
const ipRequestWindows = new Map<string, { count: number; resetAt: number }>();
const IP_WINDOW_MINUTES = 15;
const IP_MAX_REQUESTS = 8;

router.post('/request', asyncRoute(async (request, response) => {
  const email = normalizeEmail(request.body.email);

  if (!isRecoveryDeliveryConfigured()) {
    response.status(503).json({
      error: 'A recuperação de senha está temporariamente indisponível.'
    });
    return;
  }

  const requestIp = request.ip ?? request.socket.remoteAddress ?? 'unknown';

  const ipWait = consumeIpRequestLimit(requestIp);
  if (ipWait > 0) {
    response.status(429).json({
      error: `Muitas solicitações. Tente novamente em ${ipWait}s.`,
      retryAfterSeconds: ipWait
    });
    return;
  }

  const requestKey = hashSecret(`${requestIp}|${email}`);
  const transientWait = secondsUntil(transientRequests.get(requestKey));

  if (transientWait > 0) {
    response.status(429).json({
      error: `Aguarde ${transientWait}s para solicitar outro código.`,
      retryAfterSeconds: transientWait
    });
    return;
  }

  transientRequests.set(requestKey, Date.now() + RESEND_SECONDS * 1_000);
  pruneTransientRequests();

  const account = await findAccountByEmail(email);
  const submittedMaskedEmail = maskEmail(email);

  if (!account) {
    response.json({
      success: true,
      message: GENERIC_MESSAGE,
      expiresInMinutes: RECOVERY_MINUTES,
      retryAfterSeconds: RESEND_SECONDS,
      maskedEmail: submittedMaskedEmail
    });
    return;
  }

  const store = await readAuthStore();
  removeExpiredPasswordRecoveries(store);
  const activeChallenge = findActivePasswordRecovery(store.passwordRecoveries, account.id);
  const waitSeconds = activeChallenge
    ? secondsUntil(new Date(activeChallenge.createdAt).getTime() + RESEND_SECONDS * 1_000)
    : 0;

  if (waitSeconds > 0) {
    response.status(429).json({
      error: `Aguarde ${waitSeconds}s para solicitar outro código.`,
      retryAfterSeconds: waitSeconds
    });
    return;
  }

  store.passwordRecoveries = store.passwordRecoveries.filter(item => (
    item.accountId !== account.id || item.usedAt
  ));

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const codeSalt = randomBytes(16).toString('hex');
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + RECOVERY_MINUTES * 60_000);

  store.passwordRecoveries.push({
    id: randomUUID(),
    accountId: account.id,
    email,
    codeHash: hashRecoveryCode(code, codeSalt),
    codeSalt,
    resetTokenHash: null,
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    verifiedAt: null,
    usedAt: null,
    attempts: 0
  });

  await saveAuthStore(store);

  try {
    await sendRecoveryCodeEmail({ to: account.email, code, expiresInMinutes: RECOVERY_MINUTES });
  } catch (error) {
    // A resposta continua genérica para não permitir descobrir quais e-mails possuem conta.
    console.error('[auth] Falha ao enviar código de recuperação.', error);
  }

  response.json({
    success: true,
    message: GENERIC_MESSAGE,
    expiresInMinutes: RECOVERY_MINUTES,
    retryAfterSeconds: RESEND_SECONDS,
    maskedEmail: submittedMaskedEmail,
    ...(canExposeDevelopmentCode() ? { developmentCode: code } : {})
  });
}));

router.post('/verify', asyncRoute(async (request, response) => {
  const email = normalizeEmail(request.body.email);
  const code = normalizeText(request.body.code).replace(/\D/g, '');
  const account = await findAccountByEmail(email);

  if (!account || code.length !== 6) {
    response.status(400).json({ error: 'Código inválido ou expirado.' });
    return;
  }

  const store = await readAuthStore();
  removeExpiredPasswordRecoveries(store);
  const challenge = findActivePasswordRecovery(store.passwordRecoveries, account.id);

  if (!challenge || challenge.verifiedAt || challenge.attempts >= MAX_CODE_ATTEMPTS) {
    await saveAuthStore(store);
    response.status(400).json({ error: 'Código inválido ou expirado.' });
    return;
  }

  challenge.attempts += 1;

  if (!safeRecoveryCodeCompare(code, challenge.codeHash, challenge.codeSalt)) {
    await saveAuthStore(store);
    response.status(400).json({
      error: challenge.attempts >= MAX_CODE_ATTEMPTS
        ? 'Limite de tentativas atingido. Solicite um novo código.'
        : 'Código inválido ou expirado.'
    });
    return;
  }

  const resetToken = randomBytes(32).toString('base64url');
  challenge.resetTokenHash = hashSecret(resetToken);
  challenge.verifiedAt = new Date().toISOString();
  await saveAuthStore(store);

  response.json({
    success: true,
    resetToken,
    message: 'Código confirmado. Agora crie sua nova senha.'
  });
}));

router.post('/reset', asyncRoute(async (request, response) => {
  const email = normalizeEmail(request.body.email);
  const resetToken = normalizeText(request.body.resetToken);
  const password = String(request.body.password ?? '');
  const passwordError = validatePasswordStrength(password);

  if (passwordError) {
    response.status(400).json({ error: passwordError });
    return;
  }

  const account = await findAccountByEmail(email);
  if (!account || !resetToken) {
    response.status(400).json({ error: 'Recuperação inválida ou expirada.' });
    return;
  }

  if (verifyPassword(password, account.passwordSalt, account.passwordHash)) {
    response.status(400).json({ error: 'Escolha uma senha diferente da senha atual.' });
    return;
  }

  const store = await readAuthStore();
  removeExpiredPasswordRecoveries(store);
  const challenge = findActivePasswordRecovery(store.passwordRecoveries, account.id);
  const validChallenge = Boolean(
    challenge
    && challenge.verifiedAt
    && challenge.resetTokenHash
    && safeSecretCompare(resetToken, challenge.resetTokenHash)
  );

  if (!validChallenge || !challenge) {
    response.status(400).json({ error: 'Recuperação inválida ou expirada.' });
    return;
  }

  const passwordData = createPasswordHash(password);
  account.passwordHash = passwordData.hash;
  account.passwordSalt = passwordData.salt;
  account.updatedAt = new Date().toISOString();
  challenge.usedAt = new Date().toISOString();

  // Trocar a senha encerra todas as sessões anteriores daquele usuário.
  store.sessions = store.sessions.filter(session => session.userId !== account.id);
  await saveAuthStore(store);

  // A senha já foi alterada. O aviso por e-mail é complementar e não pode desfazer a troca.
  sendPasswordChangedEmail({ to: account.email }).catch(error => {
    console.error('[auth] Falha ao enviar aviso de senha alterada.', error);
  });

  response.json({
    success: true,
    message: 'Senha alterada com sucesso. Entre novamente com sua nova senha.'
  });
}));

function normalizeEmail(value: unknown): string {
  return normalizeText(value).toLocaleLowerCase('pt-BR');
}

function hashSecret(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function safeSecretCompare(value: string, storedHash: string): boolean {
  const candidate = Buffer.from(hashSecret(value), 'hex');
  const stored = Buffer.from(storedHash, 'hex');
  return candidate.length === stored.length && timingSafeEqual(candidate, stored);
}

function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (!domain) return 'seu e-mail cadastrado';
  const visible = name.slice(0, Math.min(2, name.length));
  return `${visible}${'*'.repeat(Math.max(2, name.length - visible.length))}@${domain}`;
}

function readPositiveNumber(name: string, fallback: number): number {
  const parsed = Number(process.env[name] ?? fallback);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function secondsUntil(timestamp?: number): number {
  if (!timestamp) return 0;
  return Math.max(0, Math.ceil((timestamp - Date.now()) / 1_000));
}

function pruneTransientRequests(): void {
  if (transientRequests.size < 1_000) return;
  const now = Date.now();
  for (const [key, expiresAt] of transientRequests) {
    if (expiresAt <= now) transientRequests.delete(key);
  }
}


function hashRecoveryCode(code: string, salt: string): string {
  return scryptSync(code, salt, 32).toString('hex');
}

function safeRecoveryCodeCompare(
  code: string,
  storedHash: string,
  salt: string | undefined
): boolean {
  if (!salt) return false;
  const candidate = Buffer.from(hashRecoveryCode(code, salt), 'hex');
  const stored = Buffer.from(storedHash, 'hex');
  return candidate.length === stored.length && timingSafeEqual(candidate, stored);
}

function consumeIpRequestLimit(ip: string): number {
  const now = Date.now();
  const key = hashSecret(ip || 'unknown');
  const current = ipRequestWindows.get(key);

  if (!current || current.resetAt <= now) {
    ipRequestWindows.set(key, {
      count: 1,
      resetAt: now + IP_WINDOW_MINUTES * 60_000
    });
    return 0;
  }

  if (current.count >= IP_MAX_REQUESTS) {
    return Math.max(1, Math.ceil((current.resetAt - now) / 1_000));
  }

  current.count += 1;
  return 0;
}

export { router as passwordRecoveryRouter };
