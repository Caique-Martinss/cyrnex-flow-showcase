import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { readDatabase, saveDatabase } from '../../database/index.js';
import type {
  Appointment,
} from '../../domain/types.js';
import { asyncRoute } from '../../middleware/asyncRoute.js';
import { requireRoles } from '../../middleware/authorization.js';
import { usesSupabaseAuth } from '../auth/auth.provider.js';
import {
  normalizeOptionalText,
  normalizeText
} from '../../utils/normalizers.js';
import { appendAuditEvent } from '../audit/audit.service.js';
import { buildAppointment } from './appointment.factory.js';
import {
  appendAppointmentTimeline,
  findScheduleConflict,
  hydrateAppointment,
} from './appointment.service.js';
import {
  buildRecurrenceOccurrences,
  type RecurrenceRequest
} from './recurrence.service.js';
import { appointmentMutationRouter } from './appointment.mutation.routes.js';
import {
  createProductionAppointment,
  listProductionAppointments
} from './appointment.production.repository.js';
import { isProductionAgendaError } from './appointment.production.errors.js';
import {
  formatDateTime,
  professionalCanPerform,
  validateAppointmentTime,
  validateRecurrenceRequest
} from './appointment.validation.js';

const router = Router();
// Contas de profissional ainda não possuem vínculo seguro usuário ↔ profissional.
// Até essa etapa existir, não expomos a agenda completa para esse cargo.
router.use(requireRoles('owner', 'manager', 'receptionist'));
router.get('/', asyncRoute(async (request, response) => {
  if (usesSupabaseAuth()) {
    response.json(await listProductionAppointments(request.auth));
    return;
  }

  const database = await readDatabase(request.auth.businessId);
  const appointments = database.appointments
    .map(appointment => hydrateAppointment(database, appointment))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  response.json(appointments);
}));

