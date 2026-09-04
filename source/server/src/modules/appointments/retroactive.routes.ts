import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { readDatabase, saveDatabase } from '../../database/index.js';
import type {
  PaymentMethod,
  RetroactiveProofType
} from '../../domain/types.js';
import { asyncRoute } from '../../middleware/asyncRoute.js';
import {
  normalizeMoney,
  normalizeOptionalText,
  normalizeText
} from '../../utils/normalizers.js';
import { appendAuditEvent } from '../audit/audit.service.js';
import { usesSupabaseAuth } from '../auth/auth.provider.js';
import { buildAppointment } from './appointment.factory.js';
import {
  approveProductionRetroactiveRequest,
  createProductionRetroactiveRequest,
  listProductionRetroactiveRequests,
  rejectProductionRetroactiveRequest
} from './retroactive.production.repository.js';
import { sendRetroactiveProductionError } from './retroactive.production.response.js';
import {
  appendAppointmentTimeline,
  applyAppointmentCompletion,
  findScheduleConflict,
  hydrateAppointment
} from './appointment.service.js';

const router = Router();
const paymentMethods: PaymentMethod[] = ['cash', 'pix', 'debit', 'credit', 'other'];
const proofTypes: RetroactiveProofType[] = [
  'payment_record',
  'receipt',
  'client_confirmation',
  'other'
];

router.get('/', asyncRoute(async (request, response) => {
  if (usesSupabaseAuth()) {
    response.json(await listProductionRetroactiveRequests(request.auth));
    return;
  }

  const database = await readDatabase(request.auth.businessId);
  const visible = request.auth.role === 'owner' || request.auth.role === 'manager'
    ? database.retroactiveRequests
    : database.retroactiveRequests.filter(
        item => item.requestedByUserId === request.auth.userId
      );

  response.json(
    [...visible].sort(
      (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
    )
  );
}));

router.post('/', asyncRoute(async (request, response) => {
  const clientId = normalizeText(request.body.clientId);
  const serviceId = normalizeText(request.body.serviceId);
  const professionalId = normalizeText(request.body.professionalId);
  const startsAt = new Date(normalizeText(request.body.startsAt));
  const price = normalizeMoney(request.body.price);
  const paymentMethod = normalizeText(request.body.paymentMethod) as PaymentMethod;
  const notes = normalizeOptionalText(request.body.notes);
  const reason = normalizeText(request.body.reason);
  const proofType = normalizeText(request.body.proofType) as RetroactiveProofType;
  const proofReference = normalizeText(request.body.proofReference);
  const proofDescription = normalizeText(request.body.proofDescription);

  if (!clientId || !serviceId || !professionalId) {
    response.status(400).json({
      error: 'Selecione cliente, serviço e profissional cadastrados.'
    });
    return;
  }
  if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() >= Date.now()) {
    response.status(400).json({
      error: 'O atendimento passado precisa ter uma data e hora anteriores ao momento atual.'
    });
    return;
  }
  if (Number.isNaN(price) || price < 0) {
    response.status(400).json({ error: 'Informe o valor real cobrado no atendimento.' });
    return;
  }
  if (!paymentMethods.includes(paymentMethod)) {
    response.status(400).json({ error: 'Selecione como o atendimento foi pago.' });
    return;
  }
  if (!proofTypes.includes(proofType) || proofDescription.length < 5) {
    response.status(400).json({
      error: 'Informe como esse atendimento pode ser comprovado e descreva a evidência.'
    });
    return;
  }
  if (proofReference.length < 3) {
    response.status(400).json({
      error: 'Informe uma referência verificável da comprovação, como ID do Pix, número do recibo ou ' +
        'registro da confirmação do cliente.'
    });
    return;
  }
  if (reason.length < 5) {
    response.status(400).json({
      error: 'Explique por que o atendimento não foi registrado no momento correto.'
    });
    return;
  }

  if (usesSupabaseAuth()) {
    try {
      const item = await createProductionRetroactiveRequest(request.auth, {
        clientId, serviceId, professionalId, startsAt, price, paymentMethod, notes, reason,
        proofType, proofReference, proofDescription
      });
      if (!item) {
        response.status(500).json({ error: 'A solicitação foi criada, mas não pôde ser recarregada.' });
        return;
      }
      response.status(201).json(item);
    } catch (error) {
      sendRetroactiveProductionError(response, error);
    }
    return;
  }

  const database = await readDatabase(request.auth.businessId);
  const client = database.clients.find(item => item.id === clientId);
  const service = database.services.find(item => item.id === serviceId && item.active);
  const professional = database.professionals.find(
    item => item.id === professionalId && item.active && item.servesClients
  );
  if (!client || !service || !professional) {
    response.status(400).json({ error: 'Selecione cliente, serviço e profissional cadastrados.' });
    return;
  }

  const conflict = findScheduleConflict(
    database,
    professional.id,
    startsAt,
    service.durationMinutes,
    service.bufferAfterMinutes
  );

  const item = {
    id: randomUUID(),
    clientId,
    serviceId,
    professionalId,
    startsAt: startsAt.toISOString(),
    price,
    paymentMethod,
    notes,
    reason,
    proofType,
    proofReference,
    proofDescription,
    evidenceConfirmed: false,
    status: 'pending' as const,
    requestedByUserId: request.auth.userId,
    requestedByName: request.auth.displayName,
    requestedByRole: request.auth.role,
    requestedAt: new Date().toISOString(),
    reviewedByUserId: null,
    reviewedByName: null,
    reviewedAt: null,
    reviewNote: null,
    createdAppointmentId: null,
    conflictAppointmentId: conflict?.id ?? null,
    conflictConfirmed: false,
    conflictJustification: null
  };

  database.retroactiveRequests.push(item);
  appendAuditEvent(database, request.auth, {
    action: 'retroactive_service.requested',
    entityType: 'retroactive_service_request',
    entityId: item.id,
    metadata: {
      startsAt: item.startsAt,
      price,
      proofType,
      professionalId,
      conflictAppointmentId: conflict?.id ?? null
    }
  });
  await saveDatabase(request.auth.businessId, database);
  response.status(201).json(item);
}));

