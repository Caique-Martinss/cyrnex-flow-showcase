export type AuthProvider = 'local' | 'supabase';

export function getAuthProvider(): AuthProvider {
  const configured = (process.env.CYRNEX_AUTH_PROVIDER ?? '').trim().toLowerCase();

  if (configured === 'local' || configured === 'supabase') {
    return configured;
  }

  return process.env.NODE_ENV === 'production' ? 'supabase' : 'local';
}

export function usesSupabaseAuth(): boolean {
  return getAuthProvider() === 'supabase';
}
