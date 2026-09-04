import type {
  Appointment,
  AppointmentStatus,
  DepositStatus,
  PaymentMethod,
  RecurrenceSeries
} from '../../domain/types.js';
import {
  requireProductionAccessToken,
  userSupabaseRest
} from '../../database/postgres/restClient.js';
import type { AuthContext } from '../auth/auth.types.js';
import { loadProductionSettings } from '../settings/settings.repository.js';
import { listProductionProfessionals } from '../professionals/professional.repository.js';
import { listProductionServices } from '../services/service.repository.js';
import {
  buildRecurrenceOccurrences,
  type RecurrenceRequest
} from './recurrence.service.js';
import { translateAgendaError } from './appointment.production.errors.js';
import {
  appointmentSelect,
  groupProductionEvents,
  mapProductionAppointment,
  mapProductionClientBrief,
  mapProductionRecurrence,
  type AppointmentRow,
  type ClientBriefRow,
  type EventRow,
  type RecurrenceRow
} from './appointment.production.mapper.js';

interface PaymentProofSummaryRow {
  appointment_id: string;
  status: 'submitted' | 'confirmed' | 'rejected';
  submitted_at: string;
}

export async function listProductionAppointments(auth: AuthContext): Promise<Appointment[]> {
  const token = requireProductionAccessToken(auth.accessToken);
  const [rows, events, clients, services, professionals, paymentProofs] = await Promise.all([
    userSupabaseRest<AppointmentRow[]>(token, '/rest/v1/appointments', {
      query: {
        select: appointmentSelect,
        business_id: `eq.${auth.businessId}`,
        order: 'starts_at.asc'
      }
    }),
    userSupabaseRest<EventRow[]>(token, '/rest/v1/appointment_events', {
      query: {
        select: 'id,appointment_id,event_type,created_at,actor_user_id,actor_name,notes',
        business_id: `eq.${auth.businessId}`,
        order: 'created_at.asc'
      }
    }),
    userSupabaseRest<ClientBriefRow[]>(token, '/rest/v1/clients', {
      query: {
        select: 'id,full_name,phone_raw,email,created_at',
        business_id: `eq.${auth.businessId}`
      }
    }),
    listProductionServices(auth, { includeInactive: true }),
    listProductionProfessionals(auth, { includeInactive: true }),
    userSupabaseRest<PaymentProofSummaryRow[]>(token, '/rest/v1/appointment_payment_proofs', {
      query: {
        select: 'appointment_id,status,submitted_at',
        business_id: `eq.${auth.businessId}`,
        order: 'submitted_at.desc'
      }
    })
  ]);

  const eventsByAppointment = groupProductionEvents(events);
  const clientMap = new Map(clients.map(row => [row.id, mapProductionClientBrief(row)]));
  const serviceMap = new Map(services.map(item => [item.id, item]));
  const professionalMap = new Map(professionals.map(item => [item.id, item]));
  const latestProofByAppointment = new Map<string, PaymentProofSummaryRow>();
  paymentProofs.forEach(proof => {
    if (!latestProofByAppointment.has(proof.appointment_id)) {
      latestProofByAppointment.set(proof.appointment_id, proof);
    }
  });

  return rows.map(row => {
    const appointment = mapProductionAppointment(
      row,
      eventsByAppointment.get(row.id) ?? [],
      clientMap.get(row.client_id ?? '') ?? null,
      serviceMap.get(row.service_id) ?? null,
      professionalMap.get(row.professional_id) ?? null
    );
    const paymentProof = latestProofByAppointment.get(row.id);
    return {
      ...appointment,
      paymentProofStatus: paymentProof?.status ?? 'none',
      paymentProofSubmittedAt: paymentProof?.submitted_at ?? null
    } satisfies Appointment;
  });
}

export async function getProductionAppointment(auth: AuthContext, id: string) {
  const appointments = await listProductionAppointments(auth);
  return appointments.find(item => item.id === id) ?? null;
}

export async function createProductionAppointment(
  auth: AuthContext,
  input: {
    clientId: string;
    serviceId: string;
    professionalId: string;
    date: Date;
    notes: string | null;
    isFitIn: boolean;
    conflictConfirmed: boolean;
    fitInReason: string;
    recurrence: RecurrenceRequest | null;
  }
) {
  const token = requireProductionAccessToken(auth.accessToken);

  try {
    if (input.recurrence) {
      const settings = await loadProductionSettings(auth);
      const occurrences = buildRecurrenceOccurrences({
        baseDate: input.date,
        baseServiceId: input.serviceId,
        timeZone: settings.timezone,
        recurrence: input.recurrence
      });
      const serviceIds = input.recurrence.serviceIds?.length
        ? input.recurrence.serviceIds
        : [input.serviceId];
      const result = await userSupabaseRest<{
        recurrenceId: string;
        appointmentIds: string[];
      }>(token, '/rest/v1/rpc/create_agenda_recurrence', {
        method: 'POST',
        body: {
          p_business_id: auth.businessId,
          p_client_id: input.clientId,
          p_professional_id: input.professionalId,
          p_frequency: input.recurrence.frequency,
          p_interval_weeks: input.recurrence.frequency === 'biweekly'
            ? 2
            : Math.max(1, input.recurrence.intervalWeeks ?? 1),
          p_weekdays: input.recurrence.weekdays ?? [],
          p_service_ids: serviceIds,
          p_occurrences: occurrences.map(item => ({
            startsAt: item.date.toISOString(),
            serviceId: item.serviceId,
            index: item.index
          })),
          p_notes: input.notes
        }
      });
      const all = await listProductionAppointments(auth);
      const idSet = new Set(result.appointmentIds);
      const created = all.filter(item => idSet.has(item.id));
      return {
        appointment: created[0] ?? null,
        appointments: created,
        recurrenceId: result.recurrenceId
      };
    }

    const id = await userSupabaseRest<string>(token, '/rest/v1/rpc/create_agenda_appointment', {
      method: 'POST',
      body: {
        p_business_id: auth.businessId,
        p_client_id: input.clientId,
        p_service_id: input.serviceId,
        p_professional_id: input.professionalId,
        p_starts_at: input.date.toISOString(),
        p_notes: input.notes,
        p_is_fit_in: input.isFitIn,
        p_conflict_confirmed: input.conflictConfirmed,
        p_fit_in_reason: input.fitInReason || null
      }
    });
    return await getProductionAppointment(auth, id);
  } catch (error) {
    throw translateAgendaError(error);
  }
}