router.patch('/:id/approve', asyncRoute(async (request, response) => {
  if (request.auth.role !== 'owner' && request.auth.role !== 'manager') {
    response.status(403).json({
      error: 'Somente dono ou gerente pode aprovar um atendimento lançado depois.'
    });
    return;
  }

  if (request.body.evidenceConfirmed !== true) {
    response.status(400).json({
      error: 'Confirme que a evidência foi realmente conferida antes de aprovar o lançamento.'
    });
    return;
  }

  if (usesSupabaseAuth()) {
    try {
      const result = await approveProductionRetroactiveRequest(request.auth, request.params.id, {
        evidenceConfirmed: true,
        confirmConflict: request.body.confirmConflict === true,
        conflictJustification: normalizeText(request.body.conflictJustification),
        reviewNote: normalizeOptionalText(request.body.reviewNote)
      });
      if (!result.request || !result.appointment) {
        response.status(500).json({ error: 'A aprovação foi concluída, mas não pôde ser recarregada.' });
        return;
      }
      response.json(result);
    } catch (error) {
      sendRetroactiveProductionError(response, error, true);
    }
    return;
  }

  const database = await readDatabase(request.auth.businessId);
  const item = database.retroactiveRequests.find(entry => entry.id === request.params.id);
  if (!item) {
    response.status(404).json({ error: 'Solicitação não encontrada.' });
    return;
  }
  if (item.status !== 'pending') {
    response.status(409).json({ error: 'Essa solicitação já foi analisada.' });
    return;
  }
  if (request.auth.role === 'manager' && item.requestedByRole !== 'professional' &&
      item.requestedByRole !== 'receptionist') {
    response.status(403).json({
      error: 'Gerentes só podem aprovar lançamentos feitos por profissionais ou recepcionistas. ' +
        'Lançamentos de gerente ou dono precisam da validação do dono.'
    });
    return;
  }
  if (item.requestedByUserId === request.auth.userId && request.auth.role !== 'owner') {
    response.status(403).json({
      error: 'Você não pode aprovar o próprio lançamento. Peça para outro responsável autorizado revisar.'
    });
    return;
  }

  const client = database.clients.find(entry => entry.id === item.clientId);
  const service = database.services.find(entry => entry.id === item.serviceId);
  const professional = database.professionals.find(
    entry => entry.id === item.professionalId
  );
  if (!client || !service || !professional) {
    response.status(409).json({
      error: 'Os dados originais mudaram. Revise cliente, serviço e profissional antes de aprovar.'
    });
    return;
  }

  const startsAt = new Date(item.startsAt);
  const conflict = findScheduleConflict(
    database,
    professional.id,
    startsAt,
    service.durationMinutes,
    service.bufferAfterMinutes
  );
  const conflictJustification = normalizeText(request.body.conflictJustification);
  if (conflict && (request.body.confirmConflict !== true || conflictJustification.length < 5)) {
    response.status(409).json({
      error: [
        'Existe outro atendimento no mesmo período. Para aprovar mesmo assim, ',
        'confirme explicitamente o conflito e registre uma justificativa.'
      ].join(''),
      conflictAppointmentId: conflict.id,
      requiresConflictConfirmation: true
    });
    return;
  }

  const appointment = buildAppointment({
    client,
    service,
    professional,
    date: startsAt,
    notes: item.notes,
    settings: database.settings,
    source: 'retroactive',
    registeredByUserId: item.requestedByUserId,
    priceOverride: item.price,
    fitInConflictAppointmentId: conflict?.id ?? null,
    fitInReason: conflict ? conflictJustification : null
  });
  appointment.depositPercent = 0;
  appointment.depositAmount = 0;
  appointment.depositStatus = 'waived';
  appointment.actualStartedAt = startsAt.toISOString();
  appendAppointmentTimeline(appointment, 'started', {
    actorUserId: item.requestedByUserId,
    actorName: item.requestedByName,
    at: startsAt,
    note: 'Horário real informado no lançamento retroativo.'
  });
  const completedAt = new Date(
    startsAt.getTime() + service.durationMinutes * 60_000
  );
  applyAppointmentCompletion(
    database,
    appointment,
    item.paymentMethod,
    0,
    completedAt
  );
  if (conflict) {
    appendAppointmentTimeline(appointment, 'fit_in_confirmed', {
      actorUserId: request.auth.userId,
      actorName: request.auth.displayName,
      note: `Conflito retroativo aprovado: ${conflictJustification}`
    });
  }
  database.appointments.push(appointment);

  item.status = 'approved';
  item.evidenceConfirmed = true;
  item.reviewedByUserId = request.auth.userId;
  item.reviewedByName = request.auth.displayName;
  item.reviewedAt = new Date().toISOString();
  item.reviewNote = normalizeOptionalText(request.body.reviewNote);
  item.createdAppointmentId = appointment.id;
  item.conflictAppointmentId = conflict?.id ?? item.conflictAppointmentId;
  item.conflictConfirmed = Boolean(conflict);
  item.conflictJustification = conflict ? conflictJustification : null;

  appendAuditEvent(database, request.auth, {
    action: 'retroactive_service.approved',
    entityType: 'retroactive_service_request',
    entityId: item.id,
    metadata: {
      appointmentId: appointment.id,
      selfApproval: item.requestedByUserId === request.auth.userId,
      evidenceConfirmed: true,
      conflictAppointmentId: conflict?.id ?? null,
      conflictConfirmed: Boolean(conflict)
    }
  });
  await saveDatabase(request.auth.businessId, database);
  response.json({
    request: item,
    appointment: hydrateAppointment(database, appointment)
  });
}));

