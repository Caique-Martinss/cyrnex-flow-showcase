import type { NextFunction, Request, Response } from 'express';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message: string;
  key?: (request: Request) => string;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export function createRateLimiter(options: RateLimitOptions) {
  const entries = new Map<string, RateLimitEntry>();
  let operations = 0;

  return function rateLimit(
    request: Request,
    response: Response,
    next: NextFunction
  ): void {
    const now = Date.now();
    const key = options.key?.(request) ?? getClientKey(request);
    const existing = entries.get(key);
    const entry = !existing || existing.resetAt <= now
      ? { count: 0, resetAt: now + options.windowMs }
      : existing;

    entry.count += 1;
    entries.set(key, entry);
    operations += 1;

    response.setHeader('RateLimit-Limit', String(options.max));
    response.setHeader('RateLimit-Remaining', String(Math.max(0, options.max - entry.count)));
    response.setHeader('RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > options.max) {
      response.setHeader('Retry-After', String(Math.max(1, Math.ceil((entry.resetAt - now) / 1000))));
      response.status(429).json({ error: options.message });
      cleanupOccasionally(entries, now, operations);
      return;
    }

    cleanupOccasionally(entries, now, operations);
    next();
  };
}

export function getClientKey(request: Request): string {
  // Express calcula request.ip respeitando a configuração de proxy confiável.
  // Não usamos X-Forwarded-For bruto porque ele pode ser falsificado fora de um proxy confiável.
  return (request.ip || request.socket.remoteAddress || 'unknown').slice(0, 128);
}

function cleanupOccasionally(
  entries: Map<string, RateLimitEntry>,
  now: number,
  operations: number
): void {
  if (operations % 250 !== 0) return;
  for (const [key, entry] of entries) {
    if (entry.resetAt <= now) entries.delete(key);
  }
}