export async function rescheduleProductionAppointment(
  auth: AuthContext,
  id: string,
  date: Date,
  scope: string
) {
  const token = requireProductionAccessToken(auth.accessToken);
  try {
    await userSupabaseRest<string>(token, '/rest/v1/rpc/reschedule_agenda_appointment', {
      method: 'POST',
      body: {
        p_business_id: auth.businessId,
        p_appointment_id: id,
        p_new_starts_at: date.toISOString(),
        p_scope: scope
      }
    });
    return await getProductionAppointment(auth, id);
  } catch (error) {
    throw translateAgendaError(error);
  }
}

export async function setProductionRecurrenceState(
  auth: AuthContext,
  appointmentId: string,
  action: 'pause' | 'resume'
): Promise<RecurrenceSeries> {
  const token = requireProductionAccessToken(auth.accessToken);
  try {
    const seriesId = await userSupabaseRest<string>(
      token,
      '/rest/v1/rpc/set_agenda_recurrence_state',
      {
        method: 'POST',
        body: {
          p_business_id: auth.businessId,
          p_appointment_id: appointmentId,
          p_action: action
        }
      }
    );
    const rows = await userSupabaseRest<RecurrenceRow[]>(
      token,
      '/rest/v1/recurrence_series',
      {
        query: {
          select: [
            'id,client_id,professional_id,service_ids,frequency,interval_weeks',
            'weekdays,starts_at,ends_at,status,created_at,created_by'
          ].join(','),
          business_id: `eq.${auth.businessId}`,
          id: `eq.${seriesId}`,
          limit: '1'
        }
      }
    );
    if (!rows[0]) {
      throw Object.assign(
        new Error('Sequência recorrente não encontrada.'),
        { status: 404 }
      );
    }
    return mapProductionRecurrence(rows[0]);
  } catch (error) {
    throw translateAgendaError(error);
  }
}

export async function setProductionDeposit(
  auth: AuthContext,
  appointmentId: string,
  depositStatus: DepositStatus
) {
  const token = requireProductionAccessToken(auth.accessToken);
  try {
    await userSupabaseRest<string>(token, '/rest/v1/rpc/set_agenda_deposit', {
      method: 'POST',
      body: {
        p_business_id: auth.businessId,
        p_appointment_id: appointmentId,
        p_deposit_status: depositStatus
      }
    });
    return await getProductionAppointment(auth, appointmentId);
  } catch (error) {
    throw translateAgendaError(error);
  }
}

export async function setProductionStatus(
  auth: AuthContext,
  appointmentId: string,
  status: AppointmentStatus,
  body: Record<string, unknown>,
  input: {
    paymentMethod: PaymentMethod | null;
    cardFee: number;
    serviceId: string | null;
    price: number | null;
    notes: string | null;
    confirmEarlyStart: boolean;
    reason: string | null;
  }
) {
  const token = requireProductionAccessToken(auth.accessToken);
  try {
    if (status === 'completed') {
      const rows = await userSupabaseRest<Array<{
        base_price: number | string;
        deposit_amount: number | string;
        deposit_status: DepositStatus;
      }>>(token, '/rest/v1/appointments', {
        query: {
          select: 'base_price,deposit_amount,deposit_status',
          business_id: `eq.${auth.businessId}`,
          id: `eq.${appointmentId}`,
          limit: '1'
        }
      });
      const current = rows[0];
      if (!current) {
        throw Object.assign(new Error('Agendamento não encontrado.'), { status: 404 });
      }
      const paidDeposit = current.deposit_status === 'paid'
        ? Number(current.deposit_amount)
        : 0;
      const finalPrice = input.price ?? Number(current.base_price);
      if (finalPrice < paidDeposit) {
        throw Object.assign(new Error(
          'O valor final não pode ser menor que o sinal já confirmado de R$ '
          + `${paidDeposit.toFixed(2).replace('.', ',')}.`
        ), { status: 400 });
      }
      const remainingToReceive = Math.max(0, finalPrice - paidDeposit);
      if (input.cardFee > remainingToReceive) {
        throw Object.assign(new Error(
          'A taxa não pode ser maior que o valor restante a receber.'
        ), { status: 400 });
      }
    }
    await userSupabaseRest<string>(token, '/rest/v1/rpc/set_agenda_status', {
      method: 'POST',
      body: {
        p_business_id: auth.businessId,
        p_appointment_id: appointmentId,
        p_status: status,
        p_confirm_early_start: input.confirmEarlyStart,
        p_reason: input.reason,
        p_payment_method: input.paymentMethod,
        p_card_fee: input.cardFee,
        p_service_id: input.serviceId,
        p_price: input.price,
        p_notes: input.notes,
        p_notes_provided: Object.prototype.hasOwnProperty.call(body, 'notes')
      }
    });
    return await getProductionAppointment(auth, appointmentId);
  } catch (error) {
    throw translateAgendaError(error);
  }
}
