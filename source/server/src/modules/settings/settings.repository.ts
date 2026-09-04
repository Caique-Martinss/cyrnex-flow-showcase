import type {
  BusinessModuleSetting,
  BusinessRuleSetting,
  BusinessSettings,
  DaySchedule,
  PaymentMethodSetting,
  PaymentPreferences,
  SchedulePeriod
} from '../../domain/types.js';
import {
  defaultDatabase,
  defaultModules,
  defaultPaymentMethods,
  defaultRules
} from '../../database/fixtures/defaultDatabase.js';
import { requireProductionAccessToken, userSupabaseRest } from '../../database/postgres/restClient.js';
import type { AuthContext } from '../auth/auth.types.js';
import { loadProductionMedia } from '../onboarding/onboarding.media.repository.js';

interface BusinessRow {
  name: string;
  slug: string;
  timezone: string;
  operation_mode: BusinessSettings['operationMode'];
  onboarding_status: BusinessSettings['onboarding']['status'];
  onboarding_step: number;
  onboarding_completed_at: string | null;
}

interface SettingsRow {
  booking_slot_interval_minutes: number;
  min_booking_notice_minutes: number;
  max_booking_days_ahead: number;
  cancellation_notice_minutes: number;
  allow_client_reschedule: boolean;
  allow_client_cancel: boolean;
  allow_waitlist: boolean;
  require_deposit: boolean;
  default_deposit_percent: number | string;
  confirmation_mode: BusinessSettings['bookingRules']['confirmationMode'];
  require_client_name: boolean;
  require_client_phone: boolean;
  require_client_email: boolean;
  allow_client_notes: boolean;
  allow_manual_overtime: boolean;
  cancellation_policy: string | null;
  payment_preferences: unknown;
}

interface PublicProfileRow {
  headline: string | null;
  about_text: string | null;
  founded_year: number | null;
  phone_public: string | null;
  email_public: string | null;
  address_line: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  instagram_url: string | null;
  whatsapp_public: string | null;
  public_page_enabled: boolean;
  origin_story: string | null;
  experience_text: string | null;
  style_description: string | null;
  differentiator_text: string | null;
  specialties: unknown;
  differentials: unknown;
  public_sections: unknown;
  section_order: unknown;
  primary_action: BusinessSettings['profile']['primaryAction'];
  location_visibility: BusinessSettings['profile']['locationVisibility'];
  page_theme: BusinessSettings['profile']['theme'];
  accent_color: string;
  publish_on_complete: boolean;
}

interface HourRow {
  id: string;
  weekday: number;
  opens_at: string;
  closes_at: string;
}

interface PaymentRow {
  method: PaymentMethodSetting['method'];
  label: string;
  active: boolean;
  fee_type: PaymentMethodSetting['feeType'];
  fee_value: number | string;
}

interface ModuleRow {
  module_key: BusinessModuleSetting['key'];
  enabled: boolean;
}

interface RuleRow {
  rule_key: BusinessRuleSetting['key'];
  enabled: boolean;
  config: unknown;
}

