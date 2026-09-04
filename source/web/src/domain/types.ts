import type { AppointmentTimelineEvent } from './agenda.types';

export type {
  AppointmentTimelineEvent,
  AppointmentTimelineEventType,
  RecurrenceFrequency,
  RecurrenceSeries,
  WaitlistEntry,
  WaitlistStatus
} from './agenda.types';

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  lastVisit: string | null;
  totalSpend: number;
  appointments: number;
  createdAt: string;
}

export interface ServiceAddonDraft {
  id: string;
  name: string;
  priceDelta: number;
  durationDeltaMinutes: number;
  active: boolean;
}

export interface Service {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  durationMinutes: number;
  bufferAfterMinutes: number;
  price: number;
  priceType: 'fixed' | 'from' | 'consult';
  publicPriceVisible: boolean;
  depositPercent: number | null;
  onlineBookingEnabled: boolean;
  recommendedReturnDays: number | null;
  professionalIds: string[];
  addons: ServiceAddonDraft[];
  active: boolean;
}

export type ProfessionalRole = 'owner' | 'barber' | 'manager' | 'receptionist' | 'assistant' | 'other';

export interface Professional {
  id: string;
  name: string;
  professionalName: string | null;
  role: ProfessionalRole;
  phone: string | null;
  email: string | null;
  servesClients: boolean;
  receivesCommission: boolean;
  commissionPercent: number;
  acceptsOnlineBooking: boolean;
  publicVisible: boolean;
  isOwner: boolean;
  /** null = usa o expediente geral da barbearia. */
  weeklySchedule: DaySchedule[] | null;
  active: boolean;
}

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'arrived'
  | 'in_service'
  | 'completed'
  | 'missed'
  | 'cancelled';
export type DepositStatus = 'pending' | 'paid' | 'waived';
export type AppointmentSource = 'admin' | 'public' | 'retroactive' | 'fit_in' | 'recurrence';
export type PaymentMethod = 'cash' | 'pix' | 'debit' | 'credit' | 'other';
export type FeeType = 'none' | 'percent' | 'fixed';
export type OperationMode = 'solo' | 'team';
export type OnboardingStatus = 'not_started' | 'in_progress' | 'completed';

export type BusinessModuleKey =
  | 'finance'
  | 'whatsapp'
  | 'waitlist'
  | 'receivables'
  | 'products'
  | 'partnerships'
  | 'prosthesis'
  | 'loyalty'
  | 'customer_returns'
  | 'commissions'
  | 'reports';

export type BusinessRuleKey = 'groom_courtesy' | 'repeat_no_show_deposit';

export interface Appointment {
  id: string;
  clientId: string;
  serviceId: string;
  professionalId: string;
  serviceName: string;
  professionalName: string;
  durationMinutes: number;
  bufferAfterMinutes: number;
  commissionPercentSnapshot: number;
  date: string;
  status: AppointmentStatus;
  price: number;
  depositPercent: number;
  depositAmount: number;
  depositStatus: DepositStatus;
  depositPaidAt?: string | null;
  paymentProofStatus?: 'none' | 'submitted' | 'confirmed' | 'rejected';
  paymentProofSubmittedAt?: string | null;
  paymentMethod: PaymentMethod | null;
  cardFee: number;
  commissionAmount: number;
  netAmount: number;
  notes: string | null;
  createdAt: string;
  completedAt: string | null;
  confirmedAt: string | null;
  arrivedAt: string | null;
  actualStartedAt: string | null;
  cancelledAt: string | null;
  missedAt: string | null;
  rescheduledAt: string | null;
  isFitIn: boolean;
  fitInConflictAppointmentId: string | null;
  fitInReason: string | null;
  recurrenceId: string | null;
  recurrenceIndex: number | null;
  recurrencePaused: boolean;
  timeline: AppointmentTimelineEvent[];
  source?: AppointmentSource;
  registeredAt?: string | null;
  registeredByUserId?: string | null;
  client: Client | null;
  service: Service | null;
  professional: Professional | null;
}

export type ScheduleBlockType =
  | 'break'
  | 'closed'
  | 'personal'
  | 'maintenance'
  | 'other';

export interface ScheduleBlock {
  id: string;
  professionalId: string | null;
  startsAt: string;
  endsAt: string;
  blockType: ScheduleBlockType;
  reason: string;
  createdByUserId: string;
  createdByName: string;
  createdAt: string;
}

export type RetroactiveRequestStatus = 'pending' | 'approved' | 'rejected';
export type RetroactiveProofType =
  | 'payment_record'
  | 'receipt'
  | 'client_confirmation'
  | 'other';

export interface RetroactiveServiceRequest {
  id: string;
  clientId: string;
  serviceId: string;
  professionalId: string;
  startsAt: string;
  price: number;
  paymentMethod: PaymentMethod;
  notes: string | null;
  reason: string;
  proofType: RetroactiveProofType;
  proofReference: string;
  proofDescription: string;
  evidenceConfirmed: boolean;
  status: RetroactiveRequestStatus;
  requestedByUserId: string;
  requestedByName: string;
  requestedByRole: MemberRole;
  requestedAt: string;
  reviewedByUserId: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAppointmentId: string | null;
  conflictAppointmentId: string | null;
  conflictConfirmed: boolean;
  conflictJustification: string | null;
}

export interface AuditEvent {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  actorUserId: string;
  actorName: string;
  metadata: Record<string, string | number | boolean | null>;
  createdAt: string;
}

export interface Expense {
  id: string;
  description: string;
  category: string;
  amount: number;
  date: string;
  createdAt: string;
}

