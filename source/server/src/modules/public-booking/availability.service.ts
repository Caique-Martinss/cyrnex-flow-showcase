import type { Database, Professional, Service } from '../../domain/types.js';
import {
  buildAvailability,
  type AvailabilityResult,
  type AvailabilitySlot
} from '../scheduling/availability.service.js';

export type PublicAvailabilityResult = AvailabilityResult;
export type PublicAvailabilitySlot = AvailabilitySlot;

export function buildPublicAvailability(
  database: Database,
  service: Service,
  professional: Professional,
  dateText: string,
  now = new Date()
): PublicAvailabilityResult {
  return buildAvailability(database, service, professional, dateText, { now });
}
