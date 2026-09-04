import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const navigation = read('web/src/app/navigation.ts');
const sidebar = read('web/src/components/layout/Sidebar.tsx');
const modules = read('web/src/features/onboarding/steps/ModulesStep.tsx');
const onboardingConstants = read('web/src/features/onboarding/onboarding.constants.ts');
const bookingRules = read('web/src/features/onboarding/steps/BookingRulesStep.tsx');
const payments = read('web/src/features/onboarding/steps/PaymentsStep.tsx');
const services = read('web/src/features/onboarding/steps/ServicesStep.tsx');
const overview = read('web/src/features/overview/OverviewPage.tsx');
const overviewHelpers = read('web/src/features/overview/overview.helpers.ts');
const financeHelpers = read('web/src/features/finance/finance.helpers.ts');
const publicSections = read('web/src/features/public-page/PublicPrimarySections.tsx');
const clientsRoutes = read('server/src/modules/clients/client.routes.ts');
const prodAuth = read('server/src/modules/auth/productionAuth.routes.ts');
const recovery = read('server/src/modules/auth/supabasePasswordRecovery.routes.ts');
const migration = read('supabase/migrations/20260831175442_production_password_recovery.sql');
const settingsRepo = read('server/src/modules/settings/settings.repository.ts');
const scheduleRepo = read('server/src/modules/scheduling/scheduling.production.repository.ts');
const controller = read('web/src/app/useAppController.ts');
const agenda = read('web/src/features/agenda/AgendaPage.tsx');
const launchGuard = read('supabase/migrations/20260831175455_launch_guard_v1161.sql');
const manualPix = read('supabase/migrations/20260831190355_manual_pix_deposit_flow.sql');
const paymentManager = read('web/src/features/booking/PublicAppointmentManager.tsx');
const paymentProofPanel = read('web/src/features/agenda/PaymentProofPanel.tsx');

const checks = [
  [navigation.includes("label: 'WhatsApp'") && navigation.includes("label: 'Lista de espera'")
    && navigation.includes("label: 'Relatórios'"),
  'Menu de lançamento perdeu um dos módulos visíveis do roadmap.'],
  [navigation.match(/disabled: true/g)?.length >= 3 && navigation.match(/Em desenvolvimento/g)?.length >= 3,
  'WhatsApp, Lista de espera e Relatórios não estão bloqueados no menu.'],
  [sidebar.includes('disabled={item.disabled}') && sidebar.includes('nav-development-badge'),
  'Sidebar não respeita o bloqueio visual dos módulos em desenvolvimento.'],
  [modules.includes('isLaunchReadyModule') && onboardingConstants.includes("new Set<BusinessModuleKey>(['finance'])"),
  'Onboarding não limita módulos ativáveis ao conjunto pronto para lançamento.'],
  [bookingRules.includes('Exigir sinal por padrão')
    && bookingRules.includes('Pix manual com confirmação segura')
    && bookingRules.includes('Entrar na lista de espera — Em desenvolvimento'),
  'Sinal Pix manual ou bloqueio da lista de espera não estão coerentes no onboarding.'],
  [payments.includes('Usar Pix para receber sinais')
    && payments.includes("updatePrefs('depositMethods', value ? ['pix'] : [])")
    && payments.includes('Registrar gorjetas — Em desenvolvimento')
    && payments.includes('Enviar comprovante ao cliente — Em desenvolvimento'),
  'Pagamentos não separam corretamente Pix manual dos recursos ainda incompletos.'],
  [services.includes('Sinal deste serviço') && services.includes('Regra padrão')
    && services.includes('Pix manual com comprovante'),
  'Serviços não deixam claro que o sinal usa a regra padrão do Pix manual.'],
  [overview.includes("isModuleEnabled(settings, 'finance')")
    && !overview.includes("isModuleEnabled(settings, 'finance-revenue')"),
  'Visão Geral usa uma chave inválida para o módulo Financeiro.'],
  [overviewHelpers.includes('depositsReceivedToday')
    && overviewHelpers.includes('completionCash')
    && financeHelpers.includes('depositReceived')
    && financeHelpers.includes('completionReceived'),
  'Visão Geral e Financeiro não compartilham a mesma definição de recebido.'],
  [overviewHelpers.includes('getDateTextInTimeZone')
    && overviewHelpers.includes('getClockMinutesInTimeZone'),
  'Visão Geral ainda depende do fuso do dispositivo para o dia operacional.'],
  [publicSections.includes('function SectionHead') || publicSections.includes('const SectionHead'),
  'Página Pública usa SectionHead sem definição/importação.'],
  [clientsRoutes.includes("router.patch('/:clientId'"),
  'Clientes ainda não possuem edição no backend.'],
  [prodAuth.includes("router.use('/recovery', supabasePasswordRecoveryRouter)")
    && !prodAuth.includes("router.all('/recovery/*'"),
  'Recuperação de senha online continua bloqueada por 503.'],
  [recovery.includes('claim_password_recovery_challenge')
    && recovery.includes('adminUpdateSupabaseUserPassword')
    && recovery.includes('revoke_recovery_user_sessions'),
  'Recuperação Supabase não fecha o fluxo código → token → nova senha → revogação.'],
  [migration.includes('password_recovery_challenges')
    && migration.includes('force row level security')
    && migration.includes('service_role'),
  'Migration de recuperação não protege os desafios com RLS/server-only.'],
  [controller.includes('wa.me/') && !controller.includes("setActiveTab('whatsapp')"),
  'Atalho de WhatsApp ainda tenta abrir o módulo interno em desenvolvimento.'],
  [agenda.includes('settings.bookingRules.allowWaitlist ? props.waitlistEntries : []'),
  'Agenda ainda consegue expor lista de espera quando o recurso está bloqueado para lançamento.'],
  [launchGuard.includes('business_settings_launch_guard')
    && launchGuard.includes('business_modules_launch_guard')
    && launchGuard.includes('business_rules_launch_guard'),
  'Banco não possui trava de lançamento para recursos incompletos.'],
  [manualPix.includes('appointment_payment_proofs')
    && manualPix.includes('payment-proofs')
    && manualPix.includes('record_public_payment_proof')
    && manualPix.includes('review_agenda_payment_proof')
    && manualPix.includes('force row level security'),
  'Fluxo Pix manual não está protegido de ponta a ponta no banco.'],
  [paymentManager.includes('Já fiz o Pix • enviar comprovante')
    && paymentManager.includes('Comprovante enviado')
    && paymentManager.includes('Sinal confirmado'),
  'Tela do cliente não cobre envio, espera e confirmação do Pix manual.'],
  [paymentProofPanel.includes('Confirmar pagamento')
    && paymentProofPanel.includes('Recusar comprovante')
    && paymentProofPanel.includes('Ver comprovante'),
  'Agenda não oferece revisão explícita do comprovante Pix.'],
  [!settingsRepo.includes('.at(-1)') && !scheduleRepo.includes('.at(-1)'),
  'Ainda há uso de Array.at incompatível com o target atual.']
];

const failed = checks.filter(([passed]) => !passed);
if (failed.length) {
  console.error('\n❌ Fechamento pré-staging não passou:\n');
  failed.forEach(([, message]) => console.error(`- ${message}`));
  process.exit(1);
}

console.log('✅ Launch readiness V11.6.3 aprovado no código estático.');
console.log('   Escopo fechado; Pix manual protegido; recursos incompletos bloqueados; recovery preparado.');
