import {
  createHash,
  randomBytes,
  randomInt,
  scryptSync,
  timingSafeEqual
} from 'node:crypto';
import { Router } from 'express';
import { serverSupabaseRest } from '../../database/postgres/restClient.js';
import { asyncRoute } from '../../middleware/asyncRoute.js';
import { normalizeText } from '../../utils/normalizers.js';
import { validatePasswordStrength } from './password.js';
import {
  canExposeDevelopmentCode,
  isRecoveryDeliveryConfigured,
  sendPasswordChangedEmail,
  sendRecoveryCodeEmail
} from './recoveryEmail.js';
import { adminUpdateSupabaseUserPassword } from './supabaseAuth.service.js';
import { clearSupabaseSessionCookies } from './supabaseSession.js';

interface RecoveryChallengeRow {
  id: string;
  user_id: string;
  email: string;
  code_hash: string;
  code_salt: string;
  reset_token_hash: string | null;
  created_at: string;
  expires_at: string;
  verified_at: string | null;
  used_at: string | null;
  attempts: number;
}

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

  const userId = await findRecoveryUserId(email);
  const submittedMaskedEmail = maskEmail(email);
  if (!userId) {
    response.json(genericRequestResponse(submittedMaskedEmail));
    return;
  }

  const now = new Date();
  const active = await loadActiveChallenge(userId, now);
  const waitSeconds = active
    ? secondsUntil(new Date(active.created_at).getTime() + RESEND_SECONDS * 1_000)
    : 0;

  if (waitSeconds > 0) {
    response.status(429).json({
      error: `Aguarde ${waitSeconds}s para solicitar outro código.`,
      retryAfterSeconds: waitSeconds
    });
    return;
  }

  await serverSupabaseRest<unknown>('/rest/v1/password_recovery_challenges', {
    method: 'DELETE',
    query: {
      user_id: `eq.${userId}`,
      used_at: 'is.null'
    }
  });

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const codeSalt = randomBytes(16).toString('hex');
  const expiresAt = new Date(now.getTime() + RECOVERY_MINUTES * 60_000);

  await serverSupabaseRest<RecoveryChallengeRow[]>('/rest/v1/password_recovery_challenges', {
    method: 'POST',
    prefer: 'return=representation',
    body: {
      user_id: userId,
      email,
      code_hash: hashRecoveryCode(code, codeSalt),
      code_salt: codeSalt,
      expires_at: expiresAt.toISOString()
    }
  });

  try {
    await sendRecoveryCodeEmail({ to: email, code, expiresInMinutes: RECOVERY_MINUTES });
  } catch (error) {
    console.error('[auth] Falha ao enviar código de recuperação Supabase.', error);
  }

  response.json({
    ...genericRequestResponse(submittedMaskedEmail),
    ...(canExposeDevelopmentCode() ? { developmentCode: code } : {})
  });
}));

router.post('/verify', asyncRoute(async (request, response) => {
  const email = normalizeEmail(request.body.email);
  const code = normalizeText(request.body.code).replace(/\D/g, '');
  const userId = await findRecoveryUserId(email);

  if (!userId || code.length !== 6) {
    response.status(400).json({ error: 'Código inválido ou expirado.' });
    return;
  }

  const challenge = await loadActiveChallenge(userId, new Date(), true);
  if (!challenge || challenge.attempts >= MAX_CODE_ATTEMPTS) {
    response.status(400).json({ error: 'Código inválido ou expirado.' });
    return;
  }

  const attempts = challenge.attempts + 1;
  if (!safeRecoveryCodeCompare(code, challenge.code_hash, challenge.code_salt)) {
    await updateChallenge(challenge.id, { attempts });
    response.status(400).json({
      error: attempts >= MAX_CODE_ATTEMPTS
        ? 'Limite de tentativas atingido. Solicite um novo código.'
        : 'Código inválido ou expirado.'
    });
    return;
  }

  const resetToken = randomBytes(32).toString('base64url');
  await updateChallenge(challenge.id, {
    attempts,
    reset_token_hash: hashSecret(resetToken),
    verified_at: new Date().toISOString()
  });

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
  if (!email || !resetToken) {
    response.status(400).json({ error: 'Recuperação inválida ou expirada.' });
    return;
  }

  const userId = await serverSupabaseRest<string | null>(
    '/rest/v1/rpc/claim_password_recovery_challenge',
    {
      method: 'POST',
      body: {
        p_email: email,
        p_reset_token_hash: hashSecret(resetToken)
      }
    }
  );

  if (!userId) {
    response.status(400).json({ error: 'Recuperação inválida ou expirada.' });
    return;
  }

  await adminUpdateSupabaseUserPassword(userId, password);
  await serverSupabaseRest<number>('/rest/v1/rpc/revoke_recovery_user_sessions', {
    method: 'POST',
    body: { p_user_id: userId }
  });
  clearSupabaseSessionCookies(response);

  sendPasswordChangedEmail({ to: email }).catch(error => {
    console.error('[auth] Falha ao enviar aviso de senha alterada Supabase.', error);
  });

  response.json({
    success: true,
    message: 'Senha alterada com sucesso. Entre novamente com sua nova senha.'
  });
}));

async function findRecoveryUserId(email: string): Promise<string | null> {
  if (!email) return null;
  return serverSupabaseRest<string | null>('/rest/v1/rpc/find_recovery_user_by_email', {
    method: 'POST',
    body: { p_email: email }
  });
}

async function loadActiveChallenge(
  userId: string,
  now: Date,
  onlyUnverified = false
): Promise<RecoveryChallengeRow | null> {
  const rows = await serverSupabaseRest<RecoveryChallengeRow[]>(
    '/rest/v1/password_recovery_challenges',
    {
      query: {
        select: '*',
        user_id: `eq.${userId}`,
        used_at: 'is.null',
        expires_at: `gt.${now.toISOString()}`,
        ...(onlyUnverified ? { verified_at: 'is.null' } : {}),
        order: 'created_at.desc',
        limit: '1'
      }
    }
  );
  return rows[0] ?? null;
}

async function updateChallenge(
  challengeId: string,
  body: Partial<Pick<RecoveryChallengeRow, 'attempts' | 'reset_token_hash' | 'verified_at'>>
): Promise<void> {
  await serverSupabaseRest<unknown>('/rest/v1/password_recovery_challenges', {
    method: 'PATCH',
    query: { id: `eq.${challengeId}` },
    body
  });
}

function genericRequestResponse(maskedEmail: string) {
  return {
    success: true,
    message: GENERIC_MESSAGE,
    expiresInMinutes: RECOVERY_MINUTES,
    retryAfterSeconds: RESEND_SECONDS,
    maskedEmail
  };
}

function normalizeEmail(value: unknown): string {
  return normalizeText(value).toLocaleLowerCase('pt-BR');
}

function hashSecret(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function hashRecoveryCode(code: string, salt: string): string {
  return scryptSync(code, salt, 32).toString('hex');
}

function safeRecoveryCodeCompare(code: string, storedHash: string, salt: string): boolean {
  const candidate = Buffer.from(hashRecoveryCode(code, salt), 'hex');
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

export { router as supabasePasswordRecoveryRouter };
