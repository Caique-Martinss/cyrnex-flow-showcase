import type { AuthContext, MemberRole } from '../auth/auth.types.js';
import { readAuthStore } from '../auth/auth.store.js';
import { usesSupabaseAuth } from '../auth/auth.provider.js';
import { loadSupabaseAuthState } from '../auth/supabaseAuth.service.js';

export interface PublicStaffContextResponse {
  staff: boolean;
  role?: MemberRole;
  canConfigure?: boolean;
  businessId?: string;
  businessName?: string;
}

export async function loadPublicStaffContext(
  auth: AuthContext | undefined,
  slug: string
): Promise<PublicStaffContextResponse> {
  if (!auth || !slug) return { staff: false };

  const membership = usesSupabaseAuth()
    ? await findSupabaseMembership(auth, slug)
    : await findLocalMembership(auth.userId, slug);

  if (!membership) return { staff: false };

  return {
    staff: true,
    role: membership.role,
    canConfigure: membership.role === 'owner' || membership.role === 'manager',
    businessId: membership.id,
    businessName: membership.name
  };
}

async function findSupabaseMembership(auth: AuthContext, slug: string) {
  if (!auth.accessToken) return null;
  const state = await loadSupabaseAuthState(auth.accessToken, auth.businessId);
  const match = state.session.businesses.find(item => (
    item.active && item.slug.toLocaleLowerCase('pt-BR') === slug
  ));
  return match ? { id: match.id, role: match.role, name: match.name } : null;
}

async function findLocalMembership(userId: string, slug: string) {
  const store = await readAuthStore();
  const account = store.accounts.find(item => item.id === userId);
  const match = account?.memberships.find(item => (
    item.active && item.businessSlug.toLocaleLowerCase('pt-BR') === slug
  ));
  return match ? { id: match.businessId, role: match.role, name: match.businessName } : null;
}