router.post('/', asyncRoute(async (request, response) => {
  const input = readAppointmentInput(request.body);
  if (
    !input.clientId ||
    !input.serviceId ||
    !input.professionalId ||
    Number.isNaN(input.date.getTime())
  ) {
    response.status(400).json({
      error: 'Preencha cliente, serviço, profissional e horário corretamente.'
    });
    return;
  }
  if (input.recurrence && input.isFitIn) {
    response.status(400).json({
      error: 'Encaixe e recorrência são fluxos diferentes. Crie o encaixe como atendimento único.'
    });
    return;
  }
  if (input.recurrence) {
    const recurrenceError = validateRecurrenceRequest(input.recurrence);
    if (recurrenceError) {
      response.status(400).json({ error: recurrenceError });
      return;
    }
  }

  if (usesSupabaseAuth()) {
    try {
      const created = await createProductionAppointment(request.auth, input);
      if (!created) {
        response.status(500).json({ error: 'O agendamento foi criado, mas não pôde ser recarregado.' });
        return;
      }
      response.status(201).json(created);
    } catch (error) {
      if (!isProductionAgendaError(error)) throw error;
      response.status(error.status).json({
        error: error.message,
        ...(error.conflictAppointmentId
          ? { conflictAppointmentId: error.conflictAppointmentId }
          : {}),
        ...(input.isFitIn && error.status === 409 && error.conflictAppointmentId
          ? { requiresConflictConfirmation: true }
          : {})
      });
    }
    return;
  }

  const database = await readDatabase(request.auth.businessId);
  const client = database.clients.find(item => item.id === input.clientId);
  const service = database.services.find(item => item.id === input.serviceId && item.active);
  const professional = database.professionals.find(
    item => item.id === input.professionalId && item.active && item.servesClients
  );

  if (!client || !service || !professional || Number.isNaN(input.date.getTime())) {
    response.status(400).json({
      error: 'Preencha cliente, serviço, profissional e horário corretamente.'
    });
    return;
  }
  if (!professionalCanPerform(service, professional.id)) {
    response.status(400).json({
      error: 'Esse profissional não está habilitado para realizar o serviço escolhido.'
    });
    return;
  }

  if (input.recurrence) {
    const occurrences = buildRecurrenceOccurrences({
      baseDate: input.date,
      baseServiceId: service.id,
      timeZone: database.settings.timezone,
      recurrence: input.recurrence
    });
    if (!occurrences.length) {
      response.status(400).json({ error: 'Não foi possível montar a sequência recorrente.' });
      return;
    }

    const recurrenceId = randomUUID();
    const created: Appointment[] = [];
    for (const occurrence of occurrences) {
      const occurrenceService = database.services.find(
        item => item.id === occurrence.serviceId && item.active
      );
      if (!occurrenceService || !professionalCanPerform(occurrenceService, professional.id)) {
        response.status(409).json({
          error: `A sequência usa um serviço indisponível para ${professional.name}. Revise os serviços alternados.`
        });
        return;
      }
      const validation = validateAppointmentTime(
        database,
        professional.id,
        occurrenceService.durationMinutes,
        occurrenceService.bufferAfterMinutes,
        occurrence.date
      );
      if (validation) {
        const occurrenceLabel = formatDateTime(occurrence.date, database.settings.timezone);
        response.status(validation.status).json({
          error: `Recorrência interrompida em ${occurrenceLabel}: ${validation.message}`
        });
        return;
      }

      const appointment = buildAppointment({
        client,
        service: occurrenceService,
        professional,
        date: occurrence.date,
        notes: input.notes,
        settings: database.settings,
        source: 'recurrence',
        registeredByUserId: request.auth.userId,
        recurrenceId,
        recurrenceIndex: occurrence.index
      });
      database.appointments.push(appointment);
      created.push(appointment);
    }

    database.recurrenceSeries.push({
      id: recurrenceId,
      clientId: client.id,
      professionalId: professional.id,
      serviceIds: input.recurrence.serviceIds?.length
        ? input.recurrence.serviceIds
        : [service.id],
      frequency: input.recurrence.frequency,
      intervalWeeks: input.recurrence.frequency === 'biweekly'
        ? 2
        : Math.max(1, input.recurrence.intervalWeeks ?? 1),
      weekdays: input.recurrence.weekdays ?? [],
      startsAt: created[0].date,
      endsAt: created[created.length - 1].date,
      paused: false,
      createdAt: new Date().toISOString(),
      createdByUserId: request.auth.userId
    });
    appendAuditEvent(database, request.auth, {
      action: 'appointment.recurrence_created',
      entityType: 'recurrence_series',
      entityId: recurrenceId,
      metadata: { occurrences: created.length, professionalId: professional.id }
    });
    await saveDatabase(request.auth.businessId, database);
    response.status(201).json({
      appointment: hydrateAppointment(database, created[0]),
      appointments: created.map(item => hydrateAppointment(database, item)),
      recurrenceId
    });
    return;
  }

  const validation = validateAppointmentTime(
    database,
    professional.id,
    service.durationMinutes,
    service.bufferAfterMinutes,
    input.date,
    undefined
  );
  if (validation && validation.kind !== 'conflict') {
    response.status(validation.status).json({ error: validation.message });
    return;
  }
  const conflict = validation?.conflict ?? null;
  if (conflict && !input.isFitIn) {
    response.status(409).json({
      error: 'Esse profissional já possui um atendimento nesse período.',
      conflictAppointmentId: conflict.id
    });
    return;
  }
  if (input.isFitIn && conflict) {
    if (!input.conflictConfirmed || input.fitInReason.length < 5) {
      response.status(409).json({
        error: [
          'Este encaixe se sobrepõe a outro atendimento. ',
          'Confirme explicitamente o conflito e explique o motivo antes de salvar.'
        ].join(''),
        conflictAppointmentId: conflict.id,
        requiresConflictConfirmation: true
      });
      return;
    }
  }

  const appointment = buildAppointment({
    client,
    service,
    professional,
    date: input.date,
    notes: input.notes,
    settings: database.settings,
    source: input.isFitIn ? 'fit_in' : 'admin',
    registeredByUserId: request.auth.userId,
    isFitIn: input.isFitIn,
    fitInConflictAppointmentId: conflict?.id ?? null,
    fitInReason: input.isFitIn ? input.fitInReason : null
  });
  if (input.isFitIn && conflict) {
    appendAppointmentTimeline(appointment, 'fit_in_confirmed', {
      actorUserId: request.auth.userId,
      actorName: request.auth.displayName,
      note: input.fitInReason
    });
  }

  database.appointments.push(appointment);
  appendAuditEvent(database, request.auth, {
    action: input.isFitIn ? 'appointment.fit_in_created' : 'appointment.created',
    entityType: 'appointment',
    entityId: appointment.id,
    metadata: {
      startsAt: appointment.date,
      professionalId: professional.id,
      conflictAppointmentId: conflict?.id ?? null,
      conflictConfirmed: Boolean(conflict && input.conflictConfirmed)
    }
  });
  await saveDatabase(request.auth.businessId, database);
  response.status(201).json(hydrateAppointment(database, appointment));
}));

router.use(appointmentMutationRouter);

function readAppointmentInput(body: Record<string, unknown>) {
  const recurrence = body.recurrence && typeof body.recurrence === 'object'
    ? body.recurrence as RecurrenceRequest
    : null;
  return {
    clientId: normalizeText(body.clientId),
    serviceId: normalizeText(body.serviceId),
    professionalId: normalizeText(body.professionalId),
    date: new Date(normalizeText(body.date)),
    notes: normalizeOptionalText(body.notes),
    isFitIn: body.isFitIn === true,
    conflictConfirmed: body.conflictConfirmed === true,
    fitInReason: normalizeText(body.fitInReason),
    recurrence
  };
}

export { router as appointmentRouter };
