import { serverSupabaseRest } from '../../database/postgres/restClient.js';
import { checkPlatformStorageHealth } from '../../database/postgres/platformStorageAdmin.js';
import type { PlatformLogSeverity } from './platformSystemLog.js';

interface SystemLogRow {
  id: string;
  severity: PlatformLogSeverity;
  category: string;
  source: string;
  message: string;
  business_id: string | null;
  request_id: string | null;
  route: string | null;
  http_status: number | null;
  duration_ms: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface AuditRow {
  id: string;
  actor_user_id: string | null;
  business_id: string | null;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface BusinessNameRow {
  id: string;
  name: string;
  slug: string;
}

const processStartedAt = new Date(Date.now() - process.uptime() * 1000).toISOString();

export async function getPlatformSystemHealth() {
  const databaseStarted = performance.now();
  let database: { status: 'operational' | 'down'; latencyMs: number | null; message?: string };
  try {
    await serverSupabaseRest('/rest/v1/businesses', {
      query: { select: 'id', limit: '1' }
    });
    database = { status: 'operational', latencyMs: Math.round(performance.now() - databaseStarted) };
  } catch (error) {
    database = {
      status: 'down',
      latencyMs: null,
      message: error instanceof Error ? error.message : 'Falha no banco.'
    };
  }

  let storage: { status: 'operational' | 'down'; latencyMs: number | null; message?: string };
  try {
    const result = await checkPlatformStorageHealth();
    storage = { status: 'operational', latencyMs: result.latencyMs };
  } catch (error) {
    storage = {
      status: 'down',
      latencyMs: null,
      message: error instanceof Error ? error.message : 'Falha no Storage.'
    };
  }

  const since24h = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
  let recentLogs: SystemLogRow[] = [];
  try {
    recentLogs = await serverSupabaseRest<SystemLogRow[]>('/rest/v1/platform_system_logs', {
      query: {
        select: '*',
        created_at: `gte.${since24h}`,
        order: 'created_at.desc',
        limit: '500'
      }
    });
  } catch {
    recentLogs = [];
  }

  const memory = process.memoryUsage();
  const critical24h = recentLogs.filter(item => item.severity === 'critical').length;
  const errors24h = recentLogs.filter(item => item.severity === 'error').length;
  const warnings24h = recentLogs.filter(item => item.severity === 'warn').length;
  const slowRequests24h = recentLogs.filter(item => item.category === 'slow_request').length;
  const restarts24h = recentLogs.filter(item => item.category === 'lifecycle').length;
  const lastCritical = recentLogs.find(item => item.severity === 'critical') ?? null;
  const overallStatus = database.status === 'down' || storage.status === 'down'
    ? 'degraded'
    : critical24h > 0
      ? 'attention'
      : 'operational';

  return {
    overallStatus,
    checkedAt: new Date().toISOString(),
    api: {
      status: 'operational',
      uptimeSeconds: Math.round(process.uptime()),
      startedAt: processStartedAt,
      nodeVersion: process.version,
      environment: process.env.NODE_ENV ?? 'development',
      memoryMb: {
        rss: bytesToMb(memory.rss),
        heapUsed: bytesToMb(memory.heapUsed),
        heapTotal: bytesToMb(memory.heapTotal)
      }
    },
    database,
    storage,
    incidents24h: {
      critical: critical24h,
      errors: errors24h,
      warnings: warnings24h,
      slowRequests: slowRequests24h,
      apiStarts: restarts24h
    },
    lastCritical: lastCritical ? mapSystemLog(lastCritical) : null,
    externalMonitor: {
      configured: Boolean((process.env.CYRNEX_EXTERNAL_STATUS_URL ?? '').trim()),
      statusUrl: (process.env.CYRNEX_EXTERNAL_STATUS_URL ?? '').trim() || null,
      note: (
        'Quedas totais da API precisam de monitor externo porque um servidor offline '
        + 'não consegue registrar a própria indisponibilidade.'
      )
    }
  };
}

export async function listPlatformSystemLogs(input: {
  severity?: string;
  category?: string;
  source?: string;
  search?: string;
  limit?: number;
}) {
  const query: Record<string, string> = {
    select: '*',
    order: 'created_at.desc',
    limit: String(Math.min(250, Math.max(1, input.limit ?? 120)))
  };
  const validSeverities = new Set(['debug', 'info', 'warn', 'error', 'critical']);
  if (input.severity && validSeverities.has(input.severity)) query.severity = `eq.${input.severity}`;
  if (input.category?.trim()) query.category = `eq.${safeFilter(input.category)}`;
  if (input.source?.trim()) query.source = `eq.${safeFilter(input.source)}`;
  if (input.search?.trim()) {
    const safe = safeFilter(input.search);
    query.or = `(message.ilike.*${safe}*,category.ilike.*${safe}*,source.ilike.*${safe}*,route.ilike.*${safe}*)`;
  }

  const rows = await serverSupabaseRest<SystemLogRow[]>('/rest/v1/platform_system_logs', { query });
  return {
    logs: rows.map(mapSystemLog),
    categories: unique(rows.map(item => item.category)),
    sources: unique(rows.map(item => item.source))
  };
}

export async function listPlatformAuditLogs(input: { search?: string; limit?: number }) {
  const rows = await serverSupabaseRest<AuditRow[]>('/rest/v1/platform_audit_logs', {
    query: {
      select: 'id,actor_user_id,business_id,action,metadata,created_at',
      order: 'created_at.desc',
      limit: String(Math.min(250, Math.max(1, input.limit ?? 100)))
    }
  });

  const ids = unique(rows.map(item => item.business_id).filter((value): value is string => Boolean(value)));
  const businessMap = new Map<string, BusinessNameRow>();
  if (ids.length) {
    const businesses = await serverSupabaseRest<BusinessNameRow[]>('/rest/v1/businesses', {
      query: {
        select: 'id,name,slug',
        id: `in.(${ids.join(',')})`
      }
    });
    businesses.forEach(item => businessMap.set(item.id, item));
  }

  const search = input.search?.trim().toLocaleLowerCase('pt-BR') ?? '';
  const mapped = rows.map(row => {
    const business = row.business_id ? businessMap.get(row.business_id) : undefined;
    const metadataBusinessName = typeof row.metadata.businessName === 'string'
      ? row.metadata.businessName
      : null;
    const metadataBusinessSlug = typeof row.metadata.businessSlug === 'string'
      ? row.metadata.businessSlug
      : null;
    return {
      id: row.id,
      actorUserId: row.actor_user_id,
      businessId: row.business_id,
      businessName: business?.name ?? metadataBusinessName,
      businessSlug: business?.slug ?? metadataBusinessSlug,
      action: row.action,
      metadata: row.metadata,
      createdAt: row.created_at
    };
  });

  return search
    ? mapped.filter(item => JSON.stringify(item).toLocaleLowerCase('pt-BR').includes(search))
    : mapped;
}

function mapSystemLog(row: SystemLogRow) {
  return {
    id: row.id,
    severity: row.severity,
    category: row.category,
    source: row.source,
    message: row.message,
    businessId: row.business_id,
    requestId: row.request_id,
    route: row.route,
    httpStatus: row.http_status,
    durationMs: row.duration_ms,
    metadata: row.metadata,
    createdAt: row.created_at
  };
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function safeFilter(value: string): string {
  return value.trim().replace(/[,%()]/g, '').slice(0, 120);
}

function bytesToMb(value: number): number {
  return Math.round(value / 1024 / 1024 * 10) / 10;
}