export interface SchedulePeriod {
  id: string;
  startsAt: string;
  endsAt: string;
}

export interface DaySchedule {
  weekday: number;
  enabled: boolean;
  opensAt: string;
  closesAt: string;
  breakEnabled: boolean;
  breakStartsAt: string | null;
  breakEndsAt: string | null;
  periods: SchedulePeriod[];
}

export interface BusinessHours {
  open: string;
  close: string;
  slotIntervalMinutes: number;
  closedWeekdays: number[];
  weeklySchedule: DaySchedule[];
}

export interface BusinessContact {
  phone: string;
  whatsapp: string;
  email: string;
  instagram: string;
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
}

export type PublicSectionKey =
  | 'hero'
  | 'services'
  | 'portfolio'
  | 'team'
  | 'space'
  | 'about'
  | 'hours'
  | 'location'
  | 'differentials';

export interface BusinessMediaItem {
  id: string;
  mediaType: 'image' | 'video';
  dataUrl: string | null;
  title: string;
  description: string;
  category: string;
  serviceId: string | null;
  publicVisible: boolean;
}

export interface BusinessProfile {
  headline: string;
  aboutText: string;
  foundedYear: number | null;
  publicPageEnabled: boolean;
  logoDataUrl: string | null;
  originStory: string;
  experienceText: string;
  styleDescription: string;
  differentiatorText: string;
  specialties: string[];
  differentials: string[];
  spaceMedia: BusinessMediaItem[];
  portfolioMedia: BusinessMediaItem[];
  publicSections: PublicSectionKey[];
  sectionOrder: PublicSectionKey[];
  primaryAction: 'booking' | 'whatsapp' | 'services';
  locationVisibility: 'full' | 'area' | 'hidden';
  theme: 'light' | 'dark' | 'auto';
  accentColor: string;
  publishOnComplete: boolean;
}

export interface BookingRules {
  minBookingNoticeMinutes: number;
  maxBookingDaysAhead: number;
  cancellationNoticeMinutes: number;
  allowClientReschedule: boolean;
  allowClientCancel: boolean;
  allowWaitlist: boolean;
  requireDeposit: boolean;
  confirmationMode: 'automatic' | 'manual';
  requireClientName: boolean;
  requireClientPhone: boolean;
  requireClientEmail: boolean;
  allowClientNotes: boolean;
  allowManualOvertime: boolean;
}

export interface PaymentMethodSetting {
  method: PaymentMethod;
  label: string;
  active: boolean;
  feeType: FeeType;
  feeValue: number;
}

export interface BusinessModuleSetting {
  key: BusinessModuleKey;
  enabled: boolean;
}

export interface BusinessRuleSetting {
  key: BusinessRuleKey;
  enabled: boolean;
  config: Record<string, string | number | boolean>;
}

export interface OnboardingProgress {
  status: OnboardingStatus;
  currentStep: number;
  completedAt: string | null;
}

export interface PaymentPreferences {
  pixKeyType: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random' | '';
  pixKey: string;
  pixReceiverName: string;
  usePixForDeposit: boolean;
  depositMethods: PaymentMethod[];
  cardMachineName: string;
  configureCardFeesLater: boolean;
  allowPayAtService: boolean;
  allowAuthorizedReceivables: boolean;
  recordTips: boolean;
  sendReceipt: boolean;
}

export interface BusinessSettings {
  businessName: string;
  timezone: string;
  bookingSlug: string;
  operationMode: OperationMode;
  cancellationPolicy: string;
  defaultDepositPercent: number;
  businessHours: BusinessHours;
  contact: BusinessContact;
  profile: BusinessProfile;
  bookingRules: BookingRules;
  paymentMethods: PaymentMethodSetting[];
  paymentPreferences: PaymentPreferences;
  modules: BusinessModuleSetting[];
  rules: BusinessRuleSetting[];
  onboarding: OnboardingProgress;
}

export interface OnboardingState {
  settings: BusinessSettings;
  services: Service[];
  professionals: Professional[];
}

export type AvailabilityStatus = 'available' | 'occupied' | 'past' | 'blocked';

export interface AvailabilitySlot {
  start: string;
  end: string;
  label: string;
  status: AvailabilityStatus;
  reason?: string | null;
}

export interface AvailabilityResponse {
  date: string;
  closed: boolean;
  slots: AvailabilitySlot[];
  businessHours: BusinessHours;
}

export interface DashboardData {
  grossRevenue: number;
  cardFees: number;
  commissions: number;
  expenses: number;
  netRevenue: number;
  scheduledRevenue: number;
  receivedDeposits: number;
  activeClients: number;
  totalClients: number;
  bestClient: Client | null;
  missingCustomers: number;
  upcomingAppointments: number;
  topService: string;
  topProfessional: string;
  lostRate: number;
}

export interface PublicBookingResult {
  appointment: Appointment;
  client: Client;
  existingClient: boolean;
  cancellationPolicy: string;
  managementToken?: string | null;
  managementExpiresAt?: string | null;
}

export type MemberRole = 'owner' | 'manager' | 'professional' | 'receptionist';

export interface AuthSession {
  authenticated: true;
  user: {
    id: string;
    username: string;
    email: string;
    displayName: string;
  };
  business: {
    id: string;
    name: string;
    slug: string;
  };
  role: MemberRole;
  platformAdmin: { role: 'super_admin' | 'support' } | null;
  businesses: Array<{
    id: string;
    name: string;
    slug: string;
    role: MemberRole;
    active: boolean;
  }>;
}
