import type { Response } from 'express';
import { readCookie } from './session.js';

export const SUPABASE_ACCESS_COOKIE = 'scos_access_token';
export const SUPABASE_REFRESH_COOKIE = 'scos_refresh_token';
export const BUSINESS_COOKIE = 'scos_business';

export interface SupabaseSessionTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export function setSupabaseSessionCookies(
  response: Response,
  tokens: SupabaseSessionTokens,
  rememberMe: boolean
): void {
  const secure = process.env.NODE_ENV === 'production';
  const accessExpires = new Date(Date.now() + Math.max(60, tokens.expiresIn) * 1_000);

  response.cookie(SUPABASE_ACCESS_COOKIE, tokens.accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    expires: accessExpires,
    path: '/'
  });

  response.cookie(SUPABASE_REFRESH_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    ...(rememberMe ? { expires: new Date(Date.now() + 30 * 24 * 60 * 60_000) } : {}),
    path: '/'
  });
}

export function setBusinessCookie(
  response: Response,
  businessId: string,
  rememberMe = true
): void {
  response.cookie(BUSINESS_COOKIE, businessId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    ...(rememberMe ? { expires: new Date(Date.now() + 30 * 24 * 60 * 60_000) } : {}),
    path: '/'
  });
}

export function clearSupabaseSessionCookies(response: Response): void {
  const options = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/'
  };
  response.clearCookie(SUPABASE_ACCESS_COOKIE, options);
  response.clearCookie(SUPABASE_REFRESH_COOKIE, options);
  response.clearCookie(BUSINESS_COOKIE, options);
}

export function readSupabaseSessionCookies(cookieHeader: string | undefined): {
  accessToken: string;
  refreshToken: string;
  businessId: string;
} {
  return {
    accessToken: readCookie(cookieHeader, SUPABASE_ACCESS_COOKIE),
    refreshToken: readCookie(cookieHeader, SUPABASE_REFRESH_COOKIE),
    businessId: readCookie(cookieHeader, BUSINESS_COOKIE)
  };
}
