import { isProductionAgendaError } from './appointment.production.errors.js';

export function sendRetroactiveProductionError(
  response: { status(code: number): { json(body: Record<string, unknown>): unknown } },
  error: unknown,
  approval = false
): void {
  if (!isProductionAgendaError(error)) throw error;
  response.status(error.status).json({
    error: error.message,
    ...(error.conflictAppointmentId
      ? { conflictAppointmentId: error.conflictAppointmentId }
      : {}),
    ...(approval && error.status === 409 && error.conflictAppointmentId
      ? { requiresConflictConfirmation: true }
      : {})
  });
}
