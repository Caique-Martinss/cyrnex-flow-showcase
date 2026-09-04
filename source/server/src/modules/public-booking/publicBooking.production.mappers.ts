import type {
  BusinessMediaItem,
  BusinessSettings,
  DaySchedule,
  Professional,
  PublicBookingManagement,
  PublicBookingResult,
  SchedulePeriod,
  Service,
  ServiceAddonDraft
} from '../../domain/types.js';
import { defaultDatabase } from '../../database/fixtures/defaultDatabase.js';
import type {
  AddonRow,
  BookingManagementRpcResult,
  BookingRpcResult,
  BusinessRow,
  HourRow,
  MediaRow,
  ProfessionalHourRow,
  ProfessionalRow,
  ProfessionalServiceRow,
  ProfileRow,
  ServiceRow,
  SettingsRow
} from './publicBooking.production.types.js';

export function buildPublicSettings(
  business: BusinessRow,
  settings: SettingsRow,
  profile: ProfileRow,
  schedule: DaySchedule[],
  media: MediaRow[],
  signedMedia: Map<string, string>
): BusinessSettings {
  const fallback = structuredClone(defaultDatabase.settings);
  return {
    ...fallback,
    businessName: business.name,
    timezone: business.timezone,
    bookingSlug: business.slug,
    operationMode: business.operation_mode,
    cancellationPolicy: settings.cancellation_policy ?? '',
    defaultDepositPercent: Number(settings.default_deposit_percent),
    businessHours: {
      open: schedule.find(day => day.enabled)?.opensAt ?? '09:00',
      close: [...schedule].reverse().find(day => day.enabled)?.closesAt ?? '18:00',
      slotIntervalMinutes: settings.booking_slot_interval_minutes,
      closedWeekdays: schedule.filter(day => !day.enabled).map(day => day.weekday),
      weeklySchedule: schedule
    },
    contact: {
      phone: profile.phone_public ?? '',
      whatsapp: profile.whatsapp_public ?? '',
      email: profile.email_public ?? '',
      instagram: profile.instagram_url ?? '',
      addressLine: profile.address_line ?? '',
      city: profile.city ?? '',
      state: profile.state ?? '',
      postalCode: profile.postal_code ?? ''
    },
    profile: {
      ...fallback.profile,
      headline: profile.headline ?? '',
      aboutText: profile.about_text ?? '',
      foundedYear: profile.founded_year,
      publicPageEnabled: profile.public_page_enabled,
      logoDataUrl: profile.logo_asset_id ? signedMedia.get(profile.logo_asset_id) ?? null : null,
      originStory: profile.origin_story ?? '',
      experienceText: profile.experience_text ?? '',
      styleDescription: profile.style_description ?? '',
      differentiatorText: profile.differentiator_text ?? '',
      specialties: asStringArray(profile.specialties),
      differentials: asStringArray(profile.differentials),
      spaceMedia: mapMedia(media, 'space', signedMedia),
      portfolioMedia: mapMedia(media, 'portfolio', signedMedia),
      publicSections: asStringArray(profile.public_sections) as BusinessSettings['profile']['publicSections'],
      sectionOrder: asStringArray(profile.section_order) as BusinessSettings['profile']['sectionOrder'],
      primaryAction: profile.primary_action,
      locationVisibility: profile.location_visibility,
      theme: profile.page_theme,
      accentColor: profile.accent_color,
      publishOnComplete: profile.publish_on_complete
    },
    bookingRules: {
      minBookingNoticeMinutes: settings.min_booking_notice_minutes,
      maxBookingDaysAhead: settings.max_booking_days_ahead,
      cancellationNoticeMinutes: settings.cancellation_notice_minutes,
      allowClientReschedule: settings.allow_client_reschedule,
      allowClientCancel: settings.allow_client_cancel,
      allowWaitlist: settings.allow_waitlist,
      requireDeposit: settings.require_deposit,
      confirmationMode: settings.confirmation_mode,
      requireClientName: settings.require_client_name,
      requireClientPhone: settings.require_client_phone,
      requireClientEmail: settings.require_client_email,
      allowClientNotes: settings.allow_client_notes,
      allowManualOvertime: settings.allow_manual_overtime
    },
    onboarding: {
      status: business.onboarding_status,
      currentStep: business.onboarding_step,
      completedAt: business.onboarding_completed_at
    }
  };
}

