import type { SubscriptionStatus } from '../subscription/subscription.types.js';

export type PlatformAdminRole = 'super_admin' | 'support';

export interface PlatformAdminContext {
  userId: string;
  username: string;
  email: string;
  displayName: string;
  role: PlatformAdminRole;
}

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

export type SubscriptionAdminAction =
  | 'update_settings'
  | 'start_trial'
  | 'activate'
  | 'mark_past_due'
  | 'suspend'
  | 'cancel';
