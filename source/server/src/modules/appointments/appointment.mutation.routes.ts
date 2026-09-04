import { Router } from 'express';
import { readDatabase, saveDatabase } from '../../database/index.js';
import type {
  AppointmentStatus,
  DepositStatus,
  PaymentMethod
} from '../../domain/types.js';
import { asyncRoute } from '../../middleware/asyncRoute.js';
import { requireRoles } from '../../middleware/authorization.js';
import { usesSupabaseAuth } from '../auth/auth.provider.js';
import {
  normalizeMoney,
  normalizeOptionalText,
  normalizeText
} from '../../utils/normalizers.js';
import { appendAuditEvent } from '../audit/audit.service.js';
import {
  appendAppointmentTimeline,
  applyAppointmentCompletion,
  hydrateAppointment,
  updateClientAfterStatusChange
} from './appointment.service.js';
import { validateAppointmentTime } from './appointment.validation.js';
import {
  rescheduleProductionAppointment,
  setProductionDeposit,
  setProductionRecurrenceState,
  setProductionStatus
} from './appointment.production.repository.js';
import {
  readProductionStatusInput,
  sendProductionAgendaError
} from './appointment.production.routes.helpers.js';
import {
  applyCompletionOverrides,
  applyOperationalStatus,
  getRecurrenceTargets,
  validateStatusTransition
} from './appointment.mutation.helpers.js';
import {
  loadProductionAppointmentPaymentProof,
  reviewProductionAppointmentPaymentProof
} from './appointment.paymentProof.repository.js';

const router = Router();
const allowedStatuses: AppointmentStatus[] = [
  'scheduled',
  'confirmed',
  'arrived',
  'in_service',
  'completed',
  'missed',
  'cancelled'
];
const allowedDepositStatuses: DepositStatus[] = ['pending', 'paid', 'waived'];
const allowedPaymentMethods: PaymentMethod[] = [
  'cash',
  'pix',
  'debit',
  'credit',
  'other'
];
const allowedRecurrenceScopes = new Set(['this', 'future', 'all']);

router.patch('/:id/reschedule', asyncRoute(async (request, response) => {
  const parsedDate = new Date(normalizeText(request.body.date));
  const scope = normalizeText(request.body.scope || 'this');
  if (!allowedRecurrenceScopes.has(scope)) {
    response.status(400).json({
      error: 'Escolha se a alteração vale para este atendimento, os próximos ou toda a sequência.'
    });
    return;
  }
  if (Number.isNaN(parsedDate.getTime())) {
    response.status(400).json({ error: 'Escolha um novo horário válido.' });
    return;
  }
  if (usesSupabaseAuth()) {
    try {
      const appointment = await rescheduleProductionAppointment(
        request.auth,
        request.params.id,
        parsedDate,
        scope
      );
      if (!appointment) {
        response.status(404).json({ error: 'Agendamento não encontrado.' });
        return;
      }
      response.json(appointment);
    } catch (error) {
      sendProductionAgendaError(response, error);
    }
    return;
  }
  const database = await readDatabase(request.auth.businessId);
  const appointment = database.appointments.find(
    item => item.id === request.params.id
  );

  if (!appointment) {
    response.status(404).json({ error: 'Agendamento não encontrado.' });
    return;
  }
  if (['completed', 'cancelled', 'missed'].includes(appointment.status)) {
    response.status(409).json({
      error: 'Esse atendimento não pode ser reagendado no status atual.'
    });
    return;
  }
  const targets = getRecurrenceTargets(
    database.appointments,
    appointment,
    scope
  );
  const deltaMs = parsedDate.getTime() - new Date(appointment.date).getTime();
  const proposals = targets.map(item => ({
    appointment: item,
    nextDate: item.id === appointment.id
      ? parsedDate
      : new Date(new Date(item.date).getTime() + deltaMs)
  }));
  const ignoredTargetIds = proposals.map(item => item.appointment.id);

  for (const proposal of proposals) {
    const service = database.services.find(
      item => item.id === proposal.appointment.serviceId
    );
    if (!service) {
      response.status(409).json({
        error: 'O serviço desse atendimento não está mais disponível.'
      });
      return;
    }
    const validation = validateAppointmentTime(
      database,
      proposal.appointment.professionalId,
      proposal.appointment.durationMinutes,
      proposal.appointment.bufferAfterMinutes,
      proposal.nextDate,
      ignoredTargetIds
    );
    if (validation) {
      const targetLabel = scope === 'this' ? 'o atendimento' : 'a sequência';
      response.status(validation.status).json({
        error: `Não foi possível reagendar ${targetLabel}: ${validation.message}`
      });
      return;
    }
  }

  for (const proposal of proposals) {
    const previousDate = proposal.appointment.date;
    proposal.appointment.date = proposal.nextDate.toISOString();
    proposal.appointment.rescheduledAt = new Date().toISOString();
    appendAppointmentTimeline(proposal.appointment, 'rescheduled', {
      actorUserId: request.auth.userId,
      actorName: request.auth.displayName,
      note: `${previousDate} → ${proposal.appointment.date}`
    });
  }
  appendAuditEvent(database, request.auth, {
    action: 'appointment.rescheduled',
    entityType: 'appointment',
    entityId: appointment.id,
    metadata: {
      newDate: parsedDate.toISOString(),
      scope,
      affected: proposals.length
    }
  });
  await saveDatabase(request.auth.businessId, database);
  response.json(hydrateAppointment(database, appointment));
}));

