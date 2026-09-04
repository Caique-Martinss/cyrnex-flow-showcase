import type {
  BusinessSettings,
  Professional,
  PublicBookingResult,
  Service
} from '../../domain/types.js';

export interface PublicPagePayload {
  settings: BusinessSettings;
  services: Service[];
  professionals: Professional[];
}

export interface BusinessRow {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  operation_mode: BusinessSettings['operationMode'];
  onboarding_status: BusinessSettings['onboarding']['status'];
  onboarding_step: number;
  onboarding_completed_at: string | null;
}

export interface SettingsRow {
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

export interface ProfileRow {
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
  logo_asset_id: string | null;
}

export interface HourRow {
  id: string;
  weekday: number;
  opens_at: string;
  closes_at: string;
}

export interface ServiceRow {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  duration_minutes: number;
  buffer_after_minutes: number;
  base_price: number | string;
  price_type: Service['priceType'];
  public_price_visible: boolean;
  deposit_percent_override: number | string | null;
  online_booking_enabled: boolean;
  recommended_return_days: number | null;
  active: boolean;
}

export interface ProfessionalRow {
  id: string;
  name: string;
  professional_name: string | null;
  onboarding_role: Professional['role'];
  serves_clients: boolean;
  accepts_online_booking: boolean;
  public_visible: boolean;
  is_owner: boolean;
  active: boolean;
  uses_custom_schedule: boolean;
}

export interface ProfessionalServiceRow {
  service_id: string;
  professional_id: string;
  active: boolean;
}

export interface ProfessionalHourRow {
  id: string;
  professional_id: string;
  weekday: number;
  starts_at: string;
  ends_at: string;
}

export interface AddonRow {
  id: string;
  service_id: string;
  name: string;
  price_delta: number | string;
  duration_delta_minutes: number;
  active: boolean;
}

export interface MediaRow {
  id: string;
  media_kind: 'space' | 'portfolio';
  media_type: 'image' | 'video';
  asset_id: string | null;
  service_id: string | null;
  title: string | null;
  description: string | null;
  category: string | null;
  public_visible: boolean;
  display_order: number;
}

export interface AssetRow {
  id: string;
  storage_path: string;
}

export interface BookingRpcResult {
  appointmentId: string;
  clientId: string | null;
  serviceId: string;
  professionalId: string;
  serviceName: string;
  professionalName: string;
  durationMinutes: number;
  bufferAfterMinutes: number;
  startsAt: string;
  status: PublicBookingResult['appointment']['status'];
  price: number | string;
  publicPriceVisible: boolean;
  depositPercent: number | string;
  depositAmount: number | string;
  depositStatus: PublicBookingResult['appointment']['depositStatus'];
  notes: string | null;
  createdAt: string;
  confirmedAt: string | null;
  clientName: string;
  clientPhone: string;
  clientEmail: string | null;
  existingClient: boolean;
  cancellationPolicy: string;
  managementExpiresAt?: string | null;
}

export interface BookingManagementRpcResult extends BookingRpcResult {
  canReschedule: boolean;
  canCancel: boolean;
  changeDeadline: string | null;
  managementExpiresAt: string;
}
