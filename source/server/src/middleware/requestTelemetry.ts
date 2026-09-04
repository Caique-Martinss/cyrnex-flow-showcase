import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { writePlatformSystemLog } from '../modules/platform-admin/platformSystemLog.js';

const slowRequestMs = Number(process.env.CYRNEX_SLOW_REQUEST_MS ?? 1800);

export function requestTelemetry(request: Request, response: Response, next: NextFunction): void {
  const startedAt = performance.now();
  const requestId = randomUUID();
  response.setHeader('x-request-id', requestId);

  response.once('finish', () => {
    const durationMs = Math.max(0, Math.round(performance.now() - startedAt));
    const isServerFailure = response.statusCode >= 500;
    const isSlow = durationMs >= slowRequestMs && !request.originalUrl.startsWith('/api/health');
    if (!isServerFailure && !isSlow) return;

    void writePlatformSystemLog({
      severity: isServerFailure ? 'error' : 'warn',
      category: isServerFailure ? 'http_5xx' : 'slow_request',
      source: 'express',
      message: isServerFailure
        ? `Requisição terminou com HTTP ${response.statusCode}.`
        : `Requisição lenta: ${durationMs} ms.`,
      businessId: request.auth?.businessId ?? null,
      requestId,
      route: `${request.method} ${request.originalUrl}`,
      httpStatus: response.statusCode,
      durationMs,
      metadata: {
        method: request.method,
        path: request.path
      }
    });
  });

  next();
}