router.patch('/:id/recurrence', asyncRoute(async (request, response) => {
  const action = normalizeText(request.body.action);
  if (action !== 'pause' && action !== 'resume') {
    response.status(400).json({ error: 'Ação de recorrência inválida.' });
    return;
  }
  if (usesSupabaseAuth()) {
    try {
      response.json(await setProductionRecurrenceState(
        request.auth,
        request.params.id,
        action
      ));
    } catch (error) {
      sendProductionAgendaError(response, error);
    }
    return;
  }
  const database = await readDatabase(request.auth.businessId);
  const appointment = database.appointments.find(
    item => item.id === request.params.id
  );
  if (!appointment?.recurrenceId) {
    response.status(404).json({
      error: 'Esse atendimento não pertence a uma recorrência.'
    });
    return;
  }
  const series = database.recurrenceSeries.find(
    item => item.id === appointment.recurrenceId
  );
  if (!series) {
    response.status(404).json({ error: 'Sequência recorrente não encontrada.' });
    return;
  }
  const now = Date.now();
  const futureItems = database.appointments.filter(item => (
    item.recurrenceId === series.id &&
    !['completed', 'cancelled', 'missed'].includes(item.status) &&
    new Date(item.date).getTime() >= now
  ));

  if (action === 'resume') {
    for (const item of futureItems) {
      const validation = validateAppointmentTime(
        database,
        item.professionalId,
        item.durationMinutes,
        item.bufferAfterMinutes,
        new Date(item.date),
        futureItems.map(target => target.id)
      );
      if (validation) {
        response.status(409).json({
          error: `Não foi possível retomar a recorrência: ${validation.message}`
        });
        return;
      }
    }
  }

  series.paused = action === 'pause';
  futureItems.forEach(item => {
    item.recurrencePaused = action === 'pause';
  });
  appendAuditEvent(database, request.auth, {
    action: `appointment.recurrence_${action}d`,
    entityType: 'recurrence_series',
    entityId: series.id,
    metadata: { appointmentId: appointment.id, affected: futureItems.length }
  });
  await saveDatabase(request.auth.businessId, database);
  response.json(series);
}));

router.get(
  '/:id/payment-proof',
  requireRoles('owner', 'manager', 'receptionist'),
  asyncRoute(async (request, response) => {
  if (!usesSupabaseAuth()) {
    response.json(null);
    return;
  }
  response.json(await loadProductionAppointmentPaymentProof(request.auth, request.params.id));
  })
);
router.patch(
  '/:id/payment-proof/:proofId',
  requireRoles('owner', 'manager', 'receptionist'),
  asyncRoute(async (request, response) => {
  if (!usesSupabaseAuth()) {
    response.status(409).json({ error: 'A confirmação real de Pix fica disponível no ambiente online.' });
    return;
  }
  const action = normalizeText(request.body.action);
  if (action !== 'confirm' && action !== 'reject') {
    response.status(400).json({ error: 'Escolha confirmar ou recusar o comprovante.' });
    return;
  }
  const note = normalizeOptionalText(request.body.note)?.slice(0, 500) ?? null;
  response.json(await reviewProductionAppointmentPaymentProof(
    request.auth,
    request.params.id,
    request.params.proofId,
    action,
    note
  ));
  })
);
router.patch('/:id/deposit', requireRoles('owner', 'manager', 'receptionist'), asyncRoute(async (request, response) => {
  const depositStatus = normalizeText(request.body.depositStatus) as DepositStatus;
  if (!allowedDepositStatuses.includes(depositStatus)) {
    response.status(400).json({ error: 'Situação do sinal inválida.' });
    return;
  }
  if (usesSupabaseAuth()) {
    try {
      const appointment = await setProductionDeposit(
        request.auth,
        request.params.id,
        depositStatus
      );
      if (!appointment) {
        response.status(404).json({ error: 'Agendamento não encontrado.' });
        return;
      }
      response.json(appointment);
    } catch (error) {
      sendProductionAgendaError(response, error);
    }
    return;
  }

  const database = await readDatabase(request.auth.businessId);
  const appointment = database.appointments.find(
    item => item.id === request.params.id
  );
  if (!appointment) {
    response.status(404).json({ error: 'Agendamento não encontrado.' });
    return;
  }

  const previousStatus = appointment.depositStatus;
  appointment.depositStatus = depositStatus;
  appointment.depositPaidAt = depositStatus === 'paid'
    ? (appointment.depositPaidAt ?? new Date().toISOString()) : null;
  appendAuditEvent(database, request.auth, {
    action: 'appointment.deposit_changed',
    entityType: 'appointment',
    entityId: appointment.id,
    metadata: { previousStatus, depositStatus }
  });
  await saveDatabase(request.auth.businessId, database);
  response.json(hydrateAppointment(database, appointment));
}));

