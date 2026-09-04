import { Router } from 'express';
import { readDatabase } from '../../database/index.js';
import { asyncRoute } from '../../middleware/asyncRoute.js';
import { usesSupabaseAuth } from '../auth/auth.provider.js';
import { requireFinancialAccess } from '../../middleware/authorization.js';
import { loadProductionDashboard } from './dashboard.production.repository.js';
import { buildDashboard } from './dashboard.service.js';

const router = Router();

router.get('/', requireFinancialAccess, asyncRoute(async (request, response) => {
  if (usesSupabaseAuth()) {
    response.json(await loadProductionDashboard(request.auth));
    return;
  }

  const database = await readDatabase(request.auth.businessId);
  response.json(buildDashboard(database));
}));

export { router as dashboardRouter };