router.patch('/:id/reject', asyncRoute(async (request, response) => {
  if (request.auth.role !== 'owner' && request.auth.role !== 'manager') {
    response.status(403).json({
      error: 'Somente dono ou gerente pode rejeitar esse lançamento.'
    });
    return;
  }

  const reviewNote = normalizeText(request.body.reviewNote);
  if (reviewNote.length < 3) {
    response.status(400).json({
      error: 'Explique brevemente por que o lançamento foi rejeitado.'
    });
    return;
  }

  if (usesSupabaseAuth()) {
    try {
      const item = await rejectProductionRetroactiveRequest(
        request.auth, request.params.id, reviewNote
      );
      if (!item) {
        response.status(404).json({ error: 'Solicitação não encontrada.' });
        return;
      }
      response.json(item);
    } catch (error) {
      sendRetroactiveProductionError(response, error);
    }
    return;
  }

  const database = await readDatabase(request.auth.businessId);
  const item = database.retroactiveRequests.find(entry => entry.id === request.params.id);
  if (!item) {
    response.status(404).json({ error: 'Solicitação não encontrada.' });
    return;
  }
  if (item.status !== 'pending') {
    response.status(409).json({ error: 'Essa solicitação já foi analisada.' });
    return;
  }
  if (request.auth.role === 'manager' && item.requestedByRole !== 'professional' &&
      item.requestedByRole !== 'receptionist') {
    response.status(403).json({
      error: 'Gerentes só podem revisar lançamentos feitos por profissionais ou recepcionistas. ' +
        'Lançamentos de gerente ou dono precisam da validação do dono.'
    });
    return;
  }
  if (item.requestedByUserId === request.auth.userId && request.auth.role !== 'owner') {
    response.status(403).json({
      error: 'Você não pode revisar o próprio lançamento. Peça para outro responsável autorizado revisar.'
    });
    return;
  }

  item.status = 'rejected';
  item.reviewedByUserId = request.auth.userId;
  item.reviewedByName = request.auth.displayName;
  item.reviewedAt = new Date().toISOString();
  item.reviewNote = reviewNote;

  appendAuditEvent(database, request.auth, {
    action: 'retroactive_service.rejected',
    entityType: 'retroactive_service_request',
    entityId: item.id,
    metadata: { reviewNote }
  });
  await saveDatabase(request.auth.businessId, database);
  response.json(item);
}));

export { router as retroactiveRouter };
