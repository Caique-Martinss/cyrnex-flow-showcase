import type {
  BusinessSubscription,
  PlatformAdminSession,
  SubscriptionStatus
} from '../domain/subscription.types';
import { api } from './http';

export interface PlatformBusinessListItem {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  memberCount: number;
  subscription: {
    planCode: string;
    status: SubscriptionStatus;
    effectiveStatus: string;
    allowed: boolean;
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
    gracePeriodEnd: string | null;
    retentionUntil: string | null;
    updatedAt: string;
  };
}

export interface PlatformOverview {
  totalBusinesses: number;
  statusCounts: Record<SubscriptionStatus, number>;
  businesses: PlatformBusinessListItem[];
}

export interface PlatformBusinessDetails {
  business: {
    id: string;
    name: string;
    slug: string;
    createdAt: string;
  };
  subscription: BusinessSubscription;
  members: Array<{
    userId: string;
    role: string;
    displayName: string;
    active: boolean;
  }>;
  auditLogs: Array<{
    id: string;
    actorUserId: string | null;
    action: string;
    metadata: Record<string, unknown>;
    createdAt: string;
  }>;
}

export type PlatformLogSeverity = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export interface PlatformSystemLog {
  id: string;
  severity: PlatformLogSeverity;
  category: string;
  source: string;
  message: string;
  businessId: string | null;
  requestId: string | null;
  route: string | null;
  httpStatus: number | null;
  durationMs: number | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface PlatformSystemHealth {
  overallStatus: 'operational' | 'attention' | 'degraded';
  checkedAt: string;
  api: {
    status: 'operational';
    uptimeSeconds: number;
    startedAt: string;
    nodeVersion: string;
    environment: string;
    memoryMb: { rss: number; heapUsed: number; heapTotal: number };
  };
  database: { status: 'operational' | 'down'; latencyMs: number | null; message?: string };
  storage: { status: 'operational' | 'down'; latencyMs: number | null; message?: string };
  incidents24h: {
    critical: number;
    errors: number;
    warnings: number;
    slowRequests: number;
    apiStarts: number;
  };
  lastCritical: PlatformSystemLog | null;
  externalMonitor: {
    configured: boolean;
    statusUrl: string | null;
    note: string;
  };
}

export interface PlatformAuditLog {
  id: string;
  actorUserId: string | null;
  businessId: string | null;
  businessName: string | null;
  businessSlug: string | null;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface PlatformDeletionReceipt {
  deleted: boolean;
  businessId: string;
  businessName: string;
  businessSlug: string;
  receiptId: string;
  deletedAt: string;
  storageCleanup: {
    status: 'complete' | 'incomplete';
    buckets: Record<string, { deletedObjects: number }>;
    totalDeletedObjects: number;
    error?: string;
  };
}

export async function platformAdminLogin(input: {
  username: string;
  password: string;
  rememberMe: boolean;
}): Promise<PlatformAdminSession> {
  const response = await api.post<PlatformAdminSession>('/platform-admin/auth/login', input);
  return response.data;
}

export async function getPlatformAdminSession(): Promise<PlatformAdminSession> {
  const response = await api.get<PlatformAdminSession>('/platform-admin/auth/me');
  return response.data;
}

export async function platformAdminLogout(): Promise<void> {
  await api.post('/platform-admin/auth/logout');
}

export async function getPlatformOverview(search = ''): Promise<PlatformOverview> {
  const response = await api.get<PlatformOverview>('/platform-admin/overview', {
    params: search ? { search } : undefined
  });
  return response.data;
}

export async function getPlatformBusinessDetails(
  businessId: string
): Promise<PlatformBusinessDetails> {
  const response = await api.get<PlatformBusinessDetails>(`/platform-admin/businesses/${businessId}`);
  return response.data;
}

export async function updatePlatformBusinessSubscription(
  businessId: string,
  input: {
    action: 'update_settings' | 'start_trial' | 'activate' | 'mark_past_due' | 'suspend' | 'cancel';
    reason?: string;
    planCode?: string;
    trialDays?: number;
    graceDays?: number;
    retentionDays?: number;
    currentPeriodEnd?: string | null;
  }
): Promise<BusinessSubscription> {
  const response = await api.patch<BusinessSubscription>(
    `/platform-admin/businesses/${businessId}/subscription`,
    input
  );
  return response.data;
}

export async function deletePlatformBusiness(
  businessId: string,
  input: { reason: string; confirmation: string }
): Promise<PlatformDeletionReceipt> {
  const response = await api.delete<PlatformDeletionReceipt>(`/platform-admin/businesses/${businessId}`, {
    data: input
  });
  return response.data;
}

export async function getPlatformSystemHealth(): Promise<PlatformSystemHealth> {
  const response = await api.get<PlatformSystemHealth>('/platform-admin/observability/health');
  return response.data;
}

export async function getPlatformSystemLogs(input: {
  severity?: string;
  category?: string;
  source?: string;
  search?: string;
  limit?: number;
} = {}): Promise<{ logs: PlatformSystemLog[]; categories: string[]; sources: string[] }> {
  const response = await api.get('/platform-admin/observability/logs', { params: input });
  return response.data;
}

export async function getPlatformAuditLogs(search = ''): Promise<PlatformAuditLog[]> {
  const response = await api.get<PlatformAuditLog[]>('/platform-admin/audit', {
    params: search ? { search } : undefined
  });
  return response.data;
}