export async function loadProductionSettings(auth: AuthContext): Promise<BusinessSettings> {
  const token = requireProductionAccessToken(auth.accessToken);
  const businessFilter = { business_id: `eq.${auth.businessId}` };
  const [
    businessRows,
    settingsRows,
    profileRows,
    hours,
    payments,
    modules,
    rules,
    media
  ] = await Promise.all([
    userSupabaseRest<BusinessRow[]>(token, '/rest/v1/businesses', {
      query: {
        select: 'name,slug,timezone,operation_mode,onboarding_status,onboarding_step,onboarding_completed_at',
        id: `eq.${auth.businessId}`,
        limit: '1'
      }
    }),
    userSupabaseRest<SettingsRow[]>(token, '/rest/v1/business_settings', {
      query: { select: '*', ...businessFilter, limit: '1' }
    }),
    userSupabaseRest<PublicProfileRow[]>(token, '/rest/v1/business_public_profiles', {
      query: { select: '*', ...businessFilter, limit: '1' }
    }),
    userSupabaseRest<HourRow[]>(token, '/rest/v1/business_hours', {
      query: { select: 'id,weekday,opens_at,closes_at', ...businessFilter, order: 'weekday.asc,opens_at.asc' }
    }),
    userSupabaseRest<PaymentRow[]>(token, '/rest/v1/business_payment_methods', {
      query: { select: 'method,label,active,fee_type,fee_value', ...businessFilter, order: 'display_order.asc' }
    }),
    userSupabaseRest<ModuleRow[]>(token, '/rest/v1/business_modules', {
      query: { select: 'module_key,enabled', ...businessFilter }
    }),
    userSupabaseRest<RuleRow[]>(token, '/rest/v1/business_rules', {
      query: { select: 'rule_key,enabled,config', ...businessFilter }
    }),
    loadProductionMedia(auth)
  ]);

  const business = businessRows[0];
  const settings = settingsRows[0];
  if (!business || !settings) {
    throw Object.assign(
      new Error('Configuração da barbearia não encontrada.'),
      { status: 404 }
    );
  }
  const profile = profileRows[0];
  const weeklySchedule = buildWeeklySchedule(hours);
  const paymentPreferences = parsePaymentPreferences(settings.payment_preferences);

  return {
    ...structuredClone(defaultDatabase.settings),
    businessName: business.name,
    timezone: business.timezone,
    bookingSlug: business.slug,
    operationMode: business.operation_mode,
    cancellationPolicy: settings.cancellation_policy ?? '',
    defaultDepositPercent: Number(settings.default_deposit_percent),
    businessHours: {
      open: firstEnabled(weeklySchedule)?.opensAt ?? '09:00',
      close: lastEnabled(weeklySchedule)?.closesAt ?? '18:00',
      slotIntervalMinutes: settings.booking_slot_interval_minutes,
      closedWeekdays: weeklySchedule.filter(day => !day.enabled).map(day => day.weekday),
      weeklySchedule
    },
    contact: {
      phone: profile?.phone_public ?? '',
      whatsapp: profile?.whatsapp_public ?? '',
      email: profile?.email_public ?? '',
      instagram: profile?.instagram_url ?? '',
      addressLine: profile?.address_line ?? '',
      city: profile?.city ?? '',
      state: profile?.state ?? '',
      postalCode: profile?.postal_code ?? ''
    },
    profile: mapProfile(profile, media),
    bookingRules: {
      minBookingNoticeMinutes: settings.min_booking_notice_minutes,
      maxBookingDaysAhead: settings.max_booking_days_ahead,
      cancellationNoticeMinutes: settings.cancellation_notice_minutes,
      allowClientReschedule: settings.allow_client_reschedule,
      allowClientCancel: settings.allow_client_cancel,
      allowWaitlist: false,
      requireDeposit: settings.require_deposit,
      confirmationMode: settings.confirmation_mode,
      requireClientName: settings.require_client_name,
      requireClientPhone: settings.require_client_phone,
      requireClientEmail: settings.require_client_email,
      allowClientNotes: settings.allow_client_notes,
      allowManualOvertime: settings.allow_manual_overtime
    },
    paymentMethods: mergePayments(payments),
    paymentPreferences,
    modules: mergeModules(modules),
    rules: mergeRules(rules),
    onboarding: {
      status: business.onboarding_status,
      currentStep: business.onboarding_step,
      completedAt: business.onboarding_completed_at
    }
  };
}

function buildWeeklySchedule(rows: HourRow[]): DaySchedule[] {
  const grouped = new Map<number, SchedulePeriod[]>();
  for (const row of rows) {
    const values = grouped.get(row.weekday) ?? [];
    values.push({ id: row.id, startsAt: row.opens_at.slice(0, 5), endsAt: row.closes_at.slice(0, 5) });
    grouped.set(row.weekday, values);
  }
  return Array.from({ length: 7 }, (_, weekday) => dayFromPeriods(weekday, grouped.get(weekday) ?? []));
}

function dayFromPeriods(weekday: number, periods: SchedulePeriod[]): DaySchedule {
  const sorted = [...periods].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return {
    weekday,
    enabled: sorted.length > 0,
    opensAt: sorted[0]?.startsAt ?? '09:00',
    closesAt: sorted[sorted.length - 1]?.endsAt ?? '18:00',
    breakEnabled: sorted.length > 1,
    breakStartsAt: sorted.length > 1 ? sorted[0].endsAt : null,
    breakEndsAt: sorted.length > 1 ? sorted[1].startsAt : null,
    periods: sorted
  };
}

