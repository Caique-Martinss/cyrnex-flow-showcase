import { randomUUID } from 'node:crypto';
import type { Database } from '../../domain/types.js';
import type { AuthContext } from '../auth/auth.types.js';

export function appendAuditEvent(
  database: Database,
  auth: AuthContext,
  input: {
    action: string;
    entityType: string;
    entityId?: string | null;
    metadata?: Record<string, string | number | boolean | null>;
  }
): void {
  database.auditEvents.push({
    id: randomUUID(),
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    actorUserId: auth.userId,
    actorName: auth.displayName,
    metadata: input.metadata ?? {},
    createdAt: new Date().toISOString()
  });
}
