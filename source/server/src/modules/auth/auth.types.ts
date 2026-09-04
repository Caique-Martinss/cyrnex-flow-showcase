export type MemberRole = 'owner' | 'manager' | 'professional' | 'receptionist';

export interface BusinessMembership {
  businessId: string;
  businessName: string;
  businessSlug: string;
  role: MemberRole;
  displayName: string;
  active: boolean;
}

export interface LocalAccount {
  id: string;
  username: string;
  normalizedUsername: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  memberships: BusinessMembership[];
  createdAt: string;
  updatedAt: string;
  lastBusinessId?: string;
}

export interface LocalSession {
  id: string;
  tokenHash: string;
  userId: string;
  businessId: string;
  expiresAt: string;
  createdAt: string;
  lastSeenAt: string;
}

export interface PasswordRecoveryChallenge {
  id: string;
  accountId: string;
  email: string;
  codeHash: string;
  codeSalt?: string;
  resetTokenHash: string | null;
  createdAt: string;
  expiresAt: string;
  verifiedAt: string | null;
  usedAt: string | null;
  attempts: number;
}

export interface AuthStore {
  accounts: LocalAccount[];
  sessions: LocalSession[];
  passwordRecoveries: PasswordRecoveryChallenge[];
}

export interface AuthContext {
  userId: string;
  username: string;
  email: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  role: MemberRole;
  displayName: string;
  /** JWT Supabase usado somente no backend para consultas protegidas por RLS. */
  accessToken?: string;
}

export interface AuthSessionResponse {
  authenticated: true;
  user: {
    id: string;
    username: string;
    email: string;
    displayName: string;
  };
  business: {
    id: string;
    name: string;
    slug: string;
  };
  role: MemberRole;
  platformAdmin: { role: 'super_admin' | 'support' } | null;
  businesses: Array<{
    id: string;
    name: string;
    slug: string;
    role: MemberRole;
    active: boolean;
  }>;
}
