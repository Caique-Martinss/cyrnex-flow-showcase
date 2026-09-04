import { serverSupabaseRest } from '../../database/postgres/restClient.js';

export type PlatformLogSeverity = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export interface PlatformSystemLogInput {
  severity: PlatformLogSeverity;
  category: string;
  source: string;
  message: string;
  businessId?: string | null;
  requestId?: string | null;
  route?: string | null;
  httpStatus?: number | null;
  durationMs?: number | null;
  metadata?: Record<string, unknown>;
}

export async function writePlatformSystemLog(input: PlatformSystemLogInput): Promise<void> {
  try {
    await serverSupabaseRest('/rest/v1/platform_system_logs', {
      method: 'POST',
      body: {
        severity: input.severity,
        category: safeText(input.category, 80),
        source: safeText(input.source, 80),
        message: safeText(input.message, 800),
        business_id: input.businessId ?? null,
        request_id: input.requestId ? safeText(input.requestId, 120) : null,
        route: input.route ? safeText(input.route, 500) : null,
        http_status: input.httpStatus ?? null,
        duration_ms: input.durationMs ?? null,
        metadata: sanitizeMetadata(input.metadata ?? {})
      }
    });
  } catch (error) {
    // Observability must never take the product down if the log table/migration is unavailable.
    console.error('[CYRNEX observability] Falha ao persistir log:', error);
  }
}

function sanitizeMetadata(value: Record<string, unknown>): Record<string, unknown> {
  const blocked = /(password|secret|token|authorization|cookie|session|service[_-]?role|apikey)/i;
  const output: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value).slice(0, 30)) {
    if (blocked.test(key)) {
      output[key] = '[REDACTED]';
      continue;
    }
    output[key] = sanitizeValue(raw, 0);
  }
  return output;
}

function sanitizeValue(value: unknown, depth: number): unknown {
  if (depth > 3) return '[TRUNCATED]';
  if (typeof value === 'string') return safeText(value, 1200);
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) return value;
  if (Array.isArray(value)) return value.slice(0, 20).map(item => sanitizeValue(item, depth + 1));
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const blocked = /(password|secret|token|authorization|cookie|session|service[_-]?role|apikey)/i;
    return Object.fromEntries(
      Object.entries(record).slice(0, 30).map(([key, child]) => [
        key,
        blocked.test(key) ? '[REDACTED]' : sanitizeValue(child, depth + 1)
      ])
    );
  }
  return String(value);
}

function safeText(value: string, max: number): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, max);
}
