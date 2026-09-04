import { randomUUID } from 'node:crypto';
import type {
  Appointment,
  AppointmentSource,
  BusinessSettings,
  Client,
  Professional,
  Service
} from '../../domain/types.js';
import { roundMoney } from '../../utils/money.js';

interface CreateAppointmentInput {
  client: Client;
  service: Service;
  professional: Professional;
  date: Date;
  notes: string | null;
  settings: BusinessSettings;
  source?: AppointmentSource;
  registeredByUserId?: string | null;
  priceOverride?: number;
  isFitIn?: boolean;
  fitInConflictAppointmentId?: string | null;
  fitInReason?: string | null;
  recurrenceId?: string | null;
  recurrenceIndex?: number | null;
}

export function buildAppointment({
  client,
  service,
  professional,
  date,
  notes,
  settings,
  source = 'admin',
  registeredByUserId = null,
  priceOverride,
  isFitIn = false,
  fitInConflictAppointmentId = null,
  fitInReason = null,
  recurrenceId = null,
  recurrenceIndex = null
}: CreateAppointmentInput): Appointment {
  const price = priceOverride ?? service.price;
  const depositPercent = settings.bookingRules.requireDeposit
    ? service.depositPercent ?? settings.defaultDepositPercent
    : 0;

  return {
    id: randomUUID(),
    clientId: client.id,
    serviceId: service.id,
    professionalId: professional.id,
    serviceName: service.name,
    professionalName: professional.name,
    durationMinutes: service.durationMinutes,
    bufferAfterMinutes: service.bufferAfterMinutes,
    commissionPercentSnapshot: professional.receivesCommission ? professional.commissionPercent : 0,
    date: date.toISOString(),
    status: 'scheduled',
    price,
    depositPercent,
    depositAmount: roundMoney(price * depositPercent / 100),
    depositStatus: depositPercent > 0 ? 'pending' : 'waived',
    depositPaidAt: null,
    paymentMethod: null,
    cardFee: 0,
    commissionAmount: 0,
    netAmount: 0,
    notes,
    createdAt: new Date().toISOString(),
    completedAt: null,
    confirmedAt: null,
    arrivedAt: null,
    actualStartedAt: null,
    cancelledAt: null,
    missedAt: null,
    rescheduledAt: null,
    isFitIn,
    fitInConflictAppointmentId,
    fitInReason,
    recurrenceId,
    recurrenceIndex,
    recurrencePaused: false,
    timeline: [{
      id: randomUUID(),
      type: 'created',
      at: new Date().toISOString(),
      actorUserId: registeredByUserId ?? null,
      actorName: null,
      note: null
    }],
    source,
    registeredAt: source === 'retroactive' ? new Date().toISOString() : null,
    registeredByUserId
  };
}
