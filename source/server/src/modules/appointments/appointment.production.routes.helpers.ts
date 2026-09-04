import type {
  AppointmentStatus,
  PaymentMethod
} from '../../domain/types.js';
import {
  normalizeMoney,
  normalizeOptionalText,
  normalizeText
} from '../../utils/normalizers.js';
import { isProductionAgendaError } from './appointment.production.errors.js';

const allowedPaymentMethods: PaymentMethod[] = [
  'cash',
  'pix',
  'debit',
  'credit',
  'other'
];

export interface ProductionStatusInput {
  paymentMethod: PaymentMethod | null;
  cardFee: number;
  serviceId: string | null;
  price: number | null;
  notes: string | null;
  confirmEarlyStart: boolean;
  reason: string | null;
}

export function readProductionStatusInput(
  status: AppointmentStatus,
  body: Record<string, unknown>
): { error: string | null; value: ProductionStatusInput } {
  const paymentMethod = status === 'completed'
    ? normalizeText(body.paymentMethod) as PaymentMethod
    : null;
  const cardFee = status === 'completed' ? normalizeMoney(body.cardFee ?? 0) : 0;
  const price = body.price === undefined ? null : normalizeMoney(body.price);
  const value = {
    paymentMethod,
    cardFee,
    serviceId: normalizeOptionalText(body.serviceId),
    price,
    notes: normalizeOptionalText(body.notes),
    confirmEarlyStart: body.confirmEarlyStart === true,
    reason: normalizeOptionalText(body.reason)
  };

  if (status === 'completed') {
    if (!paymentMethod || !allowedPaymentMethods.includes(paymentMethod)) {
      return { error: 'Informe a forma de pagamento corretamente.', value };
    }
    if (Number.isNaN(cardFee) || cardFee < 0) {
      return { error: 'Informe a taxa corretamente.', value };
    }
    if (price !== null && (Number.isNaN(price) || price < 0)) {
      return { error: 'Informe um valor final válido.', value };
    }
  }
  return { error: null, value };
}

export function sendProductionAgendaError(
  response: { status(code: number): { json(body: Record<string, unknown>): unknown } },
  error: unknown,
  options: { earlyStart?: boolean } = {}
): void {
  if (!isProductionAgendaError(error)) throw error;
  response.status(error.status).json({
    error: error.message,
    ...(error.conflictAppointmentId
      ? { conflictAppointmentId: error.conflictAppointmentId }
      : {}),
    ...(options.earlyStart && error.requiresEarlyStartConfirmation
      ? { requiresEarlyStartConfirmation: true }
      : {})
  });
}