export function mapService(
  row: ServiceRow,
  professionalIds: Map<string, string[]>,
  addons: Map<string, ServiceAddonDraft[]>
): Service {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    durationMinutes: row.duration_minutes,
    bufferAfterMinutes: row.buffer_after_minutes,
    price: Number(row.base_price),
    priceType: row.price_type,
    publicPriceVisible: row.public_price_visible,
    depositPercent: row.deposit_percent_override === null ? null : Number(row.deposit_percent_override),
    onlineBookingEnabled: row.online_booking_enabled,
    recommendedReturnDays: row.recommended_return_days,
    professionalIds: professionalIds.get(row.id) ?? [],
    addons: addons.get(row.id) ?? [],
    active: row.active
  };
}

export function mapProfessional(
  row: ProfessionalRow,
  hours: Map<string, Map<number, SchedulePeriod[]>>,
  businessSchedule: DaySchedule[]
): Professional {
  return {
    id: row.id,
    name: row.name,
    professionalName: row.professional_name,
    role: row.onboarding_role,
    phone: null,
    email: null,
    servesClients: row.serves_clients,
    receivesCommission: false,
    commissionPercent: 0,
    acceptsOnlineBooking: row.accepts_online_booking,
    publicVisible: row.public_visible,
    isOwner: row.is_owner,
    weeklySchedule: row.uses_custom_schedule
      ? buildCustomSchedule(hours.get(row.id) ?? new Map(), businessSchedule)
      : null,
    active: row.active
  };
}

export function mapBookingResult(
  row: BookingRpcResult,
  managementToken: string | null = null
): PublicBookingResult {
  const client = {
    id: row.clientId ?? '',
    name: row.clientName,
    phone: row.clientPhone,
    email: row.clientEmail,
    lastVisit: null,
    totalSpend: 0,
    appointments: 0,
    createdAt: row.createdAt
  };
  const service = buildBookingService(row);
  const professional = buildBookingProfessional(row);
  return {
    appointment: {
      id: row.appointmentId,
      clientId: row.clientId ?? '',
      serviceId: row.serviceId,
      professionalId: row.professionalId,
      serviceName: row.serviceName,
      professionalName: row.professionalName,
      durationMinutes: row.durationMinutes,
      bufferAfterMinutes: row.bufferAfterMinutes,
      commissionPercentSnapshot: 0,
      date: row.startsAt,
      status: row.status,
      price: Number(row.price),
      depositPercent: Number(row.depositPercent),
      depositAmount: Number(row.depositAmount),
      depositStatus: row.depositStatus,
      paymentMethod: null,
      cardFee: 0,
      commissionAmount: 0,
      netAmount: 0,
      notes: row.notes,
      createdAt: row.createdAt,
      completedAt: null,
      confirmedAt: row.confirmedAt,
      arrivedAt: null,
      actualStartedAt: null,
      cancelledAt: null,
      missedAt: null,
      rescheduledAt: null,
      isFitIn: false,
      fitInConflictAppointmentId: null,
      fitInReason: null,
      recurrenceId: null,
      recurrenceIndex: null,
      recurrencePaused: false,
      timeline: [],
      source: 'public',
      registeredAt: null,
      registeredByUserId: null,
      client,
      service,
      professional
    },
    client,
    existingClient: row.existingClient,
    cancellationPolicy: row.cancellationPolicy,
    managementToken,
    managementExpiresAt: row.managementExpiresAt ?? null
  };
}

export function mapBookingManagement(
  row: BookingManagementRpcResult,
  managementToken: string
): PublicBookingManagement {
  return {
    booking: mapBookingResult(row, managementToken),
    canReschedule: row.canReschedule,
    canCancel: row.canCancel,
    changeDeadline: row.changeDeadline,
    managementExpiresAt: row.managementExpiresAt
  };
}

