import type { NextFunction, Request, Response } from 'express';

const tails = new Map<string, Promise<void>>();

export async function withBusinessLock<T>(
  businessId: string,
  operation: () => Promise<T>
): Promise<T> {
  const release = await acquireBusinessLock(businessId);
  try {
    return await operation();
  } finally {
    release();
  }
}

export function serializeBusinessMutations(
  request: Request,
  response: Response,
  next: NextFunction
): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    next();
    return;
  }

  void acquireBusinessLock(request.auth.businessId)
    .then(release => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        release();
      };
      response.once('finish', finish);
      response.once('close', finish);
      next();
    })
    .catch(next);
}

export function serializeAuthMutations(
  request: Request,
  response: Response,
  next: NextFunction
): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    next();
    return;
  }
  void acquireBusinessLock('__auth_store__')
    .then(release => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        release();
      };
      response.once('finish', finish);
      response.once('close', finish);
      next();
    })
    .catch(next);
}

async function acquireBusinessLock(businessId: string): Promise<() => void> {
  const previous = tails.get(businessId) ?? Promise.resolve();
  let resolveCurrent!: () => void;
  const current = new Promise<void>(resolve => {
    resolveCurrent = resolve;
  });
  const queued = previous.then(() => current);
  tails.set(businessId, queued);
  await previous;

  return () => {
    resolveCurrent();
    if (tails.get(businessId) === queued) {
      void queued.finally(() => {
        if (tails.get(businessId) === queued) tails.delete(businessId);
      });
    }
  };
}
