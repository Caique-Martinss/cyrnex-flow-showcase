export function validateProductionConfiguration(): void {
  if (process.env.NODE_ENV !== 'production') return;

  const problems: string[] = [];
  const corsOrigins = (process.env.CORS_ORIGIN ?? '').trim();
  const recoveryMode = (process.env.PASSWORD_RECOVERY_DELIVERY ?? 'development').toLowerCase();
  const authProvider = (process.env.CYRNEX_AUTH_PROVIDER ?? 'supabase').toLowerCase();

  if (!corsOrigins) {
    problems.push('CORS_ORIGIN precisa listar explicitamente as origens permitidas.');
  }

  if (authProvider !== 'supabase') {
    problems.push('CYRNEX_AUTH_PROVIDER precisa ser supabase em produção.');
  }
  for (const variable of ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY']) {
    if (!(process.env[variable] ?? '').trim()) {
      problems.push(`${variable} precisa estar configurado no servidor.`);
    }
  }
  if (recoveryMode !== 'smtp') {
    problems.push('PASSWORD_RECOVERY_DELIVERY precisa ser smtp em produção.');
  } else {
    const smtpHost = (process.env.SMTP_HOST ?? '').trim();
    const smtpFrom = (process.env.SMTP_FROM ?? '').trim();
    const smtpPort = Number(process.env.SMTP_PORT ?? '587');
    if (!smtpHost) problems.push('SMTP_HOST precisa estar configurado no servidor.');
    if (!smtpFrom) problems.push('SMTP_FROM precisa estar configurado no servidor.');
    if (!Number.isFinite(smtpPort) || smtpPort <= 0 || smtpPort > 65535) {
      problems.push('SMTP_PORT precisa ser uma porta válida.');
    }
  }
  if (process.env.PASSWORD_RECOVERY_EXPOSE_CODE === 'true') {
    problems.push('PASSWORD_RECOVERY_EXPOSE_CODE não pode estar ativo.');
  }

  if (problems.length) {
    throw new Error(`Configuração de produção insegura:\n- ${problems.join('\n- ')}`);
  }
}
