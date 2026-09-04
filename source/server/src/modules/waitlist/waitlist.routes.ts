import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { readDatabase, saveDatabase } from '../../database/index.js';
import type { WaitlistStatus } from '../../domain/types.js';
import { asyncRoute } from '../../middleware/asyncRoute.js';
import { requireRoles } from '../../middleware/authorization.js';
import { normalizeOptionalText, normalizeText } from '../../utils/normalizers.js';
import { appendAuditEvent } from '../audit/audit.service.js';
import { usesSupabaseAuth } from '../auth/auth.provider.js';
import { isProductionAgendaError } from '../appointments/appointment.production.errors.js';
import {
  createProductionWaitlistEntry,
  listProductionWaitlist,
  listProductionWaitlistMatches,
  setProductionWaitlistStatus
} from './waitlist.production.repository.js';

const router = Router();
router.use(requireRoles('owner', 'manager', 'receptionist'));
const allowedStatuses: WaitlistStatus[] = ['waiting', 'contacted', 'booked', 'cancelled'];

router.get('/', asyncRoute(async (request, response) => {
  if (usesSupabaseAuth()) {
    response.json(await listProductionWaitlist(request.auth));
    return;
  }

  const database = await readDatabase(request.auth.businessId);
  response.json([...database.waitlistEntries].sort(
    (a, b) => new Date(a.desiredFrom).getTime() - new Date(b.desiredFrom).getTime()
  ));
}));

router.get('/matches', asyncRoute(async (request, response) => {
  const startsAt = new Date(normalizeText(request.query.startsAt));
  const serviceId = normalizeText(request.query.serviceId);
  const professionalId = normalizeText(request.query.professionalId);
  if (Number.isNaN(startsAt.getTime()) || !serviceId || !professionalId) {
    response.status(400).json({ error: 'Informe serviço, profissional e horário da vaga.' });
    return;
  }
  if (usesSupabaseAuth()) {
    response.json(await listProductionWaitlistMatches(request.auth, {
      startsAt,
      serviceId,
      professionalId
    }));
    return;
  }

  const database = await readDatabase(request.auth.businessId);
  const slotTime = startsAt.getTime();
  response.json(database.waitlistEntries.filter(item => (
    item.status === 'waiting' &&
    item.serviceId === serviceId &&
    (!item.professionalId || item.professionalId === professionalId) &&
    new Date(item.desiredFrom).getTime() <= slotTime &&
    new Date(item.desiredTo).getTime() >= slotTime
  )));
}));

