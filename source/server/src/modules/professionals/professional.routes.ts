import { Router } from 'express';
import { readDatabase } from '../../database/index.js';
import { asyncRoute } from '../../middleware/asyncRoute.js';
import { usesSupabaseAuth } from '../auth/auth.provider.js';
import { listProductionProfessionals } from './professional.repository.js';

const router = Router();

router.get('/', asyncRoute(async (request, response) => {
  if (usesSupabaseAuth()) {
    response.json(await listProductionProfessionals(request.auth));
    return;
  }
  const database = await readDatabase(request.auth.businessId);
  response.json(
    database.professionals.filter(professional => professional.active)
  );
}));

export { router as professionalRouter };
