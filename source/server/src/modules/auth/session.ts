import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Response } from 'express';
import type { AuthStore, LocalSession } from './auth.types.js';

export const SESSION_COOKIE = 'scos_session';
const SESSION_DAYS = 1;
const REMEMBERED_SESSION_DAYS = 30;

export function createSession(
  store: AuthStore,
  userId: string,
  businessId: string,
  rememberMe: boolean
): { session: LocalSession; token: string } {
  const token = randomBytes(32).toString('base64url');
  const createdAt = new Date();
  const expiresAt = new Date(createdAt);
  expiresAt.setDate(
    expiresAt.getDate() + (rememberMe ? REMEMBERED_SESSION_DAYS : SESSION_DAYS)
  );

  const session: LocalSession = {
    id: randomUUID(),
    tokenHash: hashSessionToken(token),
    userId,
    businessId,
    expiresAt: expiresAt.toISOString(),
    createdAt: createdAt.toISOString(),
    lastSeenAt: createdAt.toISOString()
  };

  store.sessions.push(session);
  return { session, token };
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function setSessionCookie(
  response: Response,
  token: string,
  expiresAt: string
): void {
  response.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(expiresAt),
    path: '/'
  });
}

export function clearSessionCookie(response: Response): void {
  response.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/'
  });
}

export function readCookie(cookieHeader: string | undefined, name: string): string {
  if (!cookieHeader) return '';

  for (const cookie of cookieHeader.split(';')) {
    const [key, ...parts] = cookie.trim().split('=');
    if (key === name) return decodeURIComponent(parts.join('='));
  }

  return '';
}
