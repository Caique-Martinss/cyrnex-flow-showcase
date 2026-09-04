import type { AuthContext } from '../modules/auth/auth.types.js';
import type { PlatformAdminContext } from '../modules/platform-admin/platformAdmin.types.js';

declare global {
  namespace Express {
    interface Request {
      auth: AuthContext;
      platformAdmin?: PlatformAdminContext;
    }
  }
}

export {};
