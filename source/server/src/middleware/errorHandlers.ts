import type { NextFunction, Request, Response } from 'express';
import { writePlatformSystemLog } from '../modules/platform-admin/platformSystemLog.js';

export function notFoundHandler(
  _request: Request,
  response: Response
) {
  response.status(404).json({ error: 'Rota não encontrada.' });
}

export function errorHandler(
  error: unknown,
  request: Request,
  response: Response,
  _next: NextFunction
) {
  const typed = error as { type?: string; message?: string; status?: number; name?: string; stack?: string };
  if (typed.type === 'entity.too.large' || typed.status === 413) {
    void writePlatformSystemLog({
      severity: 'warn',
      category: 'request_rejected',
      source: 'express',
      message: 'Payload acima do limite permitido.',
      businessId: request.auth?.businessId ?? null,
      route: `${request.method} ${request.originalUrl}`,
      httpStatus: 413
    });
    response.status(413).json({
      error: 'Os dados enviados são maiores do que o permitido para esta operação.'
    });
    return;
  }
  if (typed.message === 'Origem não autorizada pelo CORS.') {
    void writePlatformSystemLog({
      severity: 'warn',
      category: 'security',
      source: 'cors',
      message: 'Origem bloqueada pelo CORS.',
      route: `${request.method} ${request.originalUrl}`,
      httpStatus: 403
    });
    response.status(403).json({ error: 'Origem não autorizada para acessar esta API.' });
    return;
  }
  if (typed.status && typed.status >= 400 && typed.status < 500 && typed.message) {
    response.status(typed.status).json({ error: typed.message });
    return;
  }

  void writePlatformSystemLog({
    severity: 'error',
    category: 'unhandled_error',
    source: 'express',
    message: typed.message || 'Erro interno não tratado.',
    businessId: request.auth?.businessId ?? null,
    route: `${request.method} ${request.originalUrl}`,
    httpStatus: 500,
    metadata: {
      errorName: typed.name ?? 'Error',
      stack: typed.stack ?? null
    }
  });

  console.error(error);
  response
    .status(500)
    .json({ error: 'Ocorreu um erro interno. Tente novamente.' });
}
