import { serverSupabaseRest } from '../../database/postgres/restClient.js';
import { usesSupabaseAuth } from '../auth/auth.provider.js';
import type { BusinessSubscription, SubscriptionStatus } from './subscription.types.js';

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

export async function loadBusinessSubscription(
  businessId: string
): Promise<BusinessSubscription> {
  if (!usesSupabaseAuth()) return localActiveSubscription(businessId);

  const rows = await serverSupabaseRest<SubscriptionRow[]>(
    '/rest/v1/business_subscriptions',
    {
      query: {
        select: '*',
        business_id: `eq.${businessId}`,
        limit: '1'
      }
    }
  );
  if (!rows[0]) {
    throw Object.assign(new Error('Assinatura da empresa não foi inicializada.'), { status: 503 });
  }
  return mapSubscription(rows[0]);
}

export async function loadBusinessSubscriptionBySlug(
  slug: string
): Promise<BusinessSubscription | null> {
  if (!usesSupabaseAuth()) return null;

  const businesses = await serverSupabaseRest<Array<{ id: string }>>('/rest/v1/businesses', {
    query: {
      select: 'id',
      slug: `eq.${slug}`,
      limit: '1'
    }
  });
  if (!businesses[0]) return null;
  return loadBusinessSubscription(businesses[0].id);
}

export function mapSubscription(row: SubscriptionRow): BusinessSubscription {
  const now = Date.now();
  const trialExpired = row.status === 'trial'
    && Boolean(row.trial_ends_at)
    && new Date(row.trial_ends_at!).getTime() <= now;
  const graceExpired = row.status === 'past_due'
    && Boolean(row.grace_period_end)
    && new Date(row.grace_period_end!).getTime() <= now;
  const effectiveStatus = trialExpired
    ? 'trial_expired'
    : graceExpired
      ? 'grace_expired'
      : row.status;
  const allowed = row.status === 'active'
    || (row.status === 'trial' && !trialExpired)
    || (row.status === 'past_due' && !graceExpired);

  return {
    businessId: row.business_id,
    planCode: row.plan_code,
    status: row.status,
    effectiveStatus,
    allowed,
    trialEndsAt: row.trial_ends_at,
    currentPeriodEnd: row.current_period_end,
    gracePeriodEnd: row.grace_period_end,
    suspendedAt: row.suspended_at,
    cancelledAt: row.cancelled_at,
    retentionUntil: row.retention_until,
    adminNote: row.admin_note,
    updatedAt: row.updated_at
  };
}

function localActiveSubscription(businessId: string): BusinessSubscription {
  return {
    businessId,
    planCode: 'local-development',
    status: 'active',
    effectiveStatus: 'active',
    allowed: true,
    trialEndsAt: null,
    currentPeriodEnd: null,
    gracePeriodEnd: null,
    suspendedAt: null,
    cancelledAt: null,
    retentionUntil: null,
    adminNote: null,
    updatedAt: new Date().toISOString()
  };
}
