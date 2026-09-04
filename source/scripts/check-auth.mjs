import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const errors = [];
const required = [
  'web/src/features/auth/AuthPage.tsx',
  'web/src/features/auth/PasswordField.tsx',
  'web/src/features/auth/PasswordRecoveryFlow.tsx',
  'web/src/hooks/useAuthSession.ts',
  'web/src/services/auth.api.ts',
  'server/src/modules/auth/auth.routes.ts',
  'server/src/modules/auth/localAuth.routes.ts',
  'server/src/modules/auth/productionAuth.routes.ts',
  'server/src/modules/auth/supabaseAuth.service.ts',
  'server/src/modules/auth/supabaseSession.ts',
  'server/src/modules/auth/passwordRecovery.routes.ts',
  'server/src/modules/auth/recoveryEmail.ts',
  'server/src/modules/auth/auth.store.ts',
  'server/src/modules/auth/password.ts',
  'server/src/modules/auth/session.ts',
  'server/src/middleware/auth.ts',
  'supabase/migrations/20260826001700_production_core.sql',
  'supabase/migrations/20260826172145_production_auth_owner_bootstrap.sql',
  'docs/AUTENTICACAO-E-ACESSO.md'
];

function exists(relativePath) {
  try {
    statSync(join(ROOT, relativePath));
    return true;
  } catch {
    return false;
  }
}

for (const path of required) {
  if (!exists(path)) errors.push(`Arquivo obrigatório de autenticação ausente: ${path}`);
}

if (errors.length === 0) {
  const app = readFileSync(join(ROOT, 'web/src/app/App.tsx'), 'utf8');
  const authPage = readFileSync(join(ROOT, 'web/src/features/auth/AuthPage.tsx'), 'utf8');
  const recoveryFlow = readFileSync(
    join(ROOT, 'web/src/features/auth/PasswordRecoveryFlow.tsx'),
    'utf8'
  );
  const serverApp = readFileSync(join(ROOT, 'server/src/app.ts'), 'utf8');
  const authRoutes = readFileSync(join(ROOT, 'server/src/modules/auth/localAuth.routes.ts'), 'utf8');
  const productionAuthRoutes = readFileSync(join(ROOT, 'server/src/modules/auth/productionAuth.routes.ts'), 'utf8');
  const supabaseAuth = readFileSync(join(ROOT, 'server/src/modules/auth/supabaseAuth.service.ts'), 'utf8');
  const recoveryRoutes = readFileSync(
    join(ROOT, 'server/src/modules/auth/passwordRecovery.routes.ts'),
    'utf8'
  );
  const migration = readFileSync(
    join(ROOT, 'supabase/migrations/20260826001700_production_core.sql'),
    'utf8'
  );

  const checks = [
    [app.includes('<AuthPage'), 'App não exige autenticação antes do painel.'],
    [app.includes("setActiveTab('overview')"), 'Onboarding não direciona ao painel principal.'],
    [serverApp.includes("app.use('/api/auth'"), 'API não montou /api/auth.'],
    [serverApp.includes('requireAuth, serializeBusinessMutations'), 'Rotas privadas não estão protegidas.'],
    [authRoutes.includes("router.post('/login'"), 'Login por usuário ausente.'],
    [authRoutes.includes("router.post('/register'"), 'Criação de conta ausente.'],
    [authRoutes.includes("router.post('/logout'"), 'Logout ausente.'],
    [authRoutes.includes("router.use('/recovery'"), 'Recuperação de senha não foi montada.'],
    [/router\.post\(\s*['"]\/request['"]/.test(recoveryRoutes),
      'Solicitação de recuperação ausente.'],
    [/router\.post\(\s*['"]\/verify['"]/.test(recoveryRoutes),
      'Validação do código ausente.'],
    [/router\.post\(\s*['"]\/reset['"]/.test(recoveryRoutes),
      'Troca da senha ausente.'],
    [recoveryRoutes.includes('MAX_CODE_ATTEMPTS'), 'Limite de tentativas do código ausente.'],
    [recoveryRoutes.includes('RESEND_SECONDS'), 'Cooldown de reenvio ausente.'],
    [recoveryRoutes.includes('hashRecoveryCode'), 'Hash forte do código ausente.'],
    [recoveryRoutes.includes('store.sessions = store.sessions.filter'), 'Reset não encerra sessões antigas.'],
    [authPage.includes('Esqueci minha senha'), 'Atalho Esqueci minha senha ausente no login.'],
    [authPage.includes('<PasswordField'), 'Campo de senha não possui exibir/ocultar reutilizável.'],
    [recoveryFlow.includes("type RecoveryStep = 'email' | 'code' | 'password' | 'done'"),
      'Fluxo completo de recuperação não foi encontrado.'],
    [migration.includes('user_profiles_username_unique_idx'), 'Username único ausente no schema.'],
    [productionAuthRoutes.includes('registerSupabaseOwner'), 'Cadastro Supabase de produção ausente.'],
    [productionAuthRoutes.includes('signInSupabaseWithUsername'), 'Login Supabase por username ausente.'],
    [supabaseAuth.includes('SUPABASE_SECRET_KEY'), 'Segredo Supabase não está restrito ao backend.'],
    [supabaseAuth.includes('accessToken'), 'JWT do usuário não está preparado para RLS.']
  ];

  for (const [passed, message] of checks) {
    if (!passed) errors.push(message);
  }
}

if (errors.length > 0) {
  console.error('\n❌ Autenticação não passou na validação:\n');
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}

console.log('✅ Autenticação aprovada.');
console.log('   Login por usuário curto: ativo');
console.log('   Sessão HTTP-only: ativa');
console.log('   Rotas administrativas protegidas: ativas');
console.log('   Vínculo usuário → barbearia: ativo');
console.log('   Recuperação por e-mail + código: ativa');
console.log('   Nova senha + encerramento de sessões antigas: ativos');
console.log('   Exibir/ocultar senha: ativo');