router.patch('/:id/status', asyncRoute(async (request, response) => {
  const status = normalizeText(request.body.status) as AppointmentStatus;
  if (!allowedStatuses.includes(status)) {
    response.status(400).json({ error: 'Status de atendimento inválido.' });
    return;
  }
  if (usesSupabaseAuth()) {
    const productionInput = readProductionStatusInput(status, request.body);
    if (productionInput.error) {
      response.status(400).json({ error: productionInput.error });
      return;
    }
    try {
      const appointment = await setProductionStatus(
        request.auth,
        request.params.id,
        status,
        request.body,
        productionInput.value
      );
      if (!appointment) {
        response.status(404).json({ error: 'Agendamento não encontrado.' });
        return;
      }
      response.json(appointment);
    } catch (error) {
      sendProductionAgendaError(response, error, { earlyStart: true });
    }
    return;
  }

  const database = await readDatabase(request.auth.businessId);
  const appointment = database.appointments.find(
    item => item.id === request.params.id
  );
  if (!appointment) {
    response.status(404).json({ error: 'Agendamento não encontrado.' });
    return;
  }

  const previousStatus = appointment.status;
  if (previousStatus === status) {
    response.status(409).json({ error: `Esse atendimento já está com o status ${status}.` });
    return;
  }
  const transitionError = validateStatusTransition(previousStatus, status);
  if (transitionError) {
    response.status(409).json({ error: transitionError });
    return;
  }

  if (status === 'completed') {
    const paymentMethod = normalizeText(
      request.body.paymentMethod
    ) as PaymentMethod;
    const cardFee = normalizeMoney(request.body.cardFee ?? 0);
    const overrideError = applyCompletionOverrides(
      database,
      appointment,
      request.body
    );
    if (overrideError) {
      response.status(400).json({ error: overrideError });
      return;
    }
    if (
      !allowedPaymentMethods.includes(paymentMethod) ||
      Number.isNaN(cardFee) ||
      cardFee < 0 ||
      cardFee > appointment.price
    ) {
      response.status(400).json({
        error: 'Informe a forma de pagamento e a taxa corretamente.'
      });
      return;
    }
    applyAppointmentCompletion(database, appointment, paymentMethod, cardFee);
    appendAppointmentTimeline(appointment, 'completed', {
      actorUserId: request.auth.userId,
      actorName: request.auth.displayName,
      at: new Date(appointment.completedAt ?? Date.now())
    });
  } else {
    const transitionIssue = applyOperationalStatus(
      appointment,
      status,
      request.body,
      request.auth.userId,
      request.auth.displayName
    );
    if (transitionIssue) {
      response.status(409).json(transitionIssue);
      return;
    }
    const client = database.clients.find(
      item => item.id === appointment.clientId
    );
    appointment.status = status;
    updateClientAfterStatusChange(
      client,
      appointment,
      previousStatus,
      status
    );
  }

  appendAuditEvent(database, request.auth, {
    action: 'appointment.status_changed',
    entityType: 'appointment',
    entityId: appointment.id,
    metadata: { previousStatus, status }
  });
  await saveDatabase(request.auth.businessId, database);
  response.json(hydrateAppointment(database, appointment));
}));


export { router as appointmentMutationRouter };
