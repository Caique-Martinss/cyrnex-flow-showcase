import type {
  AuthContext,
  AuthSessionResponse,
  MemberRole
} from './auth.types.js';
import { loadPlatformAdminContext } from '../platform-admin/platformAdmin.repository.js';

interface SupabaseConfig {
  url: string;
  publishableKey: string;
  secretKey: string;
}

interface SupabaseAuthUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: SupabaseAuthUser;
}

interface ProfileRow {
  user_id: string;
  username: string;
  display_name: string;
}

interface MembershipRow {
  business_id: string;
  role: MemberRole;
  display_name: string;
  businesses: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export interface SupabaseAuthState {
  context: AuthContext;
  session: AuthSessionResponse;
}

export function getSupabasePublicConfig(): Pick<SupabaseConfig, 'url' | 'publishableKey'> {
  const url = requiredEnv('SUPABASE_URL').replace(/\/$/, '');
  return {
    url,
    publishableKey: requiredEnv('SUPABASE_PUBLISHABLE_KEY')
  };
}

function getSupabaseAdminConfig(): SupabaseConfig {
  const base = getSupabasePublicConfig();
  return { ...base, secretKey: requiredEnv('SUPABASE_SECRET_KEY') };
}

export async function signInSupabaseWithUsername(
  username: string,
  password: string
): Promise<TokenResponse> {
  const profile = await adminFindProfileByUsername(username);
  if (!profile) throw authError('Usuário ou senha incorretos.', 401);

  const adminUser = await adminGetUser(profile.user_id);
  if (!adminUser.email) throw authError('Usuário ou senha incorretos.', 401);
  return signInWithEmail(adminUser.email, password);
}

export async function registerSupabaseOwner(input: {
  username: string;
  email: string;
  password: string;
  displayName: string;
  businessName: string;
}): Promise<TokenResponse> {
  if (await adminFindProfileByUsername(input.username)) {
    throw authError('Esse nome de usuário já está em uso.', 409);
  }

  const businessSlug = await adminCreateUniqueBusinessSlug(input.businessName);
  const config = getSupabaseAdminConfig();
  const response = await supabaseFetch<SupabaseAuthUser>('/auth/v1/admin/users', {
    method: 'POST',
    admin: true,
    body: {
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        username: input.username,
        display_name: input.displayName,
        scos_account_kind: 'owner_registration',
        business_name: input.businessName,
        business_slug: businessSlug
      }
    }
  }, config);

  if (!response.id) throw authError('Não foi possível criar sua conta.', 500);
  return signInWithEmail(input.email, input.password);
}

export async function refreshSupabaseSession(refreshToken: string): Promise<TokenResponse> {
  return supabaseFetch<TokenResponse>('/auth/v1/token?grant_type=refresh_token', {
    method: 'POST',
    body: { refresh_token: refreshToken }
  });
}

export async function getSupabaseUser(accessToken: string): Promise<SupabaseAuthUser> {
  return supabaseFetch<SupabaseAuthUser>('/auth/v1/user', {
    method: 'GET',
    accessToken
  });
}

export async function signOutSupabase(accessToken: string): Promise<void> {
  await supabaseFetch<unknown>('/auth/v1/logout', {
    method: 'POST',
    accessToken
  }).catch(() => undefined);
}

export async function adminUpdateSupabaseUserPassword(
  userId: string,
  password: string
): Promise<void> {
  await supabaseFetch<SupabaseAuthUser>(
    `/auth/v1/admin/users/${encodeURIComponent(userId)}`,
    {
      method: 'PUT',
      admin: true,
      body: { password }
    },
    getSupabaseAdminConfig()
  );
}

export async function loadSupabaseAuthState(
  accessToken: string,
  preferredBusinessId = ''
): Promise<SupabaseAuthState> {
  const user = await getSupabaseUser(accessToken);
  const [profiles, memberships] = await Promise.all([
    userRest<ProfileRow[]>('/rest/v1/user_profiles', accessToken, {
      select: 'user_id,username,display_name',
      user_id: `eq.${user.id}`,
      limit: '1'
    }),
    userRest<MembershipRow[]>('/rest/v1/business_members', accessToken, {
      select: 'business_id,role,display_name,businesses(id,name,slug)',
      user_id: `eq.${user.id}`,
      active: 'eq.true',
      order: 'created_at.asc'
    })
  ]);

  const profile = profiles[0];
  const validMemberships = memberships.filter(item => item.businesses);
  const selected = validMemberships.find(item => item.business_id === preferredBusinessId)
    ?? validMemberships[0];

  if (!profile || !selected?.businesses) {
    throw authError('Sua conta não possui uma barbearia ativa.', 403);
  }

  const context: AuthContext = {
    userId: user.id,
    username: profile.username,
    email: user.email ?? '',
    businessId: selected.business_id,
    businessName: selected.businesses.name,
    businessSlug: selected.businesses.slug,
    role: selected.role,
    displayName: selected.display_name,
    accessToken
  };

  // A sessão comum informa apenas se esta conta possui acesso de plataforma.
  // A autorização real continua sendo refeita nas rotas /api/platform-admin.
  // O catch mantém login comum compatível antes da migration do Admin ser aplicada.
  const platformAdmin = await loadPlatformAdminContext({
    userId: user.id,
    email: user.email ?? ''
  }).catch(() => null);

  return {
    context,
    session: {
      authenticated: true,
      user: {
        id: user.id,
        username: profile.username,
        email: user.email ?? '',
        displayName: selected.display_name
      },
      business: {
        id: selected.business_id,
        name: selected.businesses.name,
        slug: selected.businesses.slug
      },
      role: selected.role,
      platformAdmin: platformAdmin ? { role: platformAdmin.role } : null,
      businesses: validMemberships.map(item => ({
        id: item.business_id,
        name: item.businesses!.name,
        slug: item.businesses!.slug,
        role: item.role,
        active: true
      }))
    }
  };
}