function buildBookingService(row: BookingRpcResult): Service {
  return {
    id: row.serviceId,
    name: row.serviceName,
    category: null,
    description: null,
    durationMinutes: row.durationMinutes,
    bufferAfterMinutes: row.bufferAfterMinutes,
    price: Number(row.price),
    priceType: 'fixed',
    publicPriceVisible: row.publicPriceVisible,
    depositPercent: Number(row.depositPercent),
    onlineBookingEnabled: true,
    recommendedReturnDays: null,
    professionalIds: [row.professionalId],
    addons: [],
    active: true
  };
}

function buildBookingProfessional(row: BookingRpcResult): Professional {
  return {
    id: row.professionalId,
    name: row.professionalName,
    professionalName: row.professionalName,
    role: 'barber',
    phone: null,
    email: null,
    servesClients: true,
    receivesCommission: false,
    commissionPercent: 0,
    acceptsOnlineBooking: true,
    publicVisible: true,
    isOwner: false,
    weeklySchedule: null,
    active: true
  };
}

export function buildWeeklySchedule(rows: HourRow[]): DaySchedule[] {
  const grouped = new Map<number, SchedulePeriod[]>();
  for (const row of rows) {
    const values = grouped.get(row.weekday) ?? [];
    values.push({ id: row.id, startsAt: row.opens_at.slice(0, 5), endsAt: row.closes_at.slice(0, 5) });
    grouped.set(row.weekday, values);
  }
  return Array.from({ length: 7 }, (_, weekday) => dayFromPeriods(weekday, grouped.get(weekday) ?? []));
}

export function groupProfessionalHours(
  rows: ProfessionalHourRow[]
): Map<string, Map<number, SchedulePeriod[]>> {
  const grouped = new Map<string, Map<number, SchedulePeriod[]>>();
  for (const row of rows) {
    const week = grouped.get(row.professional_id) ?? new Map<number, SchedulePeriod[]>();
    const periods = week.get(row.weekday) ?? [];
    periods.push({ id: row.id, startsAt: row.starts_at.slice(0, 5), endsAt: row.ends_at.slice(0, 5) });
    week.set(row.weekday, periods);
    grouped.set(row.professional_id, week);
  }
  return grouped;
}

export function groupProfessionalIds(rows: ProfessionalServiceRow[]): Map<string, string[]> {
  const grouped = new Map<string, string[]>();
  for (const row of rows) {
    const values = grouped.get(row.service_id) ?? [];
    values.push(row.professional_id);
    grouped.set(row.service_id, values);
  }
  return grouped;
}

export function groupAddons(rows: AddonRow[]): Map<string, ServiceAddonDraft[]> {
  const grouped = new Map<string, ServiceAddonDraft[]>();
  for (const row of rows) {
    const values = grouped.get(row.service_id) ?? [];
    values.push({
      id: row.id,
      name: row.name,
      priceDelta: Number(row.price_delta),
      durationDeltaMinutes: row.duration_delta_minutes,
      active: row.active
    });
    grouped.set(row.service_id, values);
  }
  return grouped;
}

function buildCustomSchedule(
  custom: Map<number, SchedulePeriod[]>,
  businessSchedule: DaySchedule[]
): DaySchedule[] {
  return Array.from({ length: 7 }, (_, weekday) => {
    const periods = custom.get(weekday) ?? [];
    return periods.length
      ? dayFromPeriods(weekday, periods)
      : { ...businessSchedule[weekday], enabled: false, periods: [] };
  });
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

function mapMedia(
  rows: MediaRow[],
  kind: MediaRow['media_kind'],
  signed: Map<string, string>
): BusinessMediaItem[] {
  return rows.filter(row => row.media_kind === kind).map(row => ({
    id: row.id,
    mediaType: row.media_type,
    dataUrl: row.asset_id ? signed.get(row.asset_id) ?? null : null,
    title: row.title ?? '',
    description: row.description ?? '',
    category: row.category ?? '',
    serviceId: row.service_id,
    publicVisible: row.public_visible
  }));
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}
