import { localAuthRouter } from './localAuth.routes.js';
import { productionAuthRouter } from './productionAuth.routes.js';
import { usesSupabaseAuth } from './auth.provider.js';

export const authRouter = usesSupabaseAuth()
  ? productionAuthRouter
  : localAuthRouter;
