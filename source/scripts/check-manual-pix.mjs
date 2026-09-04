import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const migration = read('supabase/migrations/20260831190355_manual_pix_deposit_flow.sql');
const executeChain = read('supabase/migrations/20260831190554_manual_pix_rpc_execute_chain.sql');
const app = read('server/src/app.ts');
const route = read('server/src/modules/public-booking/publicBooking.paymentProof.routes.ts');
const storage = read('server/src/database/postgres/paymentProofStorage.ts');
const manager = read('web/src/features/booking/PublicAppointmentManager.tsx');
const publicApp = read('web/src/features/public-page/PublicAppointmentApp.tsx');
const proofPanel = read('web/src/features/agenda/PaymentProofPanel.tsx');
const payments = read('web/src/features/onboarding/steps/PaymentsStep.tsx');
const bookingRules = read('web/src/features/onboarding/steps/BookingRulesStep.tsx');
const finance = read('web/src/features/finance/finance.helpers.ts');
const preview = read('ABRIR-PREVIEW-CYRNEX-FLOW.html');

const checks = [
  [migration.includes('create table if not exists public.appointment_payment_proofs'),
    'Tabela privada de comprovantes não foi criada.'],
  [migration.includes('force row level security') && migration.includes("'payment-proofs'"),
    'RLS/FORCE RLS ou bucket privado do comprovante está ausente.'],
  [migration.includes('appointments_public_manual_pix_guard'),
    'Banco não bloqueia booking público com sinal sem Pix configurado.'],
  [migration.includes('deposit_paid_at') && migration.includes("deposit_status = 'paid'"),
    'Data real de recebimento do sinal não está persistida.'],
  [migration.includes('record_public_payment_proof')
      && migration.includes('review_agenda_payment_proof'),
    'RPCs de envio/revisão do comprovante não estão presentes.'],
  [executeChain.includes('to service_role')
      && executeChain.includes('to authenticated, service_role'),
    'Cadeia mínima de EXECUTE das RPCs Pix está incompleta.'],
  [app.indexOf('/api/public/bookings/manage/payment-proof') < app.indexOf("app.use('/api/public',"),
    'Upload do comprovante precisa ser montado antes do limite JSON público genérico.'],
  [route.includes("limit: 6") || route.includes('max:'),
    'Rota de comprovante não possui rate limit dedicado.'],
  [storage.includes('5 * 1024 * 1024') && storage.includes('createServerPaymentProofSignedUrl'),
    'Storage privado não limita 5 MB ou não usa URL assinada.'],
  [manager.includes('O envio do comprovante não confirma o pagamento sozinho')
      && manager.includes('Sinal confirmado'),
    'Cliente não recebe estados claros de pagamento.'],
  [publicApp.includes('15_000') && publicApp.includes("proofStatus !== 'submitted'"),
    'Meu Agendamento não atualiza automaticamente enquanto o comprovante é analisado.'],
  [proofPanel.includes('Confirmar pagamento') && proofPanel.includes('Recusar comprovante'),
    'Agenda não possui revisão explícita do comprovante.'],
  [payments.includes('Usar Pix para receber sinais') && bookingRules.includes('Pix manual'),
    'Onboarding não configura o fluxo manual de Pix.'],
  [finance.includes('depositPaidAt') && finance.includes('completionReceived'),
    'Financeiro não separa sinal recebido do valor restante na conclusão.'],
  [preview.includes('pvOpenPublicBooking')
      && preview.includes('pvPixConfirm')
      && preview.includes('Meu agendamento'),
    'Preview standalone não simula Pix manual ponta a ponta.']
];

const failed = checks.filter(([passed]) => !passed);
if (failed.length) {
  console.error('\n❌ Pix manual não passou no quality gate:\n');
  failed.forEach(([, message]) => console.error(`- ${message}`));
  process.exit(1);
}
console.log('✅ Pix manual aprovado no código estático.');
console.log('   Cliente → comprovante privado → Agenda → confirmação/recusa → Meu Agendamento.');
console.log('   Recebimento do sinal possui timestamp e entra no Financeiro pela data real.');
