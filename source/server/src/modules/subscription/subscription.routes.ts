import { Router } from 'express';
import { asyncRoute } from '../../middleware/asyncRoute.js';
import { loadBusinessSubscription } from './subscription.repository.js';

export const subscriptionRouter = Router();

subscriptionRouter.get('/status', asyncRoute(async (request, response) => {
  response.json(await loadBusinessSubscription(request.auth.businessId));
}));
