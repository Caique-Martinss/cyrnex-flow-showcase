import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { readDatabase, saveDatabase } from '../../database/index.js';
import type { Client } from '../../domain/types.js';
import { asyncRoute } from '../../middleware/asyncRoute.js';
import { optionalAuth } from '../../middleware/auth.js';
import { withBusinessLock } from '../../middleware/businessLock.js';
import { createRateLimiter } from '../../middleware/rateLimit.js';
import { requirePublicBookingSubscription } from '../../middleware/subscription.js';
import { isValidDateText } from '../../utils/timezone.js';
import {
  normalizeOptionalText,
  normalizePhone,
  normalizeText
} from '../../utils/normalizers.js';
import { buildAppointment } from '../appointments/appointment.factory.js';
import {
  appendAppointmentTimeline,
  hasScheduleConflict,
  hydrateAppointment
} from '../appointments/appointment.service.js';
import { professionalCanPerform } from '../appointments/appointment.validation.js';
import { findBusinessBySlug } from '../auth/auth.store.js';
import { usesSupabaseAuth } from '../auth/auth.provider.js';
import { buildPublicAvailability } from './availability.service.js';
import { publicBookingManagementRouter } from './publicBooking.management.routes.js';
import { loadPublicStaffContext } from './publicBooking.staffContext.js';
import {
  createProductionPublicBooking,
  loadProductionPublicAvailability,
  loadProductionPublicPage
} from './publicBooking.production.repository.js';

const router = Router();
const bookingCreationLimiter = createRateLimiter({
  windowMs: 10 * 60_000,
  max: 8,
  message: 'Muitas tentativas de agendamento. Aguarde alguns minutos e tente novamente.'
});

router.use('/bookings/manage', publicBookingManagementRouter);

router.get('/staff-context', optionalAuth, asyncRoute(async (request, response) => {
  const slug = normalizeText(request.query.slug).toLocaleLowerCase('pt-BR');
  if (!slug) {
    response.json({ staff: false });
    return;
  }
  response.json(await loadPublicStaffContext(request.auth, slug));
}));

router.get('/page', asyncRoute(async (request, response) => {
  const slug = normalizeText(request.query.slug);
  if (!slug) {
    response.status(400).json({ error: 'Informe a página da barbearia.' });
    return;
  }

  if (usesSupabaseAuth()) {
    response.json(await loadProductionPublicPage(slug));
    return;
  }

  const businessId = await resolveBusinessId(slug);
  if (!businessId) {
    response.status(404).json({ error: 'Barbearia não encontrada.' });
    return;
  }
  const database = await readDatabase(businessId);
  if (!database.settings.profile.publicPageEnabled) {
    response.status(404).json({ error: 'Esta página ainda não está publicada.' });
    return;
  }
  response.json({
    settings: database.settings,
    services: database.services.filter(item => item.active && item.onlineBookingEnabled),
    professionals: database.professionals.filter(item => (
      item.active && item.servesClients && item.acceptsOnlineBooking && item.publicVisible
    ))
  });
}));

router.get('/availability', requirePublicBookingSubscription, asyncRoute(async (request, response) => {
  const serviceId = normalizeText(request.query.serviceId);
  const professionalId = normalizeText(request.query.professionalId);
  const dateText = normalizeText(request.query.date);
  const slug = normalizeText(request.query.slug);
  if (usesSupabaseAuth()) {
    response.json(await loadProductionPublicAvailability({
      slug,
      serviceId,
      professionalId,
      date: dateText
    }));
    return;
  }

  const businessId = await resolveBusinessId(slug);
  if (!businessId) {
    response.status(404).json({ error: 'Barbearia não encontrada.' });
    return;
  }

  const database = await readDatabase(businessId);
  if (!database.settings.profile.publicPageEnabled) {
    response.status(404).json({ error: 'Esta página de agendamento não está disponível.' });
    return;
  }

  const service = database.services.find(item => (
    item.id === serviceId && item.active && item.onlineBookingEnabled
  ));
  const professional = database.professionals.find(item => (
    item.id === professionalId &&
    item.active &&
    item.servesClients &&
    item.acceptsOnlineBooking &&
    item.publicVisible
  ));
  const validDate = isValidDateText(dateText);

  if (!service || !professional || !validDate) {
    response.status(400).json({
      error: 'Escolha serviço, profissional e dia corretamente.'
    });
    return;
  }
  if (!professionalCanPerform(service, professional.id)) {
    response.status(400).json({
      error: 'Esse profissional não realiza o serviço escolhido.'
    });
    return;
  }

  response.json(
    buildPublicAvailability(database, service, professional, dateText)
  );
}));

