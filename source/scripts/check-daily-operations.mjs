import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const dataHook = read('web/src/hooks/useBarbershopData.ts');
const topbar = read('web/src/components/layout/Topbar.tsx');
const overview = read('web/src/features/overview/OverviewPage.tsx');
const overviewOps = read('web/src/features/overview/overview.operations.ts');
const agenda = read('web/src/features/agenda/AgendaPage.tsx');
const agendaDay = read('web/src/features/agenda/AgendaDayView.tsx');
const proofPanel = read('web/src/features/agenda/PaymentProofPanel.tsx');
const completion = read('web/src/features/agenda/CompletionModal.tsx');
const financePage = read('web/src/features/finance/FinancePage.tsx');
const financeRevenue = read('web/src/features/finance/FinanceRevenueView.tsx');
const clients = read('web/src/features/clients/ClientsPage.tsx');
const bookingConfirmation = read('web/src/features/booking/BookingConfirmation.tsx');
const publicManager = read('web/src/features/booking/PublicAppointmentManager.tsx');
const servicesStep = read('web/src/features/onboarding/steps/ServicesStep.tsx');
const publicApp = read('web/src/features/public-page/PublicAppointmentApp.tsx');
const publicRepository = read('server/src/modules/public-booking/publicBooking.management.repository.ts');
const appointmentRepository = read('server/src/modules/appointments/appointment.production.repository.ts');
const appPages = read('web/src/app/AppPages.tsx');
const peripheral = read('web/src/app/peripheral.actions.ts');
const migration = read('supabase/migrations/20260901173000_daily_operations_payment_consistency.sql');
const indexMigration = read('supabase/migrations/20260901173500_daily_operations_index_hardening.sql');

const checks = [
  [dataHook.includes('LIVE_SYNC_INTERVAL_MS = 30_000')
    && dataHook.includes("document.addEventListener('visibilitychange'")
    && dataHook.includes("window.addEventListener('focus'"),
  'Painel privado não possui sincronização automática/retorno à aba.'],
  [topbar.includes('Sincronizado agora') && topbar.includes('onRefresh'),
    'Usuário não consegue entender ou forçar a sincronização do painel.'],
  [appointmentRepository.includes('appointment_payment_proofs')
    && appointmentRepository.includes('paymentProofStatus'),
    'Agenda não recebe o estado resumido do comprovante junto dos agendamentos.'],
  [agendaDay.includes('Comprovante recebido • revisar')
    && agendaDay.includes('Sinal ainda pendente'),
    'Agenda não diferencia comprovante recebido de sinal ainda pendente.'],
  [proofPanel.includes('props.appointment.paymentProofStatus')
    && proofPanel.includes('props.appointment.paymentProofSubmittedAt'),
    'Inspector aberto não reage a comprovante enviado em outro dispositivo.'],
  [overviewOps.includes('comprovante(s) aguardando sua confirmação')
    && overviewOps.includes('status para atualizar'),
    'Visão Geral não prioriza pendências operacionais reais.'],
  [overview.includes('onOpenAppointment(focusAppointment.id)')
    && agenda.includes('navigationRequest'),
    'Visão Geral não abre o atendimento exato na Agenda.'],
  [financePage.includes('onOpenAppointment')
    && financeRevenue.includes('Ver atendimento na Agenda'),
    'Financeiro não está conectado ao atendimento de origem.'],
  [clients.includes('Atendimentos recentes')
    && clients.includes('onOpenAppointment(appointment.id)'),
    'Clientes não oferecem caminho direto para o histórico na Agenda.'],
  [completion.includes('appointment.commissionPercentSnapshot')
    && !completion.includes('appointment.professional?.commissionPercent'),
    'Conclusão exibe comissão diferente da regra congelada no agendamento.'],
  [completion.includes('priceBelowPaidDeposit')
    && completion.includes('invalidCardFee')
    && appointmentRepository.includes('remainingToReceive'),
    'Conclusão não protege valor abaixo do sinal ou taxa acima do restante.'],
  [migration.includes('appointments_card_fee_remaining_check'),
    'Banco não possui proteção final para taxa acima do valor restante.'],
  [indexMigration.includes('appointment_payment_proofs_reviewed_by_idx'),
    'FK de revisão de comprovante continua sem índice de suporte.'],
  [publicApp.includes('validatePaymentProofFile')
    && publicApp.includes('5 * 1024 * 1024'),
    'Upload público não valida formato/tamanho antes de ler o arquivo.'],
  [publicManager.includes('Envio de comprovante encerrado')
    && publicRepository.includes('não aceita novos comprovantes'),
    'Agendamento encerrado ainda poderia receber novo comprovante.'],
  [publicManager.includes('Horário reservado ✅')
    && publicManager.includes('Seu horário já está garantido')
    && publicManager.includes('aguarda apenas a conferência da barbearia'),
    'Cliente não recebe confirmação clara de que o horário permanece reservado enquanto o Pix é analisado.'],
  [bookingConfirmation.includes('allowDepositSimulation = false')
    && appPages.includes('allowDepositSimulation={false}')
    && !peripheral.includes('confirmBookingDeposit')
    && !peripheral.includes('changeDeposit'),
    'Fluxo real ainda contém confirmação/simulação antiga de sinal no painel.'],
  [!servicesStep.includes('Sinal: em desenvolvimento')
    && servicesStep.includes('Sinal: ${props.draft.settings.defaultDepositPercent}% (padrão)'),
    'Resumo de serviços ainda descreve como futuro um sinal Pix que já está implementado.']
];

const failed = checks.filter(([passed]) => !passed);
if (failed.length) {
  console.error('\n❌ Operação diária V11.7.2 não passou:\n');
  failed.forEach(([, message]) => console.error(`- ${message}`));
  process.exit(1);
}

console.log('✅ Operação diária V11.7.2 aprovada no código estático.');
console.log('   Auto-sync, Pix, Agenda, Clientes, Financeiro e navegação entre telas estão conectados.');
console.log('   Simulação antiga de pagamento não participa do fluxo real.');
