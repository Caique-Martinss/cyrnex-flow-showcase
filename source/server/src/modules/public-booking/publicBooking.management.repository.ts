import type {
  BusinessSettings,
  PaymentPreferences,
  PublicBookingManagement
} from '../../domain/types.js';
import {
  removeServerPaymentProof,
  uploadServerPaymentProof
} from '../../database/postgres/paymentProofStorage.js';
import { serverSupabaseRest } from '../../database/postgres/restClient.js';
import type { PublicAvailabilityResult } from './availability.service.js';
import { hashPublicBookingAccessToken } from './publicBooking.access.js';
import {
  buildPublicSettings,
  buildWeeklySchedule,
  mapBookingManagement
} from './publicBooking.production.mappers.js';
import type {
  BookingManagementRpcResult,
  BusinessRow,
  HourRow,
  ProfileRow,
  SettingsRow
} from './publicBooking.production.types.js';

type PaymentState = {
  required: boolean;
  method: 'pix' | null;
  pixKeyType: PaymentPreferences['pixKeyType'];
  pixKey: string;
  receiverName: string;
  proofId: string | null;
  proofStatus: 'none' | 'submitted' | 'confirmed' | 'rejected';
  proofSubmittedAt: string | null;
  proofReviewedAt: string | null;
  proofReviewNote: string | null;
};

type BookingManagementWithPayment = PublicBookingManagement & { payment: PaymentState };

interface AccessInput {
  slug: string;
  token: string;
}

interface PaymentMethodRow {
  active: boolean;
}

interface PaymentProofRow {
  id: string;
  status: 'submitted' | 'confirmed' | 'rejected';
  submitted_at: string;
  reviewed_at: string | null;
  review_note: string | null;
}

interface PaymentContext {
  businessId: string;
  payment: PaymentState;
}

export async function loadProductionPublicBookingManagementSettings(
  slug: string
): Promise<BusinessSettings> {
  const businesses = await serverSupabaseRest<BusinessRow[]>('/rest/v1/businesses', {
    query: {
      select: 'id,name,slug,timezone,operation_mode,onboarding_status,onboarding_step,onboarding_completed_at',
      slug: `eq.${slug}`,
      status: 'eq.active',
      limit: '1'
    }
  });
  const business = businesses[0];
  if (!business) throw publicError('Barbearia não encontrada.', 404);
  const filter = { business_id: `eq.${business.id}` };
  const [settingsRows, profiles, hours] = await Promise.all([
    serverSupabaseRest<SettingsRow[]>('/rest/v1/business_settings', {
      query: { select: '*', ...filter, limit: '1' }
    }),
    serverSupabaseRest<ProfileRow[]>('/rest/v1/business_public_profiles', {
      query: { select: '*', ...filter, limit: '1' }
    }),
    serverSupabaseRest<HourRow[]>('/rest/v1/business_hours', {
      query: { select: 'id,weekday,opens_at,closes_at', ...filter, order: 'weekday.asc,opens_at.asc' }
    })
  ]);
  const settings = settingsRows[0];
  const profile = profiles[0];
  if (!settings || !profile) throw publicError('Configuração da barbearia indisponível.', 404);
  return buildPublicSettings(
    business,
    settings,
    profile,
    buildWeeklySchedule(hours),
    [],
    new Map()
  );
}

export async function loadProductionPublicBookingManagement(
  input: AccessInput
): Promise<BookingManagementWithPayment> {
  const management = await managementRpc('get_public_booking_management', input, {});
  const context = await loadPaymentContext(
    input.slug,
    management.booking.appointment.id,
    management.booking.appointment.depositAmount > 0
  );
  return { ...management, payment: context.payment };
}

export async function submitProductionPublicBookingPaymentProof(
  input: AccessInput & { dataUrl: string }
): Promise<BookingManagementWithPayment> {
  const management = await managementRpc('get_public_booking_management', input, {});
  const appointment = management.booking.appointment;
  if (['completed', 'cancelled', 'missed'].includes(appointment.status)) {
    throw publicError('Este agendamento já foi encerrado e não aceita novos comprovantes.', 409);
  }
  if (appointment.depositStatus !== 'pending' || appointment.depositAmount <= 0) {
    throw publicError('Este agendamento não possui sinal pendente.', 409);
  }

  const context = await loadPaymentContext(input.slug, appointment.id, true);
  if (context.payment.method !== 'pix' || !context.payment.pixKey) {
    throw publicError('O Pix para sinal não está configurado nesta barbearia.', 409);
  }
  if (context.payment.proofStatus === 'submitted') {
    throw publicError('Já existe um comprovante aguardando confirmação.', 409);
  }

  const uploaded = await uploadServerPaymentProof({
    businessId: context.businessId,
    appointmentId: appointment.id,
    dataUrl: input.dataUrl
  });

  try {
    await serverSupabaseRest<string>('/rest/v1/rpc/record_public_payment_proof', {
      method: 'POST',
      body: {
        p_slug: input.slug,
        p_token_hash: hashPublicBookingAccessToken(input.token),
        p_proof_id: uploaded.id,
        p_storage_path: uploaded.path,
        p_mime_type: uploaded.mimeType,
        p_size_bytes: uploaded.sizeBytes
      }
    });
  } catch (error) {
    await removeServerPaymentProof(uploaded.path).catch(() => undefined);
    throw translateManagementDatabaseError(error);
  }

  return loadProductionPublicBookingManagement(input);
}