function mapProfile(
  row: PublicProfileRow | undefined,
  media: Pick<BusinessSettings['profile'], 'logoDataUrl' | 'spaceMedia' | 'portfolioMedia'>
): BusinessSettings['profile'] {
  if (!row) {
    return { ...structuredClone(defaultDatabase.settings.profile), ...media };
  }
  return {
    headline: row.headline ?? '',
    aboutText: row.about_text ?? '',
    foundedYear: row.founded_year,
    publicPageEnabled: row.public_page_enabled,
    logoDataUrl: media.logoDataUrl,
    originStory: row.origin_story ?? '',
    experienceText: row.experience_text ?? '',
    styleDescription: row.style_description ?? '',
    differentiatorText: row.differentiator_text ?? '',
    specialties: asStringArray(row.specialties),
    differentials: asStringArray(row.differentials),
    spaceMedia: media.spaceMedia,
    portfolioMedia: media.portfolioMedia,
    publicSections: asStringArray(row.public_sections) as BusinessSettings['profile']['publicSections'],
    sectionOrder: asStringArray(row.section_order) as BusinessSettings['profile']['sectionOrder'],
    primaryAction: row.primary_action,
    locationVisibility: row.location_visibility,
    theme: row.page_theme,
    accentColor: row.accent_color,
    publishOnComplete: row.publish_on_complete
  };
}

function mergePayments(rows: PaymentRow[]): PaymentMethodSetting[] {
  return defaultPaymentMethods.map(fallback => {
    const row = rows.find(item => item.method === fallback.method);
    return row ? {
      method: row.method,
      label: row.label,
      active: row.active,
      feeType: row.fee_type,
      feeValue: Number(row.fee_value)
    } : fallback;
  });
}

function mergeModules(rows: ModuleRow[]): BusinessModuleSetting[] {
  return defaultModules.map(fallback => {
    const row = rows.find(item => item.module_key === fallback.key);
    const enabled = fallback.key === 'finance' ? Boolean(row?.enabled ?? fallback.enabled) : false;
    return { key: fallback.key, enabled };
  });
}

function mergeRules(rows: RuleRow[]): BusinessRuleSetting[] {
  return defaultRules.map(fallback => {
    const row = rows.find(item => item.rule_key === fallback.key);
    if (!row) return fallback;
    return {
      key: row.rule_key,
      enabled: row.rule_key === 'repeat_no_show_deposit' ? false : row.enabled,
      config: asRuleConfig(row.config)
    };
  });
}

function parsePaymentPreferences(value: unknown): PaymentPreferences {
  const record = asRecord(value);
  const fallback = defaultDatabase.settings.paymentPreferences;
  const keyType = typeof record.pixKeyType === 'string' ? record.pixKeyType : '';
  const allowedKeyTypes = new Set<PaymentPreferences['pixKeyType']>([
    '', 'cpf', 'cnpj', 'email', 'phone', 'random'
  ]);
  const depositMethods = Array.isArray(record.depositMethods)
    ? record.depositMethods.filter((item): item is PaymentPreferences['depositMethods'][number] => (
      typeof item === 'string' && ['cash', 'pix', 'debit', 'credit', 'other'].includes(item)
    ))
    : fallback.depositMethods;

  return {
    pixKeyType: allowedKeyTypes.has(keyType as PaymentPreferences['pixKeyType'])
      ? keyType as PaymentPreferences['pixKeyType']
      : fallback.pixKeyType,
    pixKey: stringOr(record.pixKey, fallback.pixKey),
    pixReceiverName: stringOr(record.pixReceiverName, fallback.pixReceiverName),
    usePixForDeposit: booleanOr(record.usePixForDeposit, fallback.usePixForDeposit),
    depositMethods: depositMethods.filter(item => item === 'pix'),
    cardMachineName: stringOr(record.cardMachineName, fallback.cardMachineName),
    configureCardFeesLater: false,
    allowPayAtService: booleanOr(record.allowPayAtService, fallback.allowPayAtService),
    allowAuthorizedReceivables: false,
    recordTips: false,
    sendReceipt: false
  };
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function booleanOr(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asRuleConfig(value: unknown): Record<string, string | number | boolean> {
  return asRecord(value) as Record<string, string | number | boolean>;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter(item => typeof item === 'string') : [];
}

function firstEnabled(days: DaySchedule[]): DaySchedule | undefined {
  return days.find(day => day.enabled);
}

function lastEnabled(days: DaySchedule[]): DaySchedule | undefined {
  return [...days].reverse().find(day => day.enabled);
}
