import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { readDatabase, saveDatabase } from '../../database/index.js';
import type { ScheduleBlockType } from '../../domain/types.js';
import { asyncRoute } from '../../middleware/asyncRoute.js';
import { requireRoles } from '../../middleware/authorization.js';
import {
  normalizeOptionalText,
  normalizeText
} from '../../utils/normalizers.js';
import { appendAuditEvent } from '../audit/audit.service.js';
import { usesSupabaseAuth } from '../auth/auth.provider.js';
import { buildAvailability } from './availability.service.js';
import { hasScheduleBlockConflict } from './schedule.service.js';
import { hasScheduleConflict } from '../appointments/appointment.service.js';
import { isProductionAgendaError } from '../appointments/appointment.production.errors.js';
import {
  createProductionScheduleBlock,
  deleteProductionScheduleBlock,
  listProductionScheduleBlocks,
  loadProductionAvailability
} from './scheduling.production.repository.js';

const router = Router();
const allowedBlockTypes: ScheduleBlockType[] = [
  'break',
  'closed',
  'personal',
  'maintenance',
  'other'
];

router.get('/availability', asyncRoute(async (request, response) => {
  const serviceId = normalizeText(request.query.serviceId);
  const professionalId = normalizeText(request.query.professionalId);
  const dateText = normalizeText(request.query.date);
  const ignoredAppointmentId = normalizeOptionalText(
    request.query.ignoredAppointmentId
  );
  if (!serviceId || !professionalId || !/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
    response.status(400).json({
      error: 'Escolha serviço, profissional e data para consultar a agenda.'
    });
    return;
  }

  if (usesSupabaseAuth()) {
    try {
      response.json(await loadProductionAvailability(request.auth, {
        serviceId,
        professionalId,
        date: dateText,
        ignoredAppointmentId: ignoredAppointmentId ?? undefined
      }));
    } catch (error) {
      sendSchedulingProductionError(response, error);
    }
    return;
  }

  const database = await readDatabase(request.auth.businessId);
  const service = database.services.find(item => item.id === serviceId && item.active);
  const professional = database.professionals.find(
    item => item.id === professionalId && item.active && item.servesClients
  );

  if (!service || !professional) {
    response.status(400).json({
      error: 'Escolha serviço, profissional e data para consultar a agenda.'
    });
    return;
  }

  response.json(buildAvailability(database, service, professional, dateText, {
    ignoredAppointmentId: ignoredAppointmentId ?? undefined
  }));
}));

router.use(requireRoles('owner', 'manager', 'receptionist'));

router.get('/blocks', asyncRoute(async (request, response) => {
  if (usesSupabaseAuth()) {
    response.json(await listProductionScheduleBlocks(request.auth));
    return;
  }

  const database = await readDatabase(request.auth.businessId);
  response.json(
    [...database.scheduleBlocks].sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
    )
  );
}));

router.post('/blocks', asyncRoute(async (request, response) => {
  const professionalId = normalizeOptionalText(request.body.professionalId);
  const startsAt = new Date(normalizeText(request.body.startsAt));
  const endsAt = new Date(normalizeText(request.body.endsAt));
  const reason = normalizeText(request.body.reason);
  const blockType = normalizeText(request.body.blockType) as ScheduleBlockType;

  if (
    Number.isNaN(startsAt.getTime()) ||
    Number.isNaN(endsAt.getTime()) ||
    endsAt <= startsAt ||
    reason.length < 3 ||
    !allowedBlockTypes.includes(blockType)
  ) {
    response.status(400).json({
      error: 'Informe início, fim, tipo e motivo do bloqueio corretamente.'
    });
    return;
  }

  if (usesSupabaseAuth()) {
    try {
      const block = await createProductionScheduleBlock(request.auth, {
        professionalId,
        startsAt,
        endsAt,
        blockType,
        reason
      });
      if (!block) {
        response.status(500).json({
          error: 'O bloqueio foi criado, mas não pôde ser recarregado.'
        });
        return;
      }
      response.status(201).json(block);
    } catch (error) {
      sendSchedulingProductionError(response, error);
    }
    return;
  }

  const database = await readDatabase(request.auth.businessId);

  if (professionalId) {
    const professional = database.professionals.find(
      item => item.id === professionalId && item.active
    );
    if (!professional) {
      response.status(400).json({ error: 'Profissional não encontrado.' });
      return;
    }
  }

  const affectedProfessionals = professionalId
    ? [professionalId]
    : database.professionals.filter(item => item.active && item.servesClients).map(item => item.id);

  const appointmentConflict = affectedProfessionals.some(id => (
    hasScheduleConflict(
      database,
      id,
      startsAt,
      Math.ceil((endsAt.getTime() - startsAt.getTime()) / 60_000)
    )
  ));

  if (appointmentConflict) {
    response.status(409).json({
      error: 'Já existe atendimento nesse período. Reagende ou cancele antes de bloquear.'
    });
    return;
  }

  const overlappingBlock = affectedProfessionals.some(id => (
    hasScheduleBlockConflict(database, id, startsAt, endsAt)
  ));

  if (overlappingBlock) {
    response.status(409).json({
      error: 'Esse período já possui um bloqueio. Ajuste o horário ou remova o bloqueio existente.'
    });
    return;
  }

  const block = {
    id: randomUUID(),
    professionalId,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    blockType,
    reason,
    createdByUserId: request.auth.userId,
    createdByName: request.auth.displayName,
    createdAt: new Date().toISOString()
  };

  database.scheduleBlocks.push(block);
  appendAuditEvent(database, request.auth, {
    action: 'schedule_block.created',
    entityType: 'schedule_block',
    entityId: block.id,
    metadata: { professionalId, blockType, reason }
  });
  await saveDatabase(request.auth.businessId, database);
  response.status(201).json(block);
}));

router.delete('/blocks/:id', asyncRoute(async (request, response) => {
  if (usesSupabaseAuth()) {
    try {
      await deleteProductionScheduleBlock(request.auth, request.params.id);
      response.status(204).end();
    } catch (error) {
      sendSchedulingProductionError(response, error);
    }
    return;
  }

  const database = await readDatabase(request.auth.businessId);
  const index = database.scheduleBlocks.findIndex(item => item.id === request.params.id);

  if (index < 0) {
    response.status(404).json({ error: 'Bloqueio não encontrado.' });
    return;
  }

  const [removed] = database.scheduleBlocks.splice(index, 1);
  appendAuditEvent(database, request.auth, {
    action: 'schedule_block.deleted',
    entityType: 'schedule_block',
    entityId: removed.id,
    metadata: { reason: removed.reason }
  });
  await saveDatabase(request.auth.businessId, database);
  response.status(204).end();
}));

function sendSchedulingProductionError(
  response: { status(code: number): { json(body: Record<string, unknown>): unknown } },
  error: unknown
): void {
  if (!isProductionAgendaError(error)) throw error;
  response.status(error.status).json({
    error: error.message,
    ...(error.conflictAppointmentId
      ? { conflictAppointmentId: error.conflictAppointmentId }
      : {})
  });
}

export { router as schedulingRouter };
