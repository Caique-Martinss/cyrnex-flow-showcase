import { randomUUID } from 'node:crypto';
import { access, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  BusinessModuleSetting,
  BusinessRuleSetting,
  Database,
  DaySchedule,
  PaymentMethodSetting,
  Professional,
  Service
} from '../../domain/types.js';
import {
  defaultDatabase,
  defaultModules,
  defaultPaymentMethods,
  defaultRules,
  defaultWeeklySchedule
} from '../fixtures/defaultDatabase.js';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const dataDirectory = resolve(currentDirectory, '../../../data');
const businessesDirectory = resolve(dataDirectory, 'businesses');
const legacyDatabasePath = resolve(dataDirectory, 'db.json');

export async function readDatabase(businessId: string): Promise<Database> {
  const databasePath = getBusinessDatabasePath(businessId);

  try {
    const content = await readFile(databasePath, 'utf8');
    const parsed = JSON.parse(content) as Partial<Database>;
    return normalizeDatabase(parsed);
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code !== 'ENOENT') throw error;
    throw new Error('Banco local da barbearia não encontrado.');
  }
}

export async function saveDatabase(
  businessId: string,
  database: Database
): Promise<void> {
  const databasePath = getBusinessDatabasePath(businessId);
  await mkdir(dirname(databasePath), { recursive: true });
  const temporaryPath = `${databasePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporaryPath, JSON.stringify(database, null, 2), 'utf8');
  await rename(temporaryPath, databasePath);
}

export async function initializeBusinessDatabase(
  businessId: string,
  businessName: string,
  businessSlug: string,
  importLegacy = false,
  ownerDisplayName = ''
): Promise<void> {
  const targetPath = getBusinessDatabasePath(businessId);

  try {
    await access(targetPath);
    return;
  } catch {
    // Continua e cria o banco somente quando ainda não existe.
  }

  const initial = await buildInitialDatabase(importLegacy);
  initial.settings.businessName = businessName;
  initial.settings.bookingSlug = businessSlug;
  initial.settings.onboarding = {
    status: 'not_started',
    currentStep: 0,
    completedAt: null
  };

  if (ownerDisplayName.trim() && initial.professionals.length === 0) {
    initial.professionals = [{
      id: randomUUID(),
      name: ownerDisplayName.trim(),
      professionalName: null,
      role: 'owner',
      phone: null,
      email: null,
      servesClients: true,
      receivesCommission: false,
      commissionPercent: 0,
      acceptsOnlineBooking: true,
      publicVisible: true,
      isOwner: true,
      weeklySchedule: null,
      active: true
    }];
  }

  await saveDatabase(businessId, initial);
}

async function buildInitialDatabase(importLegacy: boolean): Promise<Database> {
  if (importLegacy) try {
    const legacyContent = await readFile(legacyDatabasePath, 'utf8');
    const legacy = normalizeDatabase(JSON.parse(legacyContent) as Partial<Database>);
    const hasUsefulData = legacy.clients.length > 0 ||
      legacy.services.length > 0 ||
      legacy.appointments.length > 0 ||
      legacy.expenses.length > 0;

    if (hasUsefulData) {
      return structuredClone(legacy);
    }
  } catch {
    // O projeto pode ser novo e não possuir banco legado.
  }

  return structuredClone(defaultDatabase);
}

function getBusinessDatabasePath(businessId: string): string {
  if (!/^[a-f0-9-]{36}$/i.test(businessId)) {
    throw new Error('Identificador de barbearia inválido.');
  }

  return resolve(businessesDirectory, `${businessId}.json`);
}

function normalizeDatabase(parsed: Partial<Database>): Database {
  const settings = parsed.settings ?? defaultDatabase.settings;
  const weeklySchedule = normalizeWeeklySchedule(settings.businessHours?.weeklySchedule);
  const inferredOperationMode = settings.operationMode ?? (
    (parsed.professionals ?? []).filter(item => item.active !== false).length > 1
      ? 'team'
      : 'solo'
  );

  return {
    settings: {
      ...structuredClone(defaultDatabase.settings),
      ...settings,
      operationMode: inferredOperationMode,
      contact: {
        ...defaultDatabase.settings.contact,
        ...(settings.contact ?? {})
      },
      profile: {
        ...defaultDatabase.settings.profile,
        ...(settings.profile ?? {})
      },
      bookingRules: {
        ...defaultDatabase.settings.bookingRules,
        ...(settings.bookingRules ?? {})
      },
      businessHours: {
        ...defaultDatabase.settings.businessHours,
        ...(settings.businessHours ?? {}),
        weeklySchedule,
        closedWeekdays: weeklySchedule
          .filter(day => !day.enabled)
          .map(day => day.weekday)
      },
      paymentMethods: mergeByKey(
        defaultPaymentMethods,
        settings.paymentMethods,
        item => item.method
      ),
      paymentPreferences: {
        ...defaultDatabase.settings.paymentPreferences,
        ...(settings.paymentPreferences ?? {})
      },
      modules: mergeByKey(defaultModules, settings.modules, item => item.key),
      rules: mergeByKey(defaultRules, settings.rules, item => item.key),
      onboarding: {
        ...defaultDatabase.settings.onboarding,
        ...(settings.onboarding ?? {})
      }
    },
    clients: parsed.clients ?? [],
    services: (parsed.services ?? []).map(normalizeService),
    professionals: (parsed.professionals ?? []).map(normalizeProfessional),
    appointments: (parsed.appointments ?? []).map(normalizeAppointment),
    expenses: parsed.expenses ?? [],
    scheduleBlocks: parsed.scheduleBlocks ?? [],
    retroactiveRequests: (parsed.retroactiveRequests ?? []).map(normalizeRetroactiveRequest),
    recurrenceSeries: parsed.recurrenceSeries ?? [],
    waitlistEntries: parsed.waitlistEntries ?? [],
    auditEvents: parsed.auditEvents ?? []
  };
}

function normalizeWeeklySchedule(value: DaySchedule[] | undefined): DaySchedule[] {
  if (!Array.isArray(value) || value.length !== 7) {
    return structuredClone(defaultWeeklySchedule);
  }

  return defaultWeeklySchedule.map(defaultDay => {
    const incoming = value.find(day => day.weekday === defaultDay.weekday);
    const merged = { ...defaultDay, ...(incoming ?? {}) };
    const periods = Array.isArray(incoming?.periods) && incoming.periods.length
      ? incoming.periods
      : [{ id: `period-${defaultDay.weekday}-legacy`, startsAt: merged.opensAt, endsAt: merged.closesAt }];
    return { ...merged, periods };
  });
}

function normalizeService(service: Partial<Service> & Pick<Service, 'id' | 'name'>): Service {
  return {
    id: service.id,
    name: service.name,
    category: service.category ?? null,
    description: service.description ?? null,
    durationMinutes: service.durationMinutes ?? 30,
    bufferAfterMinutes: service.bufferAfterMinutes ?? 0,
    price: service.price ?? 0,
    priceType: service.priceType ?? 'fixed',
    publicPriceVisible: service.publicPriceVisible ?? true,
    depositPercent: service.depositPercent ?? null,
    onlineBookingEnabled: service.onlineBookingEnabled ?? true,
    recommendedReturnDays: service.recommendedReturnDays ?? null,
    professionalIds: service.professionalIds ?? [],
    addons: service.addons ?? [],
    active: service.active ?? true
  };
}

function normalizeProfessional(
  professional: Partial<Professional> & Pick<Professional, 'id' | 'name'>
): Professional {
  return {
    id: professional.id,
    name: professional.name,
    professionalName: professional.professionalName ?? null,
    role: professional.role ?? (professional.isOwner ? 'owner' : 'barber'),
    phone: professional.phone ?? null,
    email: professional.email ?? null,
    servesClients: professional.servesClients ?? true,
    receivesCommission: professional.receivesCommission ?? false,
    commissionPercent: professional.commissionPercent ?? 0,
    acceptsOnlineBooking: professional.acceptsOnlineBooking ?? true,
    publicVisible: professional.publicVisible ?? true,
    isOwner: professional.isOwner ?? false,
    weeklySchedule: Array.isArray(professional.weeklySchedule)
      ? normalizeWeeklySchedule(professional.weeklySchedule)
      : null,
    active: professional.active ?? true
  };
}

function normalizeAppointment(appointment: Database['appointments'][number]): Database['appointments'][number] {
  const createdAt = appointment.createdAt ?? new Date().toISOString();
  return {
    ...appointment,
    bufferAfterMinutes: appointment.bufferAfterMinutes ?? 0,
    commissionPercentSnapshot: appointment.commissionPercentSnapshot ?? 0,
    confirmedAt: appointment.confirmedAt ?? null,
    arrivedAt: appointment.arrivedAt ?? null,
    actualStartedAt: appointment.actualStartedAt ?? null,
    cancelledAt: appointment.cancelledAt ?? null,
    missedAt: appointment.missedAt ?? null,
    rescheduledAt: appointment.rescheduledAt ?? null,
    isFitIn: appointment.isFitIn ?? false,
    fitInConflictAppointmentId: appointment.fitInConflictAppointmentId ?? null,
    fitInReason: appointment.fitInReason ?? null,
    recurrenceId: appointment.recurrenceId ?? null,
    recurrenceIndex: appointment.recurrenceIndex ?? null,
    recurrencePaused: appointment.recurrencePaused ?? false,
    timeline: Array.isArray(appointment.timeline) && appointment.timeline.length
      ? appointment.timeline
      : [{
          id: randomUUID(),
          type: 'created',
          at: createdAt,
          actorUserId: appointment.registeredByUserId ?? null,
          actorName: null,
          note: null
        }]
  };
}

function normalizeRetroactiveRequest(
  item: Database['retroactiveRequests'][number]
): Database['retroactiveRequests'][number] {
  return {
    ...item,
    conflictAppointmentId: item.conflictAppointmentId ?? null,
    conflictConfirmed: item.conflictConfirmed ?? false,
    conflictJustification: item.conflictJustification ?? null
  };
}

function mergeByKey<T>(
  defaults: T[],
  incoming: T[] | undefined,
  getKey: (item: T) => string
): T[] {
  const incomingMap = new Map((incoming ?? []).map(item => [getKey(item), item]));

  return defaults.map(defaultItem => ({
    ...defaultItem,
    ...(incomingMap.get(getKey(defaultItem)) ?? {})
  }));
}
