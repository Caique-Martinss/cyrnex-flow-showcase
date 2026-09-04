export interface SupabaseRestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  query?: Record<string, string>;
  body?: unknown;
  prefer?: string;
}

export interface SupabaseRestError extends Error {
  status: number;
  code?: string;
  details?: string;
}

export async function serverSupabaseRest<T>(
  path: string,
  options: SupabaseRestOptions = {}
): Promise<T> {
  const url = requiredEnv('SUPABASE_URL').replace(/\/$/, '');
  const secretKey = requiredEnv('SUPABASE_SECRET_KEY');
  const query = options.query ? `?${new URLSearchParams(options.query)}` : '';
  const response = await fetch(`${url}${path}${query}`, {
    method: options.method ?? 'GET',
    headers: {
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
      Accept: 'application/json',
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(options.prefer ? { Prefer: options.prefer } : {})
    },
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {})
  });

  const raw = await response.text();
  const payload = raw ? safeJson(raw) : null;
  if (!response.ok) {
    const body = typeof payload === 'object' && payload ? payload as Record<string, unknown> : {};
    const message = String(body.message ?? body.msg ?? 'Falha ao acessar o banco de produção.');
    const error = createRestError(message, response.status);
    error.code = typeof body.code === 'string' ? body.code : undefined;
    error.details = typeof body.details === 'string' ? body.details : undefined;
    throw error;
  }
  return payload as T;
}

export async function userSupabaseRest<T>(
  accessToken: string,
  path: string,
  options: SupabaseRestOptions = {}
): Promise<T> {
  if (!accessToken) {
    throw createRestError('Sessão de produção inválida.', 401);
  }

  const url = requiredEnv('SUPABASE_URL').replace(/\/$/, '');
  const publishableKey = requiredEnv('SUPABASE_PUBLISHABLE_KEY');
  const query = options.query ? `?${new URLSearchParams(options.query)}` : '';
  const response = await fetch(`${url}${path}${query}`, {
    method: options.method ?? 'GET',
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(options.prefer ? { Prefer: options.prefer } : {})
    },
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {})
  });

  const raw = await response.text();
  const payload = raw ? safeJson(raw) : null;

  if (!response.ok) {
    const body = typeof payload === 'object' && payload ? payload as Record<string, unknown> : {};
    const message = String(body.message ?? body.msg ?? 'Falha ao acessar o banco de produção.');
    const error = createRestError(message, response.status);
    error.code = typeof body.code === 'string' ? body.code : undefined;
    error.details = typeof body.details === 'string' ? body.details : undefined;
    throw error;
  }

  return payload as T;
}

export function requireProductionAccessToken(accessToken: string | undefined): string {
  if (!accessToken) throw createRestError('Sessão de produção inválida.', 401);
  return accessToken;
}

export function isSupabaseRestError(error: unknown): error is SupabaseRestError {
  return error instanceof Error && 'status' in error;
}

function createRestError(message: string, status: number): SupabaseRestError {
  return Object.assign(new Error(message), { status }) as SupabaseRestError;
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function requiredEnv(name: string): string {
  const value = (process.env[name] ?? '').trim();
  if (!value) throw new Error(`${name} não configurado para o ambiente Supabase.`);
  return value;
}
