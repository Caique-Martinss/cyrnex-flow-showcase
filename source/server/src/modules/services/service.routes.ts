import { Router } from 'express';
import { readDatabase } from '../../database/index.js';
import { asyncRoute } from '../../middleware/asyncRoute.js';
import { usesSupabaseAuth } from '../auth/auth.provider.js';
import { listProductionServices } from './service.repository.js';

const router = Router();

router.get('/', asyncRoute(async (request, response) => {
  if (usesSupabaseAuth()) {
    response.json(await listProductionServices(request.auth));
    return;
  }
  const database = await readDatabase(request.auth.businessId);
  response.json(database.services.filter(service => service.active));
}));

export { router as serviceRouter };
