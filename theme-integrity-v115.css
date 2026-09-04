import type { BusinessSettings, Service } from '../domain/types';

export function getServiceDepositPercent(
  service: Service,
  settings: BusinessSettings
): number {
  if (!settings.bookingRules.requireDeposit) return 0;
  return service.depositPercent ?? settings.defaultDepositPercent;
}
