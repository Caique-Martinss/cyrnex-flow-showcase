import { serverSupabaseRest } from '../../database/postgres/restClient.js';
import { mapSubscription } from '../subscription/subscription.repository.js';
import type { SubscriptionStatus } from '../subscription/subscription.types.js';
import type {
  PlatformAdminContext,
  PlatformAdminRole,
  PlatformBusinessListItem,
  SubscriptionAdminAction
} from './platformAdmin.types.js';

interface PlatformAdminRow {
  user_id: string;
  role: PlatformAdminRole;
  active: boolean;
}

interface ProfileRow {
  user_id: string;
  username: string;
  display_name: string;
}

interface BusinessRow {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

interface MemberRow {
  business_id: string;
  user_id: string;
  role: string;
  display_name: string;
  active: boolean;
}


interface AuditRow {
  id: string;
  actor_user_id: string | null;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface SubscriptionRow {
  business_id: string;
  plan_code: string;
  status: SubscriptionStatus;
  trial_ends_at: string | null;
  current_period_end: string | null;
  grace_period_end: string | null;
  suspended_at: string | null;
  cancelled_at: string | null;
  retention_until: string | null;
  admin_note: string | null;
  updated_at: string;
}

export async function loadPlatformAdminContext(input: {
  userId: string;
  email: string;
}): Promise<PlatformAdminContext | null> {
  const [admins, profiles] = await Promise.all([
    serverSupabaseRest<PlatformAdminRow[]>('/rest/v1/platform_admins', {
      query: {
        select: 'user_id,role,active',
        user_id: `eq.${input.userId}`,
        active: 'eq.true',
        limit: '1'
      }
    }),
    serverSupabaseRest<ProfileRow[]>('/rest/v1/user_profiles', {
      query: {
        select: 'user_id,username,display_name',
        user_id: `eq.${input.userId}`,
        limit: '1'
      }
    })
  ]);
  const admin = admins[0];
  const profile = profiles[0];
  if (!admin || !profile) return null;
  return {
    userId: input.userId,
    username: profile.username,
    email: input.email,
    displayName: profile.display_name,
    role: admin.role
  };
}

export async function listPlatformBusinesses(search = ''): Promise<PlatformBusinessListItem[]> {
  const businessQuery: Record<string, string> = {
    select: 'id,name,slug,created_at',
    order: 'created_at.desc',
    limit: '200'
  };
  if (search.trim()) {
    const safe = search.trim().replace(/[,%()]/g, '');
    businessQuery.or = `(name.ilike.*${safe}*,slug.ilike.*${safe}*)`;
  }

  const businesses = await serverSupabaseRest<BusinessRow[]>('/rest/v1/businesses', {
    query: businessQuery
  });
  if (!businesses.length) return [];

  const ids = businesses.map(item => item.id);
  const inFilter = `in.(${ids.join(',')})`;
  const [subscriptions, members] = await Promise.all([
    serverSupabaseRest<SubscriptionRow[]>('/rest/v1/business_subscriptions', {
      query: { select: '*', business_id: inFilter }
    }),
    serverSupabaseRest<MemberRow[]>('/rest/v1/business_members', {
      query: {
        select: 'business_id,user_id,role,display_name,active',
        business_id: inFilter,
        active: 'eq.true'
      }
    })
  ]);
  const subscriptionByBusiness = new Map(
    subscriptions.map(item => [item.business_id, mapSubscription(item)])
  );
  const memberCount = new Map<string, number>();
  members.forEach(member => {
    memberCount.set(member.business_id, (memberCount.get(member.business_id) ?? 0) + 1);
  });

  return businesses.map(business => {
    const subscription = subscriptionByBusiness.get(business.id);
    if (!subscription) throw new Error(`Assinatura ausente para ${business.id}.`);
    return {
      id: business.id,
      name: business.name,
      slug: business.slug,
      createdAt: business.created_at,
      memberCount: memberCount.get(business.id) ?? 0,
      subscription: {
        planCode: subscription.planCode,
        status: subscription.status,
        effectiveStatus: subscription.effectiveStatus,
        allowed: subscription.allowed,
        trialEndsAt: subscription.trialEndsAt,
        currentPeriodEnd: subscription.currentPeriodEnd,
        gracePeriodEnd: subscription.gracePeriodEnd,
        retentionUntil: subscription.retentionUntil,
        updatedAt: subscription.updatedAt
      }
    };
  });
}

export async function getPlatformBusinessDetails(businessId: string) {
  const [businesses, members, subscriptions, auditLogs] = await Promise.all([
    serverSupabaseRest<BusinessRow[]>('/rest/v1/businesses', {
      query: { select: 'id,name,slug,created_at', id: `eq.${businessId}`, limit: '1' }
    }),
    serverSupabaseRest<MemberRow[]>('/rest/v1/business_members', {
      query: {
        select: 'business_id,user_id,role,display_name,active',
        business_id: `eq.${businessId}`,
        order: 'created_at.asc'
      }
    }),
    serverSupabaseRest<SubscriptionRow[]>('/rest/v1/business_subscriptions', {
      query: { select: '*', business_id: `eq.${businessId}`, limit: '1' }
    }),
    serverSupabaseRest<AuditRow[]>('/rest/v1/platform_audit_logs', {
      query: {
        select: 'id,actor_user_id,action,metadata,created_at',
        business_id: `eq.${businessId}`,
        order: 'created_at.desc',
        limit: '20'
      }
    })
  ]);
  const business = businesses[0];
  const subscription = subscriptions[0];
  if (!business || !subscription) {
    throw Object.assign(new Error('Empresa não encontrada.'), { status: 404 });
  }
  return {
    business: {
      id: business.id,
      name: business.name,
      slug: business.slug,
      createdAt: business.created_at
    },
    subscription: mapSubscription(subscription),
    members: members.map(member => ({
      userId: member.user_id,
      role: member.role,
      displayName: member.display_name,
      active: member.active
    })),
    auditLogs: auditLogs.map(log => ({
      id: log.id,
      actorUserId: log.actor_user_id,
      action: log.action,
      metadata: log.metadata,
      createdAt: log.created_at
    }))
  };
}

export async function updatePlatformSubscription(input: {
  actorUserId: string;
  businessId: string;
  action: SubscriptionAdminAction;
  reason?: string;
  planCode?: string;
  trialDays?: number;
  graceDays?: number;
  retentionDays?: number;
  currentPeriodEnd?: string | null;
}) {
  const before = await getPlatformBusinessDetails(input.businessId);
  const now = new Date();
  const patch = buildSubscriptionPatch(input, now);
  const rows = await serverSupabaseRest<SubscriptionRow[]>('/rest/v1/business_subscriptions', {
    method: 'PATCH',
    query: { business_id: `eq.${input.businessId}` },
    body: {
      ...patch,
      updated_by: input.actorUserId
    },
    prefer: 'return=representation'
  });
  const updated = rows[0];
  if (!updated) throw new Error('Não foi possível atualizar a assinatura.');

  await serverSupabaseRest('/rest/v1/platform_audit_logs', {
    method: 'POST',
    body: {
      actor_user_id: input.actorUserId,
      business_id: input.businessId,
      action: `subscription.${input.action}`,
      metadata: {
        reason: input.reason ?? null,
        previousStatus: before.subscription.status,
        nextStatus: updated.status,
        planCode: updated.plan_code
      }
    }
  });
  return mapSubscription(updated);
}

function buildSubscriptionPatch(
  input: Parameters<typeof updatePlatformSubscription>[0],
  now: Date
): Record<string, unknown> {
  const reason = input.reason?.trim() || null;
  const base = {
    admin_note: reason,
    ...(input.planCode?.trim() ? { plan_code: input.planCode.trim().slice(0, 40) } : {})
  };

  if (input.action === 'update_settings') {
    return {
      ...base,
      current_period_end: validDateOrNull(input.currentPeriodEnd)
    };
  }

  if (input.action === 'start_trial') {
    const days = clampDays(input.trialDays, 14, 1, 90);
    return {
      ...base,
      status: 'trial',
      trial_ends_at: addDays(now, days),
      grace_period_end: null,
      suspended_at: null,
      cancelled_at: null,
      retention_until: null
    };
  }
  if (input.action === 'activate') {
    return {
      ...base,
      status: 'active',
      trial_ends_at: null,
      current_period_end: validDateOrNull(input.currentPeriodEnd),
      grace_period_end: null,
      suspended_at: null,
      cancelled_at: null,
      retention_until: null
    };
  }
  if (input.action === 'mark_past_due') {
    const days = clampDays(input.graceDays, 5, 0, 30);
    return {
      ...base,
      status: 'past_due',
      grace_period_end: addDays(now, days),
      suspended_at: null
    };
  }
  if (input.action === 'suspend') {
    if (!reason) throw Object.assign(new Error('Informe o motivo da suspensão.'), { status: 400 });
    return {
      ...base,
      status: 'suspended',
      grace_period_end: null,
      suspended_at: now.toISOString()
    };
  }
  if (!reason) throw Object.assign(new Error('Informe o motivo do cancelamento.'), { status: 400 });
  const retentionDays = clampDays(input.retentionDays, 60, 30, 180);
  return {
    ...base,
    status: 'cancelled',
    grace_period_end: null,
    suspended_at: null,
    cancelled_at: now.toISOString(),
    retention_until: addDays(now, retentionDays)
  };
}

function addDays(date: Date, days: number): string {
  return new Date(date.getTime() + days * 86_400_000).toISOString();
}

function clampDays(value: number | undefined, fallback: number, min: number, max: number): number {
  const numeric = Number(value ?? fallback);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, Math.round(numeric)));
}

function validDateOrNull(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
