import type { AuthSession } from '../domain/types';
import { api } from './http';

export interface LoginInput {
  username: string;
  password: string;
  rememberMe: boolean;
}

export interface RegisterInput {
  displayName: string;
  businessName: string;
  username: string;
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface PasswordRecoveryRequestResponse {
  success: true;
  message: string;
  expiresInMinutes?: number;
  maskedEmail?: string;
  developmentCode?: string;
  retryAfterSeconds?: number;
}

export interface PasswordRecoveryVerifyResponse {
  success: true;
  resetToken: string;
  message: string;
}

export async function getCurrentSession(): Promise<AuthSession> {
  const response = await api.get<AuthSession>('/auth/me');
  return response.data;
}

export async function login(input: LoginInput): Promise<AuthSession> {
  const response = await api.post<AuthSession>('/auth/login', input);
  return response.data;
}

export async function register(input: RegisterInput): Promise<AuthSession> {
  const response = await api.post<AuthSession>('/auth/register', input);
  return response.data;
}

export interface CreateBusinessInput {
  businessName: string;
}

export async function createBusiness(input: CreateBusinessInput): Promise<AuthSession> {
  const response = await api.post<AuthSession>('/auth/businesses', input);
  return response.data;
}

export async function switchBusiness(businessId: string): Promise<AuthSession> {
  const response = await api.post<AuthSession>('/auth/businesses/switch', { businessId });
  return response.data;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

export async function requestPasswordRecovery(
  email: string
): Promise<PasswordRecoveryRequestResponse> {
  const response = await api.post<PasswordRecoveryRequestResponse>(
    '/auth/recovery/request',
    { email }
  );
  return response.data;
}

export async function verifyPasswordRecoveryCode(
  email: string,
  code: string
): Promise<PasswordRecoveryVerifyResponse> {
  const response = await api.post<PasswordRecoveryVerifyResponse>(
    '/auth/recovery/verify',
    { email, code }
  );
  return response.data;
}

export async function resetPassword(
  email: string,
  resetToken: string,
  password: string
): Promise<string> {
  const response = await api.post<{ success: true; message: string }>(
    '/auth/recovery/reset',
    { email, resetToken, password }
  );
  return response.data.message;
}
