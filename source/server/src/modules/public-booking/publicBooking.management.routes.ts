import { Router, type Request } from 'express';
import { asyncRoute } from '../../middleware/asyncRoute.js';
import { createRateLimiter } from '../../middleware/rateLimit.js';
import { isValidDateText } from '../../utils/timezone.js';
import { normalizeOptionalText, normalizeText } from '../../utils/normalizers.js';
import { usesSupabaseAuth } from '../auth/auth.provider.js';
import {
  cancelProductionPublicBooking,
  loadProductionPublicBookingManagement,
  loadProductionPublicBookingManagementSettings,
  loadProductionPublicBookingManagementAvailability,
  rescheduleProductionPublicBooking
} from './publicBooking.management.repository.js';

const router = Router();
const readLimiter = createRateLimiter({
  windowMs: 10 * 60_000,
  max: 80,
  message: 'Muitas consultas ao agendamento. Aguarde alguns minutos e tente novamente.'
});
const mutationLimiter = createRateLimiter({
  windowMs: 15 * 60_000,
  max: 12,
  message: 'Muitas alterações em pouco tempo. Aguarde alguns minutos e tente novamente.'
});

router.use(readLimiter);

router.get('/', asyncRoute(async (request, response) => {
  ensureProductionManagement();
  const slug = requiredSlug(request.query.slug);
  const token = accessToken(request);
  const [management, settings] = await Promise.all([
    loadProductionPublicBookingManagement({ slug, token }),
    loadProductionPublicBookingManagementSettings(slug)
  ]);
  response.json({ management, settings });
}));

router.get('/availability', asyncRoute(async (request, response) => {
  ensureProductionManagement();
  const date = normalizeText(request.query.date);
  if (!isValidDateText(date)) {
    response.status(400).json({ error: 'Escolha uma data válida para reagendar.' });
    return;
  }
  response.json(await loadProductionPublicBookingManagementAvailability({
    slug: requiredSlug(request.query.slug),
    token: accessToken(request),
    date
  }));
}));

router.patch('/reschedule', mutationLimiter, asyncRoute(async (request, response) => {
  ensureProductionManagement();
  const startsAt = normalizeText(request.body.startsAt);
  if (!startsAt || Number.isNaN(new Date(startsAt).getTime())) {
    response.status(400).json({ error: 'Escolha um novo horário válido.' });
    return;
  }
  response.json(await rescheduleProductionPublicBooking({
    slug: requiredSlug(request.body.slug),
    token: accessToken(request),
    startsAt
  }));
}));

router.patch('/cancel', mutationLimiter, asyncRoute(async (request, response) => {
  ensureProductionManagement();
  response.json(await cancelProductionPublicBooking({
    slug: requiredSlug(request.body.slug),
    token: accessToken(request),
    reason: normalizeOptionalText(request.body.reason)?.slice(0, 500) ?? null
  }));
}));


function accessToken(request: Request): string {
  const value = String(request.get('x-booking-access-token') ?? '').trim();
  if (!value) {
    throw Object.assign(
      new Error('Agendamento não encontrado ou link expirado.'),
      { status: 404 }
    );
  }
  return value;
}

function requiredSlug(value: unknown): string {
  const slug = normalizeText(value);
  if (!slug) {
    throw Object.assign(new Error('Página da barbearia não informada.'), { status: 400 });
  }
  return slug;
}

function ensureProductionManagement(): void {
  if (usesSupabaseAuth()) return;
  throw Object.assign(
    new Error('O link persistente do agendamento fica disponível no ambiente online.'),
    { status: 404 }
  );
}

export { router as publicBookingManagementRouter };
