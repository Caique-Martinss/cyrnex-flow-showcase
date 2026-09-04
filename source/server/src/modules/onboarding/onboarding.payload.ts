import type { SaveOnboardingInput } from './onboarding.types.js';

export function isSaveOnboardingPayload(value: unknown): value is SaveOnboardingInput {
  if (!isRecord(value)) return false;

  return (
    Number.isInteger(value.currentStep) &&
    isSettings(value.settings) &&
    Array.isArray(value.services) &&
    value.services.every(isService) &&
    Array.isArray(value.professionals) &&
    value.professionals.every(isProfessional)
  );
}

function isSettings(value: unknown): boolean {
  if (!isRecord(value)) return false;

  return (
    isString(value.businessName) &&
    isString(value.timezone) &&
    isString(value.bookingSlug) &&
    (value.operationMode === 'solo' || value.operationMode === 'team') &&
    isString(value.cancellationPolicy) &&
    isNumber(value.defaultDepositPercent) &&
    isBusinessHours(value.businessHours) &&
    isContact(value.contact) &&
    isProfile(value.profile) &&
    isBookingRules(value.bookingRules) &&
    Array.isArray(value.paymentMethods) &&
    value.paymentMethods.every(isPaymentMethod) &&
    Array.isArray(value.modules) &&
    value.modules.every(isModule) &&
    Array.isArray(value.rules) &&
    value.rules.every(isRule) &&
    isRecord(value.onboarding)
  );
}

function isBusinessHours(value: unknown): boolean {
  if (!isRecord(value)) return false;

  return (
    isString(value.open) &&
    isString(value.close) &&
    isNumber(value.slotIntervalMinutes) &&
    Array.isArray(value.closedWeekdays) &&
    Array.isArray(value.weeklySchedule) &&
    value.weeklySchedule.every(isDaySchedule)
  );
}

function isDaySchedule(value: unknown): boolean {
  if (!isRecord(value)) return false;

  return (
    isNumber(value.weekday) &&
    typeof value.enabled === 'boolean' &&
    isString(value.opensAt) &&
    isString(value.closesAt) &&
    typeof value.breakEnabled === 'boolean' &&
    isNullableString(value.breakStartsAt) &&
    isNullableString(value.breakEndsAt)
  );
}

function isContact(value: unknown): boolean {
  if (!isRecord(value)) return false;

  return [
    value.phone,
    value.whatsapp,
    value.email,
    value.instagram,
    value.addressLine,
    value.city,
    value.state,
    value.postalCode
  ].every(isString);
}

function isProfile(value: unknown): boolean {
  if (!isRecord(value)) return false;

  return (
    isString(value.headline) &&
    isString(value.aboutText) &&
    (value.foundedYear === null || isNumber(value.foundedYear)) &&
    typeof value.publicPageEnabled === 'boolean'
  );
}

function isBookingRules(value: unknown): boolean {
  if (!isRecord(value)) return false;

  return (
    isNumber(value.minBookingNoticeMinutes) &&
    isNumber(value.maxBookingDaysAhead) &&
    isNumber(value.cancellationNoticeMinutes) &&
    typeof value.allowClientReschedule === 'boolean' &&
    typeof value.allowClientCancel === 'boolean' &&
    typeof value.allowWaitlist === 'boolean' &&
    typeof value.requireDeposit === 'boolean'
  );
}

function isPaymentMethod(value: unknown): boolean {
  if (!isRecord(value)) return false;

  return (
    isString(value.method) &&
    isString(value.label) &&
    typeof value.active === 'boolean' &&
    isString(value.feeType) &&
    isNumber(value.feeValue)
  );
}

function isModule(value: unknown): boolean {
  return isRecord(value) && isString(value.key) && typeof value.enabled === 'boolean';
}

function isRule(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.key) &&
    typeof value.enabled === 'boolean' &&
    isRecord(value.config)
  );
}

function isService(value: unknown): boolean {
  if (!isRecord(value)) return false;

  return (
    isString(value.id) &&
    isString(value.name) &&
    isNullableString(value.category) &&
    isNullableString(value.description) &&
    isNumber(value.durationMinutes) &&
    isNumber(value.bufferAfterMinutes) &&
    isNumber(value.price) &&
    (value.depositPercent === null || isNumber(value.depositPercent)) &&
    typeof value.onlineBookingEnabled === 'boolean' &&
    (value.recommendedReturnDays === null || isNumber(value.recommendedReturnDays)) &&
    typeof value.active === 'boolean'
  );
}

function isProfessional(value: unknown): boolean {
  if (!isRecord(value)) return false;

  return (
    isString(value.id) &&
    isString(value.name) &&
    isNullableString(value.phone) &&
    isNumber(value.commissionPercent) &&
    typeof value.acceptsOnlineBooking === 'boolean' &&
    (value.weeklySchedule === null || (
      Array.isArray(value.weeklySchedule) && value.weeklySchedule.every(isDaySchedule)
    )) &&
    typeof value.active === 'boolean'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNullableString(value: unknown): value is string | null {
  return value === null || isString(value);
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
