import type { NextFunction, Request, Response } from 'express';
import type { MemberRole } from '../modules/auth/auth.types.js';

export function requireRoles(...roles: MemberRole[]) {
  const allowed = new Set<MemberRole>(roles);
  return function roleGuard(
    request: Request,
    response: Response,
    next: NextFunction
  ): void {
    if (!allowed.has(request.auth.role)) {
      response.status(403).json({
        error: 'Seu perfil não tem permissão para realizar esta ação.'
      });
      return;
    }
    next();
  };
}

export const requireBusinessAdmin = requireRoles('owner', 'manager');
export const requireFinancialAccess = requireRoles('owner', 'manager');
