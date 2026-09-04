import { Router, type Request } from 'express';
import { asyncRoute } from '../../middleware/asyncRoute.js';
import { createRateLimiter } from '../../middleware/rateLimit.js';
import { normalizeText } from '../../utils/normalizers.js';
import { usesSupabaseAuth } from '../auth/auth.provider.js';
import { submitProductionPublicBookingPaymentProof } from './publicBooking.management.repository.js';

const router = Router();
const uploadLimiter = createRateLimiter({
  windowMs: 15 * 60_000,
  max: 6,
  message: 'Muitos comprovantes enviados em pouco tempo. Aguarde alguns minutos e tente novamente.'
});

router.post('/', uploadLimiter, asyncRoute(async (request, response) => {
  if (!usesSupabaseAuth()) {
    response.status(404).json({ error: 'O envio real de comprovante fica disponível no ambiente online.' });
    return;
  }
  const slug = normalizeText(request.body.slug);
  const dataUrl = normalizeText(request.body.dataUrl);
  if (!slug) {
    response.status(400).json({ error: 'Página da barbearia não informada.' });
    return;
  }
  if (!dataUrl.startsWith('data:')) {
    response.status(400).json({ error: 'Selecione um comprovante válido.' });
    return;
  }
  response.json(await submitProductionPublicBookingPaymentProof({
    slug,
    token: accessToken(request),
    dataUrl
  }));
}));

function accessToken(request: Request): string {
  const value = String(request.get('x-booking-access-token') ?? '').trim();
  if (!value) {
    throw Object.assign(new Error('Agendamento não encontrado ou link expirado.'), { status: 404 });
  }
  return value;
}

export { router as publicBookingPaymentProofRouter };
