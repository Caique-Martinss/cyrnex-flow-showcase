import { createHash, randomBytes } from 'node:crypto';

const ACCESS_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43,86}$/;

export function createPublicBookingAccess() {
  const token = randomBytes(32).toString('base64url');
  return {
    token,
    tokenHash: hashPublicBookingAccessToken(token)
  };
}

export function hashPublicBookingAccessToken(value: string): string {
  const token = value.trim();
  if (!ACCESS_TOKEN_PATTERN.test(token)) {
    throw Object.assign(
      new Error('Agendamento não encontrado ou link expirado.'),
      { status: 404 }
    );
  }
  return createHash('sha256').update(token, 'utf8').digest('hex');
}
