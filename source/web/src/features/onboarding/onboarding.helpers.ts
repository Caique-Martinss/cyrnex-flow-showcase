import type { BusinessMediaItem, OnboardingState, Professional, Service } from '../../domain/types';
export interface ReviewIssue {
    step: number;
    severity: 'error' | 'recommendation';
    title: string;
    why: string;
    fix: string;
}
export function cloneOnboardingState(state: OnboardingState): OnboardingState {
    return structuredClone(state);
}
export function createProfessional(index: number, owner = false): Professional {
    return {
        id: crypto.randomUUID(),
        name: '',
        professionalName: null,
        role: owner ? 'owner' : 'barber',
        phone: null,
        email: null,
        servesClients: true,
        receivesCommission: !owner,
        commissionPercent: 0,
        acceptsOnlineBooking: true,
        publicVisible: true,
        isOwner: owner,
        weeklySchedule: null,
        active: true
    };
}
export function createService(name = '', category = 'Cabelo'): Service {
    return {
        id: crypto.randomUUID(),
        name,
        category,
        description: null,
        durationMinutes: 45,
        bufferAfterMinutes: 0,
        price: 0,
        priceType: 'fixed',
        publicPriceVisible: true,
        depositPercent: null,
        onlineBookingEnabled: true,
        recommendedReturnDays: null,
        professionalIds: [],
        addons: [],
        active: true
    };
}
export function createMediaItem(category = 'Outro'): BusinessMediaItem {
    return {
        id: crypto.randomUUID(),
        mediaType: 'image',
        dataUrl: null,
        title: '',
        description: '',
        category,
        serviceId: null,
        publicVisible: true
    };
}
export function slugify(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('pt-BR')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
export function validateStep(state: OnboardingState, step: number): string | null {
    const issues = getStepIssues(state, step).filter(item => item.severity === 'error');
    if (issues.length === 0)
        return null;
    const issue = issues[0];
    return `${issue.title}\n\nPor que: ${issue.why}\n\nComo corrigir: ${issue.fix}`;
}
export function getReviewIssues(state: OnboardingState): ReviewIssue[] {
    return Array.from({ length: 9 }, (_, step) => getStepIssues(state, step)).flat();
}
function getStepIssues(state: OnboardingState, step: number): ReviewIssue[] {
    switch (step) {
        case 0: return businessIssues(state);
        case 1: return aboutIssues(state);
        case 2: return operationIssues(state);
        case 3: return hoursIssues(state);
        case 4: return serviceIssues(state);
        case 5: return bookingIssues(state);
        case 6: return paymentIssues(state);
        case 7: return moduleIssues(state);
        case 8: return publicPageIssues(state);
        default: return getReviewIssues(state).filter(item => item.severity === 'error');
    }
}
function businessIssues(state: OnboardingState): ReviewIssue[] {
    const issues: ReviewIssue[] = [];
    if (state.settings.businessName.trim().length < 2) {
        issues.push(issue(
          0,
          'error',
          'Informe o nome da sua barbearia.',
          'Esse nome identifica a unidade em todo o sistema.',
          'Digite pelo menos 2 caracteres no campo “Nome da barbearia”.'
        ));
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(state.settings.bookingSlug)) {
        issues.push(issue(
          0,
          'error',
          'O endereço público precisa ser ajustado.',
          'O link aceita somente letras minúsculas, números e hífens.',
          'Use o link sugerido automaticamente ou edite sem espaços e acentos.'
        ));
    }
    return issues;
}
function aboutIssues(state: OnboardingState): ReviewIssue[] {
    const year = state.settings.profile.foundedYear;
    const issues: ReviewIssue[] = [];
    if (year !== null && (year < 1900 || year > new Date().getFullYear())) {
        issues.push(issue(
          1,
          'error',
          'Confira o ano de início.',
          'O ano informado está fora de um período válido.',
          'Informe o ano em que você começou a atuar ou deixe o campo vazio.'
        ));
    }
    if (!state.settings.profile.logoDataUrl) {
        issues.push(issue(
          1,
          'recommendation',
          'Sua página ainda não tem logo ou foto principal.',
          'Uma imagem principal deixa a página mais reconhecível para os clientes.',
          'Adicione uma imagem agora ou faça isso depois em Configurações.'
        ));
    }
    return issues;
}
function operationIssues(state: OnboardingState): ReviewIssue[] {
    const active = state.professionals.filter(item => item.active);
    const issues: ReviewIssue[] = [];
    if (active.length === 0) {
        issues.push(issue(
          2,
          'error',
          'Cadastre pelo menos um profissional.',
          'A agenda precisa saber quem realiza os atendimentos.',
          'Cadastre o dono ou outro profissional que atende clientes.'
        ));
    }
    if (state.settings.operationMode === 'solo' && active.length !== 1) {
        issues.push(issue(
          2,
          'error',
          'O modo “Trabalho sozinho” deve ter somente um profissional ativo.',
          'Esse modo esconde recursos de equipe e atribui os atendimentos automaticamente.',
          'Deixe somente o dono ativo ou altere para “Tenho equipe”.'
        ));
    }
    if (active.some(item => item.name.trim().length < 2)) {
        issues.push(issue(
          2,
          'error',
          'Existe profissional sem nome.',
          'Precisamos identificar corretamente quem trabalha na barbearia.',
          'Preencha o nome de cada profissional ativo.'
        ));
    }
    return issues;
}
function hoursIssues(state: OnboardingState): ReviewIssue[] {
    const enabled = state.settings.businessHours.weeklySchedule.filter(day => day.enabled);
    const issues: ReviewIssue[] = [];
    if (enabled.length === 0) {
        issues.push(issue(
          3,
          'error',
          'Selecione pelo menos um dia de atendimento.',
          'Sem dias ativos, a agenda pública não consegue oferecer horários.',
          'Clique nos dias em que a barbearia normalmente funciona.'
        ));
        return issues;
    }
    enabled.forEach(day => {
        const periods = day.periods.length
          ? day.periods
          : [{
              id: 'legacy',
              startsAt: day.opensAt,
              endsAt: day.closesAt
            }];
        periods.forEach(period => {
            if (!period.startsAt || !period.endsAt || period.startsAt >= period.endsAt) {
                issues.push(issue(
                  3,
                  'error',
                  `Existe um período inválido no dia ${day.weekday + 1}.`,
                  'O horário de início precisa acontecer antes do horário de término.',
                  'Corrija o período ou remova esse intervalo de atendimento.'
                ));
            }
        });
        const ordered = [...periods].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
        for (let index = 1; index < ordered.length; index += 1) {
            if (ordered[index].startsAt < ordered[index - 1].endsAt) {
                issues.push(issue(
                  3,
                  'error',
                  `Existem horários sobrepostos no dia ${day.weekday + 1}.`,
                  'Dois períodos de atendimento ocupam o mesmo horário.',
                  'Ajuste o início ou o fim dos períodos para que não se cruzem.'
                ));
            }
        }
    });
    return issues;
}
function serviceIssues(state: OnboardingState): ReviewIssue[] {
    const active = state.services.filter(item => item.active);
    const issues: ReviewIssue[] = [];
    if (active.length === 0) {
        issues.push(issue(
          4,
          'error',
          'Cadastre pelo menos um serviço.',
          'O cliente precisa escolher um serviço para que a agenda calcule duração e preço.',
          'Use um serviço comum ou crie seu próprio serviço.'
        ));
        return issues;
    }
    if (active.some(item => item.name.trim().length < 2)) {
        issues.push(issue(
          4,
          'error',
          'Existe serviço sem nome.',
          'Serviços sem identificação não podem aparecer no agendamento.',
          'Preencha o nome de todos os serviços ativos.'
        ));
    }
    if (active.some(item => item.durationMinutes < 5)) {
        issues.push(issue(
          4,
          'error',
          'Existe serviço sem duração válida.',
          'A agenda usa a duração para descobrir quais horários realmente cabem no expediente.',
          'Informe pelo menos 5 minutos de duração.'
        ));
    }
    if (active.some(item => item.price < 0)) {
        issues.push(issue(
          4,
          'error',
          'Existe serviço com preço negativo.',
          'O financeiro não aceita valores negativos para um serviço.',
          'Use zero para cortesia/sob consulta ou informe um valor positivo.'
        ));
    }
    if (state.settings.operationMode === 'team'
      && active.some(item => item.onlineBookingEnabled && item.professionalIds.length === 0)) {
        issues.push(issue(
          4,
          'error',
          'Existe serviço online sem profissional responsável.',
          'O cliente conseguiria escolher o serviço, mas o sistema não saberia ' +
            'em qual agenda procurar disponibilidade.',
          'Selecione pelo menos um profissional que realiza esse serviço.'
        ));
    }
    const names = active.map(item => item.name.trim().toLocaleLowerCase('pt-BR'));
    if (new Set(names).size !== names.length) {
        issues.push(issue(
          4,
          'error',
          'Existem serviços com o mesmo nome.',
          'Nomes duplicados confundem o cliente e os relatórios.',
          'Dê nomes diferentes ou remova um dos serviços duplicados.'
        ));
    }
    if (active.some(item => (
      item.depositPercent !== null && (item.depositPercent < 0 || item.depositPercent > 100)
    ))) {
        issues.push(issue(
          4,
          'error',
          'Existe serviço com sinal inválido.',
          'O percentual do sinal precisa ficar entre 0% e 100%.',
          'Corrija o percentual ou escolha “Usar regra geral”.'
        ));
    }
    return issues;
}
function bookingIssues(state: OnboardingState): ReviewIssue[] {
    const rules = state.settings.bookingRules;
    const issues: ReviewIssue[] = [];
    if (rules.maxBookingDaysAhead < 1) {
        issues.push(issue(
          5,
          'error',
          'Defina até quando o cliente pode agendar.',
          'A agenda pública precisa de um limite de datas futuras.',
          'Escolha pelo menos 1 dia à frente.'
        ));
    }
    if (rules.requireDeposit && state.settings.defaultDepositPercent <= 0) {
        issues.push(issue(
          5,
          'error',
          'O sinal está ativado, mas o valor padrão está vazio.',
          'Sem um valor, o sistema não sabe quanto cobrar para reservar.',
          'Informe um percentual de sinal ou desative a exigência.'
        ));
    }
    const longest = Math.max(
      0,
      ...state.services.filter(item => item.active).map(item => item.durationMinutes + item.bufferAfterMinutes)
    );
    const hasShortDay = state.settings.businessHours.weeklySchedule.some(day => {
        if (!day.enabled)
            return false;
        return day.periods.some(period => minutes(period.endsAt) - minutes(period.startsAt) < longest);
    });
    if (longest > 0 && hasShortDay) {
        issues.push(issue(
          5,
          'recommendation',
          'Algum serviço pode não caber em todos os períodos de atendimento.',
          `Seu serviço mais longo ocupa ${longest} minutos e existe um período menor que isso. ` +
            'O sistema simplesmente não oferecerá um horário que termine depois do fechamento.',
          'Você pode aumentar o expediente, reduzir a duração do serviço ou usar hora extra manual quando necessário.'
        ));
    }
    return issues;
}
function paymentIssues(state: OnboardingState): ReviewIssue[] {
    const active = state.settings.paymentMethods.filter(item => item.active);
    const prefs = state.settings.paymentPreferences;
    const issues: ReviewIssue[] = [];
    if (active.length === 0) {
        issues.push(issue(
          6,
          'error',
          'Escolha pelo menos uma forma de pagamento.',
          'O sistema precisa saber como a barbearia recebe dos clientes.',
          'Ative Pix, dinheiro, débito, crédito ou outra forma.'
        ));
    }
    if (prefs.usePixForDeposit && state.settings.bookingRules.requireDeposit
      && !active.some(item => item.method === 'pix')) {
        issues.push(issue(
          6,
          'error',
          'O sinal está configurado para Pix, mas Pix está desativado.',
          'O cliente não teria uma forma válida de pagar o sinal.',
          'Ative Pix ou selecione outra forma para receber o sinal.'
        ));
    }
    if (prefs.usePixForDeposit && state.settings.bookingRules.requireDeposit && prefs.pixKey.trim().length < 3) {
        issues.push(issue(
          6,
          'error',
          'Informe a chave Pix usada para receber o sinal.',
          'O cliente precisa receber uma chave válida quando o serviço exigir sinal.',
          'Cadastre a chave Pix ou desative o recebimento de sinal por Pix.'
        ));
    }
    if (!prefs.configureCardFeesLater && active.some(item => (
      (item.method === 'debit' || item.method === 'credit') &&
      (item.feeValue < 0 || item.feeValue > 100)
    ))) {
        issues.push(issue(
          6,
          'error',
          'Confira as taxas do cartão.',
          'Uma taxa percentual precisa ficar entre 0% e 100%.',
          'Corrija a taxa informada ou escolha “Configurar depois”.'
        ));
    }
    return issues;
}
function moduleIssues(state: OnboardingState): ReviewIssue[] {
    const issues: ReviewIssue[] = [];
    const commissions = state.settings.modules.find(item => item.key === 'commissions');
    if (state.settings.operationMode === 'solo' && commissions?.enabled) {
        issues.push(issue(
          7,
          'error',
          'Comissões não são necessárias no modo individual.',
          'Você marcou que trabalha sozinho, então não existe equipe para calcular comissão.',
          'Desative Comissões ou volte à Operação e selecione “Tenho equipe”.'
        ));
    }
    return issues;
}
function publicPageIssues(state: OnboardingState): ReviewIssue[] {
    const profile = state.settings.profile;
    const issues: ReviewIssue[] = [];
    if (!profile.publicPageEnabled)
        return issues;
    if (profile.headline.trim().length > 160) {
        issues.push(issue(
          8,
          'error',
          'A frase de destaque está muito longa.',
          'Textos muito grandes prejudicam a capa da página pública.',
          'Resuma a frase para até 160 caracteres.'
        ));
    }
    if (profile.locationVisibility === 'full' && !state.settings.contact.addressLine.trim()) {
        issues.push(issue(
          8,
          'recommendation',
          'Você escolheu mostrar o endereço completo, mas ele ainda não foi informado.',
          'A página não terá como exibir a localização completa.',
          'Informe o endereço ou escolha mostrar apenas bairro/região ou ocultar.'
        ));
    }
    const whatsappDigits = state.settings.contact.whatsapp.replace(/\D/g, '');
    if (profile.primaryAction === 'whatsapp' && whatsappDigits.length < 10) {
        issues.push(issue(
          8,
          'error',
          'O botão principal está definido como WhatsApp, mas o número está vazio.',
          'O cliente clicaria no botão e não teria para onde ser direcionado.',
          'Informe um WhatsApp válido ou escolha outra ação principal.'
        ));
    }
    return issues;
}
function issue(step: number, severity: ReviewIssue['severity'], title: string, why: string, fix: string): ReviewIssue {
    return { step, severity, title, why, fix };
}
function minutes(clock: string): number {
    const [hour, minute] = clock.split(':').map(Number);
    return hour * 60 + minute;
}
