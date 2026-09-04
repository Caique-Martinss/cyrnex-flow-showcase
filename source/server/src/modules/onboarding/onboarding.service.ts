import { randomUUID } from 'node:crypto';
import { readDatabase, saveDatabase } from '../../database/index.js';
import { usesSupabaseAuth } from '../auth/auth.provider.js';
import type { BusinessSettings, DaySchedule, Professional, Service } from '../../domain/types.js';
import { normalizeOptionalText, normalizeText } from '../../utils/normalizers.js';
import { updateBusinessIdentity } from '../auth/auth.store.js';
import type { AuthContext } from '../auth/auth.types.js';
import { appendAuditEvent } from '../audit/audit.service.js';
import { professionalCanPerform } from '../appointments/appointment.validation.js';
import { isInsideProfessionalSchedule } from '../scheduling/schedule.service.js';
import type { OnboardingState, SaveOnboardingInput } from './onboarding.types.js';
import {
    loadProductionOnboardingState,
    saveProductionOnboardingState
} from './onboarding.production.repository.js';
export async function getOnboardingState(
    businessId: string,
    auth?: AuthContext
): Promise<OnboardingState> {
    if (usesSupabaseAuth() && auth?.accessToken) {
        return loadProductionOnboardingState(auth);
    }
    const database = await readDatabase(businessId);
    return {
        settings: database.settings,
        services: database.services,
        professionals: database.professionals
    };
}
export async function saveOnboardingState(
    businessId: string,
    input: SaveOnboardingInput,
    completed: boolean,
    auth?: AuthContext
): Promise<OnboardingState> {
    if (usesSupabaseAuth() && auth?.accessToken) {
        const current = await loadProductionOnboardingState(auth);
        const settings = sanitizeSettings(
            input.settings,
            input.currentStep,
            completed,
            current.settings.onboarding
        );
        const services = input.services.map(sanitizeService);
        const professionals = input.professionals.map(sanitizeProfessional);
        return saveProductionOnboardingState(
            auth,
            input,
            settings,
            services,
            professionals,
            completed
        );
    }

    const database = await readDatabase(businessId);
    const settings = sanitizeSettings(
        input.settings,
        input.currentStep,
        completed,
        database.settings.onboarding
    );
    const services = input.services.map(sanitizeService);
    const professionals = input.professionals.map(sanitizeProfessional);
    validateConfigurationImpact(database, settings, services, professionals);
    database.settings = settings;
    database.services = services;
    database.professionals = professionals;
    if (auth) {
        appendAuditEvent(database, auth, {
            action: completed ? 'business_configuration.completed' : 'business_configuration.updated',
            entityType: 'business_settings',
            entityId: businessId,
            metadata: {
                currentStep: input.currentStep,
                services: database.services.length,
                professionals: database.professionals.length,
                publicPageEnabled: database.settings.profile.publicPageEnabled
            }
        });
    }
    await saveDatabase(businessId, database);
    await updateBusinessIdentity(businessId, database.settings.businessName, database.settings.bookingSlug);
    return {
        settings: database.settings,
        services: database.services,
        professionals: database.professionals
    };
}
function sanitizeSettings(
    settings: BusinessSettings,
    currentStep: number,
    completed: boolean,
    previousOnboarding: BusinessSettings['onboarding']
): BusinessSettings {
    const weeklySchedule = settings.businessHours.weeklySchedule
        .map(sanitizeDay)
        .sort((a, b) => a.weekday - b.weekday);
    const activeDays = weeklySchedule.filter(day => day.enabled);
    const firstOpenDay = activeDays[0] ?? weeklySchedule[0];
    const lastCloseDay = activeDays[activeDays.length - 1] ?? weeklySchedule[0];
    const normalizedModules = normalizeModules(settings.modules);
    return {
        ...settings,
        businessName: normalizeText(settings.businessName),
        timezone: normalizeText(settings.timezone) || 'America/Sao_Paulo',
        bookingSlug: normalizeSlug(settings.bookingSlug),
        cancellationPolicy: normalizeText(settings.cancellationPolicy),
        defaultDepositPercent: roundNumber(settings.defaultDepositPercent),
        contact: {
            phone: normalizeText(settings.contact.phone),
            whatsapp: normalizeText(settings.contact.whatsapp),
            email: normalizeText(settings.contact.email).toLocaleLowerCase('pt-BR'),
            instagram: normalizeText(settings.contact.instagram),
            addressLine: normalizeText(settings.contact.addressLine),
            city: normalizeText(settings.contact.city),
            state: normalizeText(settings.contact.state).toLocaleUpperCase('pt-BR'),
            postalCode: normalizeText(settings.contact.postalCode)
        },
        profile: {
            ...settings.profile,
            headline: normalizeText(settings.profile.headline),
            aboutText: normalizeText(settings.profile.aboutText),
            foundedYear: settings.profile.foundedYear,
            publicPageEnabled: Boolean(settings.profile.publicPageEnabled),
            logoDataUrl: settings.profile.logoDataUrl || null,
            originStory: normalizeText(settings.profile.originStory),
            experienceText: normalizeText(settings.profile.experienceText),
            styleDescription: normalizeText(settings.profile.styleDescription),
            differentiatorText: normalizeText(settings.profile.differentiatorText),
            specialties: (settings.profile.specialties ?? []).map(normalizeText).filter(Boolean),
            differentials: (settings.profile.differentials ?? []).map(normalizeText).filter(Boolean),
            spaceMedia: (settings.profile.spaceMedia ?? []).map(item => ({
              ...item,
              title: normalizeText(item.title),
              description: normalizeText(item.description),
              category: normalizeText(item.category)
            })),
            portfolioMedia: (settings.profile.portfolioMedia ?? []).map(item => ({
              ...item,
              title: normalizeText(item.title),
              description: normalizeText(item.description),
              category: normalizeText(item.category)
            })),
            publicSections: [...(settings.profile.publicSections ?? [])],
            sectionOrder: [...(settings.profile.sectionOrder ?? [])],
            accentColor: normalizeText(settings.profile.accentColor) || '#b78945',
            publishOnComplete: Boolean(settings.profile.publishOnComplete)
        },
        bookingRules: {
            ...settings.bookingRules,
            allowWaitlist: false,
            requireDeposit: Boolean(settings.bookingRules.requireDeposit)
        },
        businessHours: {
            open: firstOpenDay.opensAt,
            close: lastCloseDay.closesAt,
            slotIntervalMinutes: Math.round(settings.businessHours.slotIntervalMinutes),
            closedWeekdays: weeklySchedule
                .filter(day => !day.enabled)
                .map(day => day.weekday),
            weeklySchedule
        },
        paymentMethods: settings.paymentMethods.map(item => ({
            ...item,
            label: normalizeText(item.label),
            feeValue: roundNumber(item.feeValue)
        })),
        paymentPreferences: {
            ...settings.paymentPreferences,
            pixKey: normalizeText(settings.paymentPreferences.pixKey),
            pixReceiverName: normalizeText(settings.paymentPreferences.pixReceiverName),
            cardMachineName: normalizeText(settings.paymentPreferences.cardMachineName),
            depositMethods: settings.paymentPreferences.usePixForDeposit ? ['pix'] : [],
            usePixForDeposit: Boolean(settings.paymentPreferences.usePixForDeposit),
            configureCardFeesLater: false,
            allowAuthorizedReceivables: false,
            recordTips: false,
            sendReceipt: false
        },
        modules: normalizedModules,
        rules: settings.rules.map(item => ({
            key: item.key,
            enabled: item.key === 'repeat_no_show_deposit' ? false : Boolean(item.enabled),
            config: item.key === 'groom_courtesy'
                ? { ...item.config, discountPercent: 100 }
                : { ...item.config }
        })),
        onboarding: {
            status: completed || previousOnboarding.status === 'completed'
                ? 'completed'
                : 'in_progress',
            currentStep,
            completedAt: completed
                ? previousOnboarding.completedAt ?? new Date().toISOString()
                : previousOnboarding.completedAt
        }
    };
}
function sanitizeDay(day: DaySchedule): DaySchedule {
    return {
        weekday: Math.round(day.weekday),
        enabled: Boolean(day.enabled),
        opensAt: day.opensAt,
        closesAt: day.closesAt,
        breakEnabled: Boolean(day.breakEnabled),
        breakStartsAt: day.breakEnabled ? day.breakStartsAt : null,
        breakEndsAt: day.breakEnabled ? day.breakEndsAt : null,
        periods: (day.periods?.length ? day.periods : [{
            id: 'legacy',
            startsAt: day.opensAt,
            endsAt: day.closesAt
        }]).map(period => ({
            id: normalizeText(period.id),
            startsAt: period.startsAt,
            endsAt: period.endsAt
        }))
    };
}
function sanitizeService(service: Service): Service {
    return {
        id: service.id || randomUUID(),
        name: normalizeText(service.name),
        category: normalizeOptionalText(service.category),
        description: normalizeOptionalText(service.description),
        durationMinutes: Math.round(service.durationMinutes),
        bufferAfterMinutes: Math.round(service.bufferAfterMinutes),
        price: roundNumber(service.price),
        priceType: service.priceType,
        publicPriceVisible: Boolean(service.publicPriceVisible),
        depositPercent: service.depositPercent === null
            ? null
            : roundNumber(service.depositPercent),
        onlineBookingEnabled: Boolean(service.onlineBookingEnabled),
        recommendedReturnDays: service.recommendedReturnDays === null
            ? null
            : Math.round(service.recommendedReturnDays),
        professionalIds: (service.professionalIds ?? []).map(normalizeText).filter(Boolean),
        addons: (service.addons ?? []).map(addon => ({
            id: addon.id || randomUUID(),
            name: normalizeText(addon.name),
            priceDelta: roundNumber(addon.priceDelta),
            durationDeltaMinutes: Math.round(addon.durationDeltaMinutes),
            active: Boolean(addon.active)
        })),
        active: Boolean(service.active)
    };
}
function sanitizeProfessional(professional: Professional): Professional {
    return {
        id: professional.id || randomUUID(),
        name: normalizeText(professional.name),
        professionalName: normalizeOptionalText(professional.professionalName),
        role: professional.role,
        phone: normalizeOptionalText(professional.phone),
        email: normalizeOptionalText(professional.email),
        servesClients: Boolean(professional.servesClients),
        receivesCommission: Boolean(professional.receivesCommission),
        commissionPercent: roundNumber(professional.commissionPercent),
        acceptsOnlineBooking: Boolean(professional.acceptsOnlineBooking),
        publicVisible: Boolean(professional.publicVisible),
        isOwner: Boolean(professional.isOwner),
        weeklySchedule: professional.weeklySchedule
            ? professional.weeklySchedule.map(sanitizeDay).sort((a, b) => a.weekday - b.weekday)
            : null,
        active: Boolean(professional.active)
    };
}
function normalizeSlug(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('pt-BR')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
function roundNumber(value: number): number {
    return Math.round((Number(value) || 0) * 100) / 100;
}
function normalizeModules(modules: BusinessSettings['modules']): BusinessSettings['modules'] {
    const availableNow = new Set(['finance']);
    return modules.map(item => ({
        key: item.key,
        enabled: availableNow.has(item.key) ? Boolean(item.enabled) : false
    }));
}
function validateConfigurationImpact(
    database: Awaited<ReturnType<typeof readDatabase>>,
    settings: BusinessSettings,
    services: Service[],
    professionals: Professional[]
): void {
    const activeStatuses = new Set(['scheduled', 'confirmed', 'arrived', 'in_service']);
    const now = Date.now();
    const future = database.appointments.filter(appointment => (
        activeStatuses.has(appointment.status) &&
        !appointment.recurrencePaused &&
        new Date(appointment.date).getTime() >= now
    ));
    if (!future.length) return;

    const serviceMap = new Map(
        services.map(service => [service.id, service])
    );
    const professionalMap = new Map(
        professionals.map(professional => [professional.id, professional])
    );

    for (const appointment of future) {
        const service = serviceMap.get(appointment.serviceId);
        if (!service || !service.active) {
            throw configurationConflict(
              `O serviço “${appointment.serviceName}” possui atendimento futuro. ` +
              'Resolva ou reagende esse atendimento antes de remover/desativar o serviço.'
            );
        }
        const professional = professionalMap.get(appointment.professionalId);
        if (!professional || !professional.active || !professional.servesClients) {
            throw configurationConflict(
              `O profissional “${appointment.professionalName}” possui atendimento futuro. ` +
              'Resolva ou transfira esse atendimento antes de remover/desativar o profissional.'
            );
        }
        if (!professionalCanPerform(service, professional.id)) {
            throw configurationConflict(
              `Existe atendimento futuro de “${appointment.serviceName}” com ` +
              `“${appointment.professionalName}”. Mantenha essa combinação permitida ` +
              'ou reagende o atendimento antes de salvar.'
            );
        }
        if (!isInsideProfessionalSchedule(
            settings,
            professional,
            new Date(appointment.date),
            appointment.durationMinutes,
            appointment.bufferAfterMinutes
        )) {
            const clientName = database.clients.find(
                client => client.id === appointment.clientId
            )?.name ?? 'um cliente';
            const appointmentLabel = new Date(appointment.date).toLocaleString(
                'pt-BR',
                { timeZone: settings.timezone }
            );
            throw configurationConflict(
              `A alteração de horários afetaria o atendimento de ${clientName} ` +
              `em ${appointmentLabel}. Reagende esse atendimento antes de salvar o novo expediente.`
            );
        }
    }
}

function configurationConflict(message: string): Error & { status: number } {
    return Object.assign(new Error(message), { status: 409 });
}

