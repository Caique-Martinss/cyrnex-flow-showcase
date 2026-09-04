import { isSupabaseRestError } from '../../database/postgres/restClient.js';

export interface ProductionAgendaError extends Error {
  status: number;
  code?: string;
  details?: string;
  conflictAppointmentId?: string;
  requiresEarlyStartConfirmation?: boolean;
}

export function translateAgendaError(error: unknown): ProductionAgendaError {
  if (!isSupabaseRestError(error)) {
    if (error instanceof Error && 'status' in error) {
      return error as ProductionAgendaError;
    }
    throw error;
  }

  const status = error.code === '42501' || error.status === 403
    ? 403
    : error.code === 'P0002'
      ? 404
      : ['23P01', '23514', '23503', '23505'].includes(error.code ?? '')
        ? 409
        : error.status >= 400 && error.status < 500
          ? error.status
          : 500;

  return Object.assign(new Error(error.message), {
    status,
    code: error.code,
    details: error.details,
    conflictAppointmentId: isUuid(error.details) ? error.details : undefined,
    requiresEarlyStartConfirmation: error.details === 'requiresEarlyStartConfirmation'
  }) as ProductionAgendaError;
}

export function isProductionAgendaError(error: unknown): error is ProductionAgendaError {
  return error instanceof Error && 'status' in error;
}

function isUuid(value: string | undefined): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value));
}