export async function createSupabaseBusiness(
  accessToken: string,
  businessName: string
): Promise<{ id: string; name: string; slug: string }> {
  const requestedSlug = slugify(businessName);
  const rows = await userRest<Array<{
    id: string;
    name: string;
    slug: string;
    role: MemberRole;
    display_name: string;
  }>>('/rest/v1/rpc/create_business_for_current_user', accessToken, undefined, {
    method: 'POST',
    body: {
      p_business_name: businessName,
      p_requested_slug: requestedSlug
    }
  });
  const created = rows[0];
  if (!created) throw authError('Não foi possível criar a barbearia.', 500);
  return created;
}

async function signInWithEmail(email: string, password: string): Promise<TokenResponse> {
  try {
    return await supabaseFetch<TokenResponse>('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: { email, password }
    });
  } catch (error) {
    const status = getStatus(error);
    if (status === 400 || status === 401) {
      throw authError('Usuário ou senha incorretos.', 401);
    }
    throw error;
  }
}

async function adminFindProfileByUsername(username: string): Promise<ProfileRow | null> {
  const rows = await adminRest<ProfileRow[]>('/rest/v1/user_profiles', {
    select: 'user_id,username,display_name',
    username: `eq.${username}`,
    limit: '1'
  });
  return rows[0] ?? null;
}

async function adminGetUser(userId: string): Promise<SupabaseAuthUser> {
  return supabaseFetch<SupabaseAuthUser>(`/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: 'GET',
    admin: true
  }, getSupabaseAdminConfig());
}

async function adminCreateUniqueBusinessSlug(businessName: string): Promise<string> {
  const base = slugify(businessName);
  const rows = await adminRest<Array<{ slug: string }>>('/rest/v1/businesses', {
    select: 'slug',
    slug: `like.${base}*`
  });
  const used = new Set(rows.map(item => item.slug.toLowerCase()));
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

async function adminRest<T>(path: string, query?: Record<string, string>): Promise<T> {
  return supabaseFetch<T>(withQuery(path, query), { method: 'GET', admin: true }, getSupabaseAdminConfig());
}

async function userRest<T>(
  path: string,
  accessToken: string,
  query?: Record<string, string>,
  options?: { method?: 'GET' | 'POST'; body?: unknown }
): Promise<T> {
  return supabaseFetch<T>(withQuery(path, query), {
    method: options?.method ?? 'GET',
    body: options?.body,
    accessToken
  });
}

async function supabaseFetch<T>(
  path: string,
  options: {
    method: 'GET' | 'POST' | 'PUT';
    body?: unknown;
    accessToken?: string;
    admin?: boolean;
  },
  suppliedConfig?: Partial<SupabaseConfig>
): Promise<T> {
  const publicConfig = getSupabasePublicConfig();
  const config = suppliedConfig ?? publicConfig;
  const key = options.admin
    ? (config as SupabaseConfig).secretKey
    : publicConfig.publishableKey;
  const authorization = options.admin
    ? `Bearer ${(config as SupabaseConfig).secretKey}`
    : options.accessToken
      ? `Bearer ${options.accessToken}`
      : `Bearer ${publicConfig.publishableKey}`;

  const response = await fetch(`${publicConfig.url}${path}`, {
    method: options.method,
    headers: {
      apikey: key,
      Authorization: authorization,
      Accept: 'application/json',
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {})
    },
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {})
  });

  const text = await response.text();
  const payload = text ? safeJson(text) : null;

  if (!response.ok) {
    const message = typeof payload === 'object' && payload && 'msg' in payload
      ? String((payload as { msg?: unknown }).msg ?? 'Falha no Supabase.')
      : typeof payload === 'object' && payload && 'message' in payload
        ? String((payload as { message?: unknown }).message ?? 'Falha no Supabase.')
        : 'Falha na autenticação de produção.';
    throw authError(message, response.status);
  }

  return payload as T;
}

function withQuery(path: string, query?: Record<string, string>): string {
  if (!query) return path;
  const params = new URLSearchParams(query);
  return `${path}?${params.toString()}`;
}

function safeJson(value: string): unknown {
  try { return JSON.parse(value); } catch { return value; }
}

function requiredEnv(name: string): string {
  const value = (process.env[name] ?? '').trim();
  if (!value) throw new Error(`${name} não configurado para o ambiente Supabase.`);
  return value;
}

function authError(message: string, status: number): Error & { status: number } {
  return Object.assign(new Error(message), { status });
}

function getStatus(error: unknown): number {
  return typeof error === 'object' && error !== null && 'status' in error
    ? Number((error as { status?: unknown }).status ?? 0)
    : 0;
}

export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'barbearia';
}
