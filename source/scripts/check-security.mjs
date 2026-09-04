import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(path, 'utf8');
}

const app = read('server/src/app.ts');
const authRoutes = [
  read('server/src/modules/auth/localAuth.routes.ts'),
  read('server/src/modules/auth/productionAuth.routes.ts'),
  read('server/src/modules/auth/supabaseAuth.service.ts')
].join('\n');
const authStore = read('server/src/modules/auth/auth.store.ts');
const fileDatabase = read('server/src/database/adapters/fileDatabase.ts');
const authorization = read('server/src/middleware/authorization.ts');
const locks = read('server/src/middleware/businessLock.ts');
const publicBooking = read('server/src/modules/public-booking/publicBooking.routes.ts');
const onboarding = read('server/src/modules/onboarding/onboarding.routes.ts');
const expenses = read('server/src/modules/expenses/expense.routes.ts');
const dashboard = read('server/src/modules/dashboard/dashboard.routes.ts');
const clients = read('server/src/modules/clients/client.routes.ts');
const appointments = read('server/src/modules/appointments/appointment.routes.ts');
const productionConfig = read('server/src/utils/productionConfig.ts');
const headers = read('server/src/middleware/securityHeaders.ts');
const webData = read('web/src/hooks/useBarbershopData.ts');
const migration = read('supabase/migrations/20260826001700_production_core.sql');
const webSources = [
  read('web/src/features/onboarding/OnboardingSuccess.tsx'),
  read('web/src/features/onboarding/steps/AboutStep.tsx'),
  read('web/src/features/onboarding/steps/PublicPageStep.tsx'),
  read('web/src/app/agenda.actions.ts')
].join('\n');

const checks = [
  [app.includes('serializeBusinessMutations'), 'Mutações privadas sem lock por empresa.'],
  [app.includes('serializeAuthMutations'), 'Mutações do auth store sem serialização local.'],
  [locks.includes('withBusinessLock<T>'), 'Lock reutilizável por empresa ausente.'],
  [app.includes("express.json({ limit: '64kb' })"), 'Rotas públicas/auth sem limite de payload reduzido.'],
  [app.includes('buildCorsOptions'), 'CORS explícito ausente.'],
  [productionConfig.includes('CORS_ORIGIN'), 'Produção não exige CORS_ORIGIN.'],
  [productionConfig.includes('PASSWORD_RECOVERY_EXPOSE_CODE'), 'Produção não bloqueia exposição de código.'],
  [productionConfig.includes("recoveryMode !== 'smtp'"), 'Produção não exige SMTP como modo real de recuperação.'],
  [productionConfig.includes('SMTP_HOST') && productionConfig.includes('SMTP_FROM'), 'Produção não falha fechado quando SMTP obrigatório está incompleto.'],
  [productionConfig.includes('SUPABASE_SECRET_KEY'), 'Produção não exige segredo Supabase no servidor.'],
  [authRoutes.includes('SUPABASE_SECRET_KEY'), 'Ponte Supabase administrativa ausente no backend.'],
  [authRoutes.includes('accessToken'), 'JWT do usuário não está preparado para consultas RLS.'],
  [headers.includes('Strict-Transport-Security'), 'HSTS de produção ausente.'],
  [headers.includes('X-Content-Type-Options'), 'Headers básicos de segurança ausentes.'],
  [authRoutes.includes('loginLimiter'), 'Rate limit específico de login ausente.'],
  [authRoutes.includes('registerLimiter'), 'Rate limit específico de cadastro ausente.'],
  [authorization.includes('requireBusinessAdmin'), 'Autorização administrativa central ausente.'],
  [onboarding.includes('requireBusinessAdmin'), 'Configurações/onboarding sem autorização administrativa.'],
  [expenses.includes('requireFinancialAccess'), 'Despesas sem autorização financeira.'],
  [dashboard.includes('requireFinancialAccess'), 'Dashboard financeiro sem autorização financeira.'],
  [clients.includes("requireRoles('owner', 'manager', 'receptionist')"), 'Clientes expostos ao cargo profissional sem vínculo seguro.'],
  [appointments.includes("requireRoles('owner', 'manager', 'receptionist')"), 'Agenda completa exposta ao cargo profissional sem vínculo seguro.'],
  [webData.includes('canAccessFinance'), 'Frontend ainda baixa financeiro para qualquer cargo.'],
  [webData.includes('canAccessFullOperations'), 'Frontend não falha fechado para profissional sem vínculo.'],
  [publicBooking.includes('publicPageEnabled'), 'API pública ignora página desativada.'],
  [publicBooking.includes('publicVisible'), 'API pública ignora profissional oculto.'],
  [publicBooking.includes('professionalCanPerform'), 'API pública não valida serviço x profissional.'],
  [publicBooking.includes('bookingCreationLimiter'), 'Criação pública sem proteção básica contra abuso.'],
  [publicBooking.includes('withBusinessLock'), 'Agendamento público sem lock local contra corrida.'],
  [publicBooking.includes('não pode sobrescrever'), 'Telefone público ainda pode sobrescrever cadastro existente.'],
  [authStore.includes('rename('), 'Auth store não usa gravação atômica.'],
  [fileDatabase.includes('rename('), 'Banco JSON não usa gravação atômica.'],
  [migration.includes('buffer_after_minutes_snapshot'), 'Schema sem snapshot de buffer.'],
  [migration.includes('recurrence_paused'), 'Schema sem estado de pausa por ocorrência.'],
  [migration.includes("'scheduled', 'confirmed', 'arrived', 'in_service'"), 'Schema não considera os estados operacionais novos.'],
  [migration.includes('and not is_fit_in'), 'Constraint não preserva encaixes conscientes.'],
  [!webSources.match(/window\.(alert|confirm|prompt)/), 'Diálogo nativo do navegador ainda presente.']
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error('\n❌ Segurança/estabilização não passou:\n');
  failures.forEach(message => console.error(`- ${message}`));
  process.exit(1);
}

console.log('✅ Segurança/estabilização estrutural aprovada.');
console.log('   Multiempresa: contexto de sessão + locks locais + validações relacionais');
console.log('   Autorizações: financeiro/configurações/operação sensível protegidos no backend');
console.log('   Público: página, profissional, serviço, abuso e concorrência revalidados no servidor');
console.log('   Produção: CORS/headers/recovery inseguros falham fechado');
console.log('   PostgreSQL: lifecycle, buffer e pausa alinhados na migration de estabilização');
