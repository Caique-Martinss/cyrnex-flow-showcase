import { serverSupabaseRest } from '../../database/postgres/restClient.js';
import { checkPlatformStorageHealth } from '../../database/postgres/platformStorageAdmin.js';

export interface RuntimeDependencyStatus {
  status: 'operational' | 'down';
  latencyMs: number | null;
  message?: string;
}

export interface RuntimeReadiness {
  status: 'ready' | 'degraded';
  checkedAt: string;
  release: string;
  database: RuntimeDependencyStatus;
  storage: RuntimeDependencyStatus;
}

export async function checkRuntimeReadiness(): Promise<RuntimeReadiness> {
  const database = await checkDatabase();
  const storage = await checkStorage();
  return {
    status: database.status === 'operational' && storage.status === 'operational' ? 'ready' : 'degraded',
    checkedAt: new Date().toISOString(),
    release: (process.env.CYRNEX_RELEASE ?? 'development').trim() || 'development',
    database,
    storage
  };
}

async function checkDatabase(): Promise<RuntimeDependencyStatus> {
  const startedAt = performance.now();
  try {
    await serverSupabaseRest('/rest/v1/businesses', {
      query: { select: 'id', limit: '1' }
    });
    return {
      status: 'operational',
      latencyMs: Math.round(performance.now() - startedAt)
    };
  } catch (error) {
    return {
      status: 'down',
      latencyMs: null,
      message: safeMessage(error, 'Banco indisponível.')
    };
  }
}

async function checkStorage(): Promise<RuntimeDependencyStatus> {
  try {
    const result = await checkPlatformStorageHealth();
    return { status: 'operational', latencyMs: result.latencyMs };
  } catch (error) {
    return {
      status: 'down',
      latencyMs: null,
      message: safeMessage(error, 'Storage indisponível.')
    };
  }
}

function safeMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  return error.message
    .replace(/eyJ[a-zA-Z0-9._-]+/g, '[token-redacted]')
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
    .slice(0, 240);
}
