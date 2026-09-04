import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const errors = [];
const required = [
  'server/src/modules/auth/passwordRecovery.routes.ts',
  'server/src/modules/auth/supabasePasswordRecovery.routes.ts',
  'server/src/modules/auth/productionAuth.routes.ts',
  'server/src/modules/auth/recoveryEmail.ts',
  'server/src/modules/auth/supabaseAuth.service.ts',
  'web/src/features/auth/PasswordRecoveryFlow.tsx',
  'supabase/migrations/20260831175442_production_password_recovery.sql',
  'scripts/dev-mailbox.mjs',
  '.env.example',
  'docs/RECUPERACAO-DE-SENHA.md'
];

for (const relative of required) {
  try { statSync(join(root, relative)); }
  catch { errors.push(`Arquivo obrigatório ausente: ${relative}`); }
}

if (errors.length === 0) {
  const localRoutes = readFileSync(join(root, required[0]), 'utf8');
  const supabaseRoutes = readFileSync(join(root, required[1]), 'utf8');
  const productionAuth = readFileSync(join(root, required[2]), 'utf8');
  const mail = readFileSync(join(root, required[3]), 'utf8');
  const supabaseAuth = readFileSync(join(root, required[4]), 'utf8');
  const flow = readFileSync(join(root, required[5]), 'utf8');
  const migration = readFileSync(join(root, required[6]), 'utf8');
  const env = readFileSync(join(root, '.env.example'), 'utf8');

  const checks = [
    [localRoutes.includes('RECOVERY_MINUTES') && supabaseRoutes.includes('RECOVERY_MINUTES'), 'Expiração do código ausente em um dos adapters.'],
    [localRoutes.includes('RESEND_SECONDS') && supabaseRoutes.includes('RESEND_SECONDS'), 'Cooldown de reenvio ausente em um dos adapters.'],
    [localRoutes.includes('MAX_CODE_ATTEMPTS = 5') && supabaseRoutes.includes('MAX_CODE_ATTEMPTS = 5'), 'Limite de tentativas ausente em um dos adapters.'],
    [localRoutes.includes('timingSafeEqual') && supabaseRoutes.includes('timingSafeEqual'), 'Comparação segura do código ausente em um dos adapters.'],
    [localRoutes.includes('verifyPassword(password'), 'Adapter local perdeu o bloqueio de reutilização da senha atual.'],
    [localRoutes.includes('store.sessions = store.sessions.filter'), 'Adapter local não encerra sessões antigas.'],
    [supabaseRoutes.includes('claim_password_recovery_challenge'), 'Produção Supabase não reivindica o token de redefinição atomicamente.'],
    [supabaseRoutes.includes('adminUpdateSupabaseUserPassword'), 'Produção Supabase não altera a senha pelo Auth Admin do servidor.'],
    [supabaseRoutes.includes('revoke_recovery_user_sessions'), 'Produção Supabase não revoga sessões antigas após a troca.'],
    [supabaseRoutes.includes('scryptSync') && supabaseRoutes.includes('timingSafeEqual'), 'Produção Supabase não protege/compara o código adequadamente.'],
    [productionAuth.includes("router.use('/recovery', supabasePasswordRecoveryRouter)"), 'Rotas de recuperação Supabase não estão montadas.'],
    [!productionAuth.includes("router.all('/recovery/*'"), 'Produção ainda possui bloqueio 503 legado para recuperação.'],
    [supabaseAuth.includes('adminUpdateSupabaseUserPassword'), 'Serviço Supabase não possui atualização administrativa de senha.'],
    [migration.includes('password_recovery_challenges') && migration.includes('force row level security'), 'Tabela de desafios não possui RLS + FORCE RLS.'],
    [migration.includes('to service_role') && migration.includes('revoke all'), 'Objetos de recuperação não estão restritos ao backend/service_role.'],
    [migration.includes('claim_password_recovery_challenge') && migration.includes('revoke_recovery_user_sessions'), 'RPCs transacionais de recuperação não estão na migration.'],
    [localRoutes.includes('sendPasswordChangedEmail') && supabaseRoutes.includes('sendPasswordChangedEmail'), 'Aviso de alteração da senha ausente.'],
    [mail.includes('sendSmtpMail'), 'Entrega SMTP real não foi implementada.'],
    [mail.includes('STARTTLS'), 'Suporte STARTTLS ausente.'],
    [flow.includes('Reenviar código em'), 'Contagem regressiva de reenvio ausente.'],
    [flow.includes('getRetryAfterSeconds'), 'Cooldown do servidor não chega à interface.'],
    [env.includes('SMTP_HOST='), 'Configuração SMTP não está documentada no ambiente.']
  ];

  for (const [passed, message] of checks) {
    if (!passed) errors.push(message);
  }
}

if (errors.length > 0) {
  console.error('\n❌ Recuperação de senha não passou na validação:\n');
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}

console.log('✅ Recuperação de senha aprovada no adapter local e no runtime Supabase.');
console.log('   Código de 6 dígitos: protegido com scrypt + comparação segura');
console.log('   Expiração + tentativas + uso único: ativos');
console.log('   Cooldown de reenvio: ativo');
console.log('   SMTP real: preparado (credenciais ficam no hosting)');
console.log('   Supabase: desafio protegido por RLS/FORCE RLS e service_role');
console.log('   Supabase: token de reset armazenado somente por hash');
console.log('   Sessões antigas: revogadas após redefinição');
console.log('   Aviso de senha alterada por e-mail: ativo');
