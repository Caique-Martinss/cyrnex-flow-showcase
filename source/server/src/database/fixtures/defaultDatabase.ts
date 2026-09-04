import type {
  BusinessModuleSetting,
  BusinessRuleSetting,
  Database,
  DaySchedule,
  PaymentMethodSetting
} from '../../domain/types.js';

export const defaultWeeklySchedule: DaySchedule[] = [
  createDay(0, false, '09:00', '18:00'),
  createDay(1, false, '09:00', '20:00'),
  createDay(2, true, '09:00', '20:00'),
  createDay(3, true, '09:00', '20:00'),
  createDay(4, true, '09:00', '20:00'),
  createDay(5, true, '09:00', '20:00'),
  createDay(6, true, '09:00', '18:00')
];

export const defaultPaymentMethods: PaymentMethodSetting[] = [
  { method: 'pix', label: 'Pix', active: true, feeType: 'none', feeValue: 0 },
  { method: 'cash', label: 'Dinheiro', active: true, feeType: 'none', feeValue: 0 },
  { method: 'debit', label: 'Débito', active: true, feeType: 'percent', feeValue: 1.5 },
  { method: 'credit', label: 'Crédito', active: true, feeType: 'percent', feeValue: 3.5 }
];

export const defaultModules: BusinessModuleSetting[] = [
  { key: 'finance', enabled: true },
  { key: 'whatsapp', enabled: false },
  { key: 'waitlist', enabled: false },
  { key: 'receivables', enabled: false },
  { key: 'products', enabled: false },
  { key: 'partnerships', enabled: false },
  { key: 'prosthesis', enabled: false },
  { key: 'loyalty', enabled: false },
  { key: 'customer_returns', enabled: false },
  { key: 'commissions', enabled: false },
  { key: 'reports', enabled: false }
];

export const defaultRules: BusinessRuleSetting[] = [
  {
    key: 'groom_courtesy',
    enabled: false,
    config: { discountPercent: 100 }
  },
  {
    key: 'repeat_no_show_deposit',
    enabled: false,
    config: { afterMisses: 2, depositPercent: 50 }
  }
];

export const defaultDatabase: Database = {
  settings: {
    businessName: 'Barbearia Parceira',
    timezone: 'America/Sao_Paulo',
    bookingSlug: 'barbearia-parceira',
    operationMode: 'solo',
    cancellationPolicy:
      'O sinal reserva o horário. Cancelamentos devem ser informados com antecedência.',
    defaultDepositPercent: 50,
    businessHours: {
      open: '09:00',
      close: '20:00',
      slotIntervalMinutes: 15,
      closedWeekdays: [0, 1],
      weeklySchedule: defaultWeeklySchedule
    },
    contact: {
      phone: '',
      whatsapp: '',
      email: '',
      instagram: '',
      addressLine: '',
      city: 'São Paulo',
      state: 'SP',
      postalCode: ''
    },
    profile: {
      headline: 'Cuidado, estilo e atendimento com hora marcada.',
      aboutText: '',
      foundedYear: null,
      publicPageEnabled: true,
      logoDataUrl: null,
      originStory: '',
      experienceText: '',
      styleDescription: '',
      differentiatorText: '',
      specialties: [],
      differentials: [],
      spaceMedia: [],
      portfolioMedia: [],
      publicSections: ['hero', 'services', 'portfolio', 'team', 'space', 'about', 'hours', 'location', 'differentials'],
      sectionOrder: ['hero', 'services', 'portfolio', 'team', 'space', 'about', 'hours', 'location', 'differentials'],
      primaryAction: 'booking',
      locationVisibility: 'full',
      theme: 'auto',
      accentColor: '#b78945',
      publishOnComplete: true
    },
    bookingRules: {
      minBookingNoticeMinutes: 30,
      maxBookingDaysAhead: 60,
      cancellationNoticeMinutes: 360,
      allowClientReschedule: true,
      allowClientCancel: true,
      allowWaitlist: false,
      requireDeposit: false,
      confirmationMode: 'automatic',
      requireClientName: true,
      requireClientPhone: true,
      requireClientEmail: false,
      allowClientNotes: true,
      allowManualOvertime: true
    },
    paymentMethods: defaultPaymentMethods,
    paymentPreferences: {
      pixKeyType: '',
      pixKey: '',
      pixReceiverName: '',
      usePixForDeposit: false,
      depositMethods: ['pix'],
      cardMachineName: '',
      configureCardFeesLater: false,
      allowPayAtService: true,
      allowAuthorizedReceivables: false,
      recordTips: false,
      sendReceipt: false
    },
    modules: defaultModules,
    rules: defaultRules,
    onboarding: {
      status: 'not_started',
      currentStep: 0,
      completedAt: null
    }
  },
  clients: [],
  services: [],
  professionals: [],
  appointments: [],
  expenses: [],
  scheduleBlocks: [],
  retroactiveRequests: [],
  recurrenceSeries: [],
  waitlistEntries: [],
  auditEvents: []
};

function createDay(
  weekday: number,
  enabled: boolean,
  opensAt: string,
  closesAt: string
): DaySchedule {
  return {
    weekday,
    enabled,
    opensAt,
    closesAt,
    breakEnabled: false,
    breakStartsAt: null,
    breakEndsAt: null,
    periods: [{ id: `period-${weekday}-1`, startsAt: opensAt, endsAt: closesAt }]
  };
}
