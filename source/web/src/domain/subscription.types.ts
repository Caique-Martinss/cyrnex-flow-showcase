export type SubscriptionStatus =
  | 'trial'
  | 'active'
  | 'past_due'
  | 'suspended'
  | 'cancelled';

export interface BusinessSubscription {
  businessId: string;
  planCode: string;
  status: SubscriptionStatus;
  effectiveStatus: SubscriptionStatus | 'trial_expired' | 'grace_expired';
  allowed: boolean;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  gracePeriodEnd: string | null;
  suspendedAt: string | null;
  cancelledAt: string | null;
  retentionUntil: string | null;
  adminNote: string | null;
  updatedAt: string;
}

export interface PlatformAdminSession {
  authenticated: true;
  admin: {
    userId: string;
    username: string;
    email: string;
    displayName: string;
    role: 'super_admin' | 'support';
  };
}
