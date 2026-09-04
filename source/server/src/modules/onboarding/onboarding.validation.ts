import type {
  BusinessModuleKey,
  BusinessRuleKey,
  DaySchedule,
  PaymentMethod,
  Professional,
  Service
} from '../../domain/types.js';
import { isValidTimeZone } from '../../utils/timezone.js';
import type { SaveOnboardingInput } from './onboarding.types.js';
const moduleKeys = new Set<BusinessModuleKey>([
    'finance',
    'whatsapp',
    'waitlist',
    'receivables',
    'products',
    'partnerships',
    'prosthesis',
    'loyalty',
    'customer_returns',
    'commissions',
    'reports'
]);
const ruleKeys = new Set<BusinessRuleKey>([
    'groom_courtesy',
    'repeat_no_show_deposit'
]);
const paymentMethods = new Set<PaymentMethod>([
    'cash',
    'pix',
    'debit',
    'credit',
    'other'
]);
export function validateOnboarding(input: SaveOnboardingInput, completing: boolean): string[] {
    const errors: string[] = [];
    const { settings } = input;
    if (settings.businessName.trim().length < 2) {
        errors.push('Informe o nome da barbearia.');
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(settings.bookingSlug)) {
        errors.push('O link personalizado contém caracteres inválidos.');
    }
    if (!isValidTimeZone(settings.timezone)) {
        errors.push('O fuso horário configurado para a empresa é inválido.');
    }
    validateContact(input, errors);
    validateProfile(input, errors);
    validateSchedule(settings.businessHours.weeklySchedule, errors, completing);
    validateProfessionals(input.professionals, settings.operationMode, errors, completing);
    validateServices(input.services, errors, completing);
    validateBooking(input, errors);
    validatePaymentMethods(input, errors, completing);
    validateModulesAndRules(input, errors);
    if (!Number.isInteger(input.currentStep) || input.currentStep < 0 || input.currentStep > 9) {
        errors.push('A etapa atual do onboarding é inválida.');
    }
    return [...new Set(errors)];
}
function validateContact(input: SaveOnboardingInput, errors: string[]) {
    const { contact } = input.settings;
    if (contact.email && !/^\S+@\S+\.\S+$/.test(contact.email)) {
        errors.push('Informe um e-mail válido ou deixe o campo vazio.');
    }
    const whatsappDigits = contact.whatsapp.replace(/\D/g, '');
    if (contact.whatsapp && whatsappDigits.length < 10) {
        errors.push('Informe um WhatsApp válido com DDD.');
    }
    if (contact.state && contact.state.trim().length !== 2) {
        errors.push('Use a sigla de 2 letras para o estado.');
    }
}
function validateProfile(input: SaveOnboardingInput, errors: string[]) {
    const foundedYear = input.settings.profile.foundedYear;
    const currentYear = new Date().getFullYear();
    if (foundedYear !== null && (foundedYear < 1900 || foundedYear > currentYear)) {
        errors.push('O ano de início da barbearia é inválido.');
    }
}
function validateSchedule(schedule: DaySchedule[], errors: string[], completing: boolean) {
    if (schedule.length !== 7 || new Set(schedule.map(day => day.weekday)).size !== 7) {
        errors.push('A semana precisa possuir exatamente os 7 dias configurados.');
        return;
    }
    const enabledDays = schedule.filter(day => day.enabled);
    if (completing && enabledDays.length === 0) {
        errors.push('Ative pelo menos um dia de atendimento.');
    }
    enabledDays.forEach(day => {
        const periods = day.periods?.length
            ? day.periods
            : [{ id: 'legacy', startsAt: day.opensAt, endsAt: day.closesAt }];
        const normalized = periods
            .map(period => ({
            ...period,
            start: clockToMinutes(period.startsAt),
            end: clockToMinutes(period.endsAt)
        }))
            .sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
        for (const period of normalized) {
            if (period.start === null || period.end === null || period.start >= period.end) {
                errors.push(`Existe um período inválido no dia ${day.weekday}.`);
            }
        }
        for (let index = 1; index < normalized.length; index += 1) {
            const previous = normalized[index - 1];
            const current = normalized[index];
            if (previous.end !== null && current.start !== null && current.start < previous.end) {
                errors.push(`Existem períodos sobrepostos no dia ${day.weekday}.`);
            }
        }
    });
}
function validateProfessionals(
    professionals: Professional[],
    operationMode: 'solo' | 'team',
    errors: string[],
    completing: boolean
) {
    const active = professionals.filter(item => item.active);
    if (completing && active.length === 0) {
        errors.push('Cadastre pelo menos um profissional.');
    }
    if (operationMode === 'solo' && active.length > 1) {
        errors.push('No modo profissional único deve existir somente um profissional ativo.');
    }
    validateUniqueNames(active.map(item => item.name), 'profissional', errors);
    active.forEach(professional => {
        if (professional.name.trim().length < 2) {
            errors.push('Todo profissional precisa ter um nome válido.');
        }
        if (professional.email && !/^\S+@\S+\.\S+$/.test(professional.email)) {
            errors.push(`O e-mail de ${professional.name || 'um profissional'} está inválido.`);
        }
        if (professional.commissionPercent < 0 || professional.commissionPercent > 100) {
            errors.push(`A comissão de ${professional.name || 'um profissional'} está inválida.`);
        }
        if (professional.weeklySchedule) {
            const before = errors.length;
            validateSchedule(professional.weeklySchedule, errors, false);
            if (errors.length > before) {
                errors.push(`Revise os horários próprios de ${professional.name || 'um profissional'}.`);
            }
        }
    });
}
function validateServices(services: Service[], errors: string[], completing: boolean) {
    const active = services.filter(service => service.active);
    if (completing && active.length === 0) {
        errors.push('Cadastre pelo menos um serviço.');
    }
    validateUniqueNames(active.map(item => item.name), 'serviço', errors);
    active.forEach(service => {
        if (service.name.trim().length < 2) {
            errors.push('Todo serviço precisa ter um nome válido.');
        }
        if (service.durationMinutes < 5 || service.durationMinutes > 720) {
            errors.push(`A duração do serviço ${service.name || 'sem nome'} está inválida.`);
        }
        if (service.bufferAfterMinutes < 0 || service.bufferAfterMinutes > 180) {
            errors.push(`O intervalo após ${service.name || 'o serviço'} está inválido.`);
        }
        if (service.price < 0) {
            errors.push(`O preço de ${service.name || 'um serviço'} está inválido.`);
        }
        if (!['fixed', 'from', 'consult'].includes(service.priceType)) {
            errors.push(`O tipo de preço de ${service.name || 'um serviço'} está inválido.`);
        }
        for (const addon of service.addons ?? []) {
            if (!addon.active)
                continue;
            if (addon.name.trim().length < 2)
                errors.push(`Existe adicional sem nome em ${service.name || 'um serviço'}.`);
            if (addon.priceDelta < 0 || addon.durationDeltaMinutes < 0)
                errors.push(`Existe adicional inválido em ${service.name || 'um serviço'}.`);
        }
        if (service.depositPercent !== null &&
            (service.depositPercent < 0 || service.depositPercent > 100)) {
            errors.push(`O sinal de ${service.name || 'um serviço'} está inválido.`);
        }
        if (service.recommendedReturnDays !== null &&
            (service.recommendedReturnDays < 1 || service.recommendedReturnDays > 730)) {
            errors.push(`O retorno recomendado de ${service.name || 'um serviço'} está inválido.`);
        }
    });
}
function validateBooking(input: SaveOnboardingInput, errors: string[]) {
    const { bookingRules, defaultDepositPercent, businessHours } = input.settings;
    if (businessHours.slotIntervalMinutes < 5 || businessHours.slotIntervalMinutes > 120) {
        errors.push('O intervalo da grade de horários deve ficar entre 5 e 120 minutos.');
    }
    if (bookingRules.minBookingNoticeMinutes < 0 ||
        bookingRules.minBookingNoticeMinutes > 10080) {
        errors.push('A antecedência mínima de agendamento está inválida.');
    }
    if (bookingRules.maxBookingDaysAhead < 1 || bookingRules.maxBookingDaysAhead > 730) {
        errors.push('O limite de dias futuros para agendar está inválido.');
    }
    if (defaultDepositPercent < 0 || defaultDepositPercent > 100) {
        errors.push('O percentual padrão de sinal deve ficar entre 0% e 100%.');
    }
    if (bookingRules.requireDeposit && defaultDepositPercent <= 0) {
        errors.push('Defina um percentual de sinal maior que 0% ou desative a exigência de sinal.');
    }
}
function validatePaymentMethods(input: SaveOnboardingInput, errors: string[], completing: boolean) {
    const methods = input.settings.paymentMethods;
    if (completing && !methods.some(item => item.active)) {
        errors.push('Ative pelo menos uma forma de pagamento.');
    }
    if (new Set(methods.map(item => item.method)).size !== methods.length) {
        errors.push('Existem formas de pagamento duplicadas.');
    }
    methods.forEach(item => {
        if (!paymentMethods.has(item.method)) {
            errors.push('Existe uma forma de pagamento desconhecida.');
        }
        if (item.active && item.label.trim().length < 2) {
            errors.push('Toda forma de pagamento ativa precisa ter um nome válido.');
        }
        if (item.feeValue < 0) {
            errors.push(`A taxa de ${item.label} não pode ser negativa.`);
        }
        if (item.feeType === 'percent' && item.feeValue > 100) {
            errors.push(`A taxa percentual de ${item.label} não pode passar de 100%.`);
        }
    });
    const prefs = input.settings.paymentPreferences;
    const pixActive = methods.some(item => item.method === 'pix' && item.active);
    if (input.settings.bookingRules.requireDeposit) {
        if (!prefs.usePixForDeposit)
            errors.push('Para exigir sinal no lançamento inicial, ative o Pix manual para sinais.');
        if (!pixActive)
            errors.push('O sinal está configurado para Pix, mas Pix está desativado.');
        if (pixActive && prefs.pixKey.trim().length < 3) {
            errors.push('Informe a chave Pix usada para receber o sinal.');
        }
        if (pixActive && prefs.pixReceiverName.trim().length < 2) {
            errors.push('Informe o nome do recebedor do Pix.');
        }
    }
}
function validateModulesAndRules(input: SaveOnboardingInput, errors: string[]) {
    const moduleList = input.settings.modules;
    const ruleList = input.settings.rules;
    if (new Set(moduleList.map(item => item.key)).size !== moduleList.length) {
        errors.push('Existem módulos duplicados na configuração.');
    }
    if (moduleList.some(item => !moduleKeys.has(item.key))) {
        errors.push('Existe um módulo desconhecido na configuração.');
    }
    const financeEnabled = moduleList.some(item => item.key === 'finance' && item.enabled);
    const financeDependentEnabled = moduleList.some(item => (
        (item.key === 'receivables' || item.key === 'products') && item.enabled
    ));
    if (financeDependentEnabled && !financeEnabled) {
        errors.push('Loja e contas a receber precisam do módulo financeiro ativo.');
    }
    const commissionsEnabled = moduleList.some(item => item.key === 'commissions' && item.enabled);
    if (commissionsEnabled && input.settings.operationMode === 'solo') {
        errors.push('O módulo de comissões não pode ficar ativo no modo profissional único.');
    }
    if (new Set(ruleList.map(item => item.key)).size !== ruleList.length) {
        errors.push('Existem regras especiais duplicadas.');
    }
    if (ruleList.some(item => !ruleKeys.has(item.key))) {
        errors.push('Existe uma regra especial desconhecida.');
    }
    const noShowRule = ruleList.find(item => item.key === 'repeat_no_show_deposit');
    if (noShowRule?.enabled) {
        const afterMisses = Number(noShowRule.config.afterMisses ?? 0);
        const depositPercent = Number(noShowRule.config.depositPercent ?? 0);
        if (afterMisses < 1 || afterMisses > 20) {
            errors.push('A quantidade de faltas para exigir sinal está inválida.');
        }
        if (depositPercent < 1 || depositPercent > 100) {
            errors.push('O sinal exigido após faltas deve ficar entre 1% e 100%.');
        }
    }
}
function validateUniqueNames(names: string[], label: string, errors: string[]) {
    const normalized = names.map(name => name.trim().toLocaleLowerCase('pt-BR'));
    if (new Set(normalized).size !== normalized.length) {
        errors.push(`Existem ${label}s com o mesmo nome.`);
    }
}
function clockToMinutes(value: string | null): number | null {
    if (!value || !/^\d{2}:\d{2}$/.test(value))
        return null;
    const [hours, minutes] = value.split(':').map(Number);
    if (hours > 23 || minutes > 59)
        return null;
    return hours * 60 + minutes;
}
