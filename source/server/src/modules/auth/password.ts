import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;

export function createPasswordHash(password: string): {
  hash: string;
  salt: string;
} {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return { hash, salt };
}

export function verifyPassword(
  password: string,
  salt: string,
  storedHash: string
): boolean {
  const candidate = scryptSync(password, salt, KEY_LENGTH);
  const stored = Buffer.from(storedHash, 'hex');

  if (candidate.length !== stored.length) return false;
  return timingSafeEqual(candidate, stored);
}

export function validatePasswordStrength(password: string): string {
  if (password.length < 8) {
    return 'A senha deve ter pelo menos 8 caracteres.';
  }

  if (!/[A-Za-zÀ-ÿ]/.test(password)) {
    return 'A senha precisa ter pelo menos uma letra.';
  }

  if (!/\d/.test(password)) {
    return 'A senha precisa ter pelo menos um número.';
  }

  return '';
}