router.post(
  '/bookings',
  bookingCreationLimiter,
  requirePublicBookingSubscription,
  asyncRoute(async (request, response) => {
  const slug = normalizeText(request.body.slug);
  if (usesSupabaseAuth()) {
    const result = await createProductionPublicBooking({
      slug,
      name: normalizeText(request.body.name).slice(0, 160),
      phone: normalizeText(request.body.phone).slice(0, 32),
      email: normalizeOptionalText(request.body.email)?.slice(0, 180) ?? null,
      serviceId: normalizeText(request.body.serviceId),
      professionalId: normalizeText(request.body.professionalId),
      startsAt: normalizeText(request.body.date),
      notes: normalizeOptionalText(request.body.notes)?.slice(0, 1000) ?? null
    });
    response.status(201).json(result);
    return;
  }

  const businessId = await resolveBusinessId(slug);
  if (!businessId) {
    response.status(404).json({ error: 'Barbearia não encontrada.' });
    return;
  }

  await withBusinessLock(businessId, async () => {
    const name = normalizeText(request.body.name).slice(0, 120);
    const phone = normalizeText(request.body.phone).slice(0, 32);
    const normalizedPhone = normalizePhone(phone);
    const email = normalizeOptionalText(request.body.email)?.slice(0, 180) ?? null;
    const serviceId = normalizeText(request.body.serviceId);
    const professionalId = normalizeText(request.body.professionalId);
    const dateText = normalizeText(request.body.date);
    const bookingDate = normalizeText(request.body.bookingDate);
    const parsedDate = new Date(dateText);

    const database = await readDatabase(businessId);
    if (!database.settings.profile.publicPageEnabled) {
      response.status(404).json({ error: 'Esta página de agendamento não está disponível.' });
      return;
    }

    const rules = database.settings.bookingRules;
    if (rules.requireClientName && name.length < 3) {
      response.status(400).json({ error: 'Informe seu nome para continuar.' });
      return;
    }
    if (rules.requireClientPhone && normalizedPhone.length < 10) {
      response.status(400).json({ error: 'Informe um WhatsApp válido com DDD.' });
      return;
    }
    if (rules.requireClientEmail && !isValidEmail(email)) {
      response.status(400).json({ error: 'Informe um e-mail válido para continuar.' });
      return;
    }
    if (email && !isValidEmail(email)) {
      response.status(400).json({ error: 'O e-mail informado não é válido.' });
      return;
    }

    const service = database.services.find(item => (
      item.id === serviceId && item.active && item.onlineBookingEnabled
    ));
    const professional = database.professionals.find(item => (
      item.id === professionalId &&
      item.active &&
      item.servesClients &&
      item.acceptsOnlineBooking &&
      item.publicVisible
    ));
    const validBookingDate = isValidDateText(bookingDate);

    if (!service || !professional || !validBookingDate || Number.isNaN(parsedDate.getTime())) {
      response.status(400).json({
        error: 'Escolha serviço, profissional e horário corretamente.'
      });
      return;
    }
    if (!professionalCanPerform(service, professional.id)) {
      response.status(400).json({
        error: 'Esse profissional não realiza o serviço escolhido.'
      });
      return;
    }

    const availability = buildPublicAvailability(database, service, professional, bookingDate);
    const selectedSlot = availability.slots.find(
      slot => slot.start === parsedDate.toISOString()
    );

    if (!selectedSlot || selectedSlot.status !== 'available') {
      response.status(409).json({
        error: 'Esse horário não está mais disponível. Escolha outro.'
      });
      return;
    }

    if (
      hasScheduleConflict(
        database,
        professional.id,
        parsedDate,
        service.durationMinutes,
        service.bufferAfterMinutes
      )
    ) {
      response.status(409).json({
        error: 'Esse horário acabou de ser reservado. Escolha outro.'
      });
      return;
    }

    const clientResult = findOrCreatePublicClient(database.clients, {
      name,
      phone,
      email
    });
    if (clientResult.created) database.clients.push(clientResult.client);

    const notes = rules.allowClientNotes
      ? normalizeOptionalText(request.body.notes)?.slice(0, 1000) ?? null
      : null;
    const appointment = buildAppointment({
      client: clientResult.client,
      service,
      professional,
      date: parsedDate,
      notes,
      settings: database.settings,
      source: 'public'
    });

    // A confirmação automática só conclui a etapa de confirmação quando não
    // existe sinal pendente. Pagamento real continuará dependendo do gateway.
    if (rules.confirmationMode === 'automatic' && appointment.depositStatus === 'waived') {
      appointment.status = 'confirmed';
      appointment.confirmedAt = new Date().toISOString();
      appendAppointmentTimeline(appointment, 'confirmed', {
        note: 'Confirmação automática conforme configuração da empresa.'
      });
    }

    database.appointments.push(appointment);
    await saveDatabase(businessId, database);

    response.status(201).json({
      appointment: hydrateAppointment(database, appointment),
      client: clientResult.client,
      existingClient: !clientResult.created,
      cancellationPolicy: database.settings.cancellationPolicy
    });
  });
}));

async function resolveBusinessId(value: unknown): Promise<string | null> {
  const slug = normalizeText(value);
  if (!slug) return null;
  const result = await findBusinessBySlug(slug);
  return result?.businessId ?? null;
}

function findOrCreatePublicClient(
  clients: Client[],
  input: { name: string; phone: string; email: string | null }
): { client: Client; created: boolean } {
  const normalizedPhone = normalizePhone(input.phone);
  const normalizedName = normalizeComparableText(input.name);
  const exact = clients.find(item => (
    normalizePhone(item.phone) === normalizedPhone &&
    normalizeComparableText(item.name) === normalizedName
  ));

  // Sem verificação por código/WhatsApp, a página pública não pode sobrescrever
  // nome ou e-mail de um cadastro existente apenas porque alguém digitou o telefone.
  if (exact) return { client: exact, created: false };

  return {
    client: createClient(input),
    created: true
  };
}

function createClient(input: {
  name: string;
  phone: string;
  email: string | null;
}): Client {
  return {
    id: randomUUID(),
    name: input.name,
    phone: input.phone,
    email: input.email,
    lastVisit: null,
    totalSpend: 0,
    appointments: 0,
    createdAt: new Date().toISOString()
  };
}

function normalizeComparableText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('pt-BR');
}

function isValidEmail(value: string | null): boolean {
  return Boolean(value && /^\S+@\S+\.\S+$/.test(value));
}

export { router as publicBookingRouter };