export async function loadProductionPublicBookingManagementAvailability(
  input: AccessInput & { date: string }
): Promise<PublicAvailabilityResult> {
  try {
    return await serverSupabaseRest<PublicAvailabilityResult>(
      '/rest/v1/rpc/get_public_booking_management_availability',
      {
        method: 'POST',
        body: {
          p_slug: input.slug,
          p_token_hash: hashPublicBookingAccessToken(input.token),
          p_date: input.date
        }
      }
    );
  } catch (error) {
    throw translateManagementDatabaseError(error);
  }
}

export async function rescheduleProductionPublicBooking(
  input: AccessInput & { startsAt: string }
): Promise<BookingManagementWithPayment> {
  await managementRpc('reschedule_public_booking', input, {
    p_new_starts_at: input.startsAt
  });
  return loadProductionPublicBookingManagement(input);
}

export async function cancelProductionPublicBooking(
  input: AccessInput & { reason: string | null }
): Promise<BookingManagementWithPayment> {
  await managementRpc('cancel_public_booking', input, {
    p_reason: input.reason
  });
  return loadProductionPublicBookingManagement(input);
}

async function managementRpc(
  rpc: string,
  input: AccessInput,
  extra: Record<string, unknown>
): Promise<PublicBookingManagement> {
  try {
    const row = await serverSupabaseRest<BookingManagementRpcResult>(
      `/rest/v1/rpc/${rpc}`,
      {
        method: 'POST',
        body: {
          p_slug: input.slug,
          p_token_hash: hashPublicBookingAccessToken(input.token),
          ...extra
        }
      }
    );
    return mapBookingManagement(row, input.token);
  } catch (error) {
    throw translateManagementDatabaseError(error);
  }
}

async function loadPaymentContext(
  slug: string,
  appointmentId: string,
  required: boolean
): Promise<PaymentContext> {
  const businesses = await serverSupabaseRest<Array<{ id: string }>>('/rest/v1/businesses', {
    query: { select: 'id', slug: `eq.${slug}`, status: 'eq.active', limit: '1' }
  });
  const business = businesses[0];
  if (!business) throw publicError('Barbearia não encontrada.', 404);

  const [settingsRows, pixRows, proofs] = await Promise.all([
    serverSupabaseRest<Array<{ payment_preferences: unknown }>>('/rest/v1/business_settings', {
      query: { select: 'payment_preferences', business_id: `eq.${business.id}`, limit: '1' }
    }),
    serverSupabaseRest<PaymentMethodRow[]>('/rest/v1/business_payment_methods', {
      query: {
        select: 'active',
        business_id: `eq.${business.id}`,
        method: 'eq.pix',
        active: 'eq.true',
        limit: '1'
      }
    }),
    serverSupabaseRest<PaymentProofRow[]>('/rest/v1/appointment_payment_proofs', {
      query: {
        select: 'id,status,submitted_at,reviewed_at,review_note',
        business_id: `eq.${business.id}`,
        appointment_id: `eq.${appointmentId}`,
        order: 'submitted_at.desc',
        limit: '1'
      }
    }).catch(() => [])
  ]);

  const preferences = parsePaymentPreferences(settingsRows[0]?.payment_preferences);
  const pixReady = Boolean(
    pixRows[0]?.active
    && preferences.usePixForDeposit
    && preferences.pixKey.trim()
    && preferences.pixReceiverName.trim()
  );
  const proof = proofs[0];

  return {
    businessId: business.id,
    payment: {
      required,
      method: required && pixReady ? 'pix' : null,
      pixKeyType: pixReady ? preferences.pixKeyType : '',
      pixKey: pixReady ? preferences.pixKey : '',
      receiverName: pixReady ? preferences.pixReceiverName : '',
      proofId: proof?.id ?? null,
      proofStatus: proof?.status ?? 'none',
      proofSubmittedAt: proof?.submitted_at ?? null,
      proofReviewedAt: proof?.reviewed_at ?? null,
      proofReviewNote: proof?.review_note ?? null
    }
  };
}

function parsePaymentPreferences(value: unknown): Pick<
  PaymentPreferences,
  'pixKeyType' | 'pixKey' | 'pixReceiverName' | 'usePixForDeposit'
> {
  const record = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const keyType = typeof record.pixKeyType === 'string' ? record.pixKeyType : '';
  const allowed = new Set(['', 'cpf', 'cnpj', 'email', 'phone', 'random']);
  return {
    pixKeyType: allowed.has(keyType)
      ? keyType as PaymentPreferences['pixKeyType']
      : '',
    pixKey: typeof record.pixKey === 'string' ? record.pixKey : '',
    pixReceiverName: typeof record.pixReceiverName === 'string' ? record.pixReceiverName : '',
    usePixForDeposit: record.usePixForDeposit === true
  };
}

function translateManagementDatabaseError(error: unknown): Error {
  if (!(error instanceof Error)) return publicError('Falha ao gerenciar o agendamento.', 500);
  const code = 'code' in error ? String((error as { code?: unknown }).code ?? '') : '';
  if (code === 'P0002') {
    return publicError('Agendamento não encontrado ou link expirado.', 404);
  }
  if (code === 'P0003' || code === '23P01') return publicError(error.message, 409);
  if (code === '23503' || code === '23514' || code === '22023' || code === '22P02') {
    return publicError(error.message, 400);
  }
  return error;
}

function publicError(message: string, status: number): Error & { status: number } {
  return Object.assign(new Error(message), { status });
}
