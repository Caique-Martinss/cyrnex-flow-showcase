import { Router } from 'express';
import { asyncRoute } from '../../middleware/asyncRoute.js';
import { requireBusinessAdmin } from '../../middleware/authorization.js';
import { isBusinessSlugAvailable } from '../auth/auth.store.js';
import { usesSupabaseAuth } from '../auth/auth.provider.js';
import {
  getOnboardingState,
  saveOnboardingState
} from './onboarding.service.js';
import { isSaveOnboardingPayload } from './onboarding.payload.js';
import { validateOnboarding } from './onboarding.validation.js';
import { isProductionBusinessSlugAvailable } from './onboarding.production.repository.js';

const router = Router();
router.use(requireBusinessAdmin);

router.get('/', asyncRoute(async (request, response) => {
  response.json(await getOnboardingState(request.auth.businessId, request.auth));
}));

router.put('/', asyncRoute(async (request, response) => {
  if (!isSaveOnboardingPayload(request.body)) {
    response.status(400).json({ error: 'Dados de configuração inválidos.' });
    return;
  }

  const input = request.body;
  const errors = validateOnboarding(input, false);
  const slugAvailable = usesSupabaseAuth()
    ? await isProductionBusinessSlugAvailable(request.auth, input.settings.bookingSlug)
    : await isBusinessSlugAvailable(
      request.auth.businessId,
      input.settings.bookingSlug
    );
  if (!slugAvailable) {
    errors.unshift(
      'Esse endereço público já está em uso. Escolha outro link para sua barbearia.'
    );
  }

  if (errors.length > 0) {
    response.status(400).json({ error: errors[0], errors });
    return;
  }

  response.json(await saveOnboardingState(request.auth.businessId, input, false, request.auth));
}));

router.post('/complete', asyncRoute(async (request, response) => {
  if (!isSaveOnboardingPayload(request.body)) {
    response.status(400).json({ error: 'Dados de configuração inválidos.' });
    return;
  }

  const input = request.body;
  const errors = validateOnboarding(input, true);
  const slugAvailable = usesSupabaseAuth()
    ? await isProductionBusinessSlugAvailable(request.auth, input.settings.bookingSlug)
    : await isBusinessSlugAvailable(
      request.auth.businessId,
      input.settings.bookingSlug
    );
  if (!slugAvailable) {
    errors.unshift(
      'Esse endereço público já está em uso. Escolha outro link para sua barbearia.'
    );
  }

  if (errors.length > 0) {
    response.status(400).json({ error: errors[0], errors });
    return;
  }

  response.json(await saveOnboardingState(request.auth.businessId, input, true, request.auth));
}));

export { router as onboardingRouter };