router.post('/', asyncRoute(async (request, response) => {
  const clientId = normalizeText(request.body.clientId);
  const serviceId = normalizeText(request.body.serviceId);
  const professionalId = normalizeOptionalText(request.body.professionalId);
  const desiredFrom = new Date(normalizeText(request.body.desiredFrom));
  const desiredTo = new Date(normalizeText(request.body.desiredTo));
  const notes = normalizeOptionalText(request.body.notes);
  const invalidWindow = Number.isNaN(desiredFrom.getTime())
    || Number.isNaN(desiredTo.getTime())
    || desiredTo <= desiredFrom;

  if (!clientId || !serviceId || invalidWindow) {
    response.status(400).json({ error: 'Informe cliente, serviço e uma janela de interesse válida.' });
    return;
  }

  if (usesSupabaseAuth()) {
    try {
      const entry = await createProductionWaitlistEntry(request.auth, {
        clientId,
        serviceId,
        professionalId,
        desiredFrom,
        desiredTo,
        notes
      });
      if (!entry) {
        response.status(500).json({ error: 'A entrada foi criada, mas não pôde ser recarregada.' });
        return;
      }
      response.status(201).json(entry);
    } catch (error) {
      sendWaitlistProductionError(response, error);
    }
    return;
  }

  const database = await readDatabase(request.auth.businessId);
  if (!database.settings.bookingRules.allowWaitlist) {
    response.status(409).json({ error: 'A lista de espera está desativada nas regras de agendamento.' });
    return;
  }
  const client = database.clients.find(item => item.id === clientId);
  const service = database.services.find(item => item.id === serviceId && item.active);
  const professional = professionalId
    ? database.professionals.find(item => item.id === professionalId && item.active && item.servesClients)
    : null;

  if (!client || !service) {
    response.status(400).json({ error: 'Informe cliente, serviço e uma janela de interesse válida.' });
    return;
  }
  if (professionalId && !professional) {
    response.status(400).json({ error: 'O profissional escolhido não está disponível.' });
    return;
  }
  if (professional && service.professionalIds.length && !service.professionalIds.includes(professional.id)) {
    response.status(400).json({ error: 'O profissional escolhido não realiza esse serviço.' });
    return;
  }

  const duplicate = database.waitlistEntries.find(item => (
    ['waiting', 'contacted'].includes(item.status) &&
    item.clientId === clientId &&
    item.serviceId === serviceId &&
    (item.professionalId ?? null) === (professionalId ?? null) &&
    new Date(item.desiredFrom).getTime() < desiredTo.getTime() &&
    new Date(item.desiredTo).getTime() > desiredFrom.getTime()
  ));
  if (duplicate) {
    response.status(409).json({
      error: 'Esse cliente já está na lista de espera para uma janela compatível.'
    });
    return;
  }

  const entry = {
    id: randomUUID(),
    clientId,
    serviceId,
    professionalId: professionalId ?? null,
    desiredFrom: desiredFrom.toISOString(),
    desiredTo: desiredTo.toISOString(),
    notes: notes ?? null,
    status: 'waiting' as const,
    createdAt: new Date().toISOString()
  };
  database.waitlistEntries.push(entry);
  appendAuditEvent(database, request.auth, {
    action: 'waitlist.created',
    entityType: 'waitlist_entry',
    entityId: entry.id,
    metadata: { clientId, serviceId, professionalId: professionalId ?? null }
  });
  await saveDatabase(request.auth.businessId, database);
  response.status(201).json(entry);
}));

router.patch('/:id/status', asyncRoute(async (request, response) => {
  const status = normalizeText(request.body.status) as WaitlistStatus;
  if (!allowedStatuses.includes(status)) {
    response.status(400).json({ error: 'Status da lista de espera inválido.' });
    return;
  }
  if (usesSupabaseAuth()) {
    try {
      const entry = await setProductionWaitlistStatus(request.auth, request.params.id, status);
      if (!entry) {
        response.status(404).json({ error: 'Entrada da lista de espera não encontrada.' });
        return;
      }
      response.json(entry);
    } catch (error) {
      sendWaitlistProductionError(response, error);
    }
    return;
  }

  const database = await readDatabase(request.auth.businessId);
  const entry = database.waitlistEntries.find(item => item.id === request.params.id);
  if (!entry) {
    response.status(404).json({ error: 'Entrada da lista de espera não encontrada.' });
    return;
  }
  const previousStatus = entry.status;
  if (previousStatus === status) {
    response.status(409).json({ error: 'Essa entrada já está nesse status.' });
    return;
  }
  const transitions: Record<WaitlistStatus, WaitlistStatus[]> = {
    waiting: ['contacted', 'booked', 'cancelled'],
    contacted: ['waiting', 'booked', 'cancelled'],
    booked: [],
    cancelled: []
  };
  if (!transitions[previousStatus].includes(status)) {
    response.status(409).json({
      error: 'Essa mudança não faz parte do fluxo da lista de espera.'
    });
    return;
  }
  entry.status = status;
  appendAuditEvent(database, request.auth, {
    action: 'waitlist.status_changed',
    entityType: 'waitlist_entry',
    entityId: entry.id,
    metadata: { previousStatus, status }
  });
  await saveDatabase(request.auth.businessId, database);
  response.json(entry);
}));

function sendWaitlistProductionError(
  response: { status(code: number): { json(body: Record<string, unknown>): unknown } },
  error: unknown
): void {
  if (!isProductionAgendaError(error)) throw error;
  response.status(error.status).json({ error: error.message });
}

export { router as waitlistRouter };
