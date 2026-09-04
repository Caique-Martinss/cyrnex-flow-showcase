import process from 'node:process';

const required = [
  'CORS_ORIGIN',
  'SUPABASE_URL',
  'SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SECRET_KEY',
  'SMTP_HOST',
  'SMTP_FROM'
];

const errors = [];
const warnings = [];
const value = name => (process.env[name] ?? '').trim();

if (value('NODE_ENV') !== 'production') errors.push('NODE_ENV precisa ser production.');
if (value('CYRNEX_AUTH_PROVIDER').toLowerCase() !== 'supabase') {
  errors.push('CYRNEX_AUTH_PROVIDER precisa ser supabase.');
}
if (value('PASSWORD_RECOVERY_DELIVERY').toLowerCase() !== 'smtp') {
  errors.push('PASSWORD_RECOVERY_DELIVERY precisa ser smtp.');
}
if (value('PASSWORD_RECOVERY_EXPOSE_CODE').toLowerCase() === 'true') {
  errors.push('PASSWORD_RECOVERY_EXPOSE_CODE precisa ser false.');
}
for (const name of required) {
  if (!value(name)) errors.push(`${name} nao configurado.`);
}
if (!value('CORS_ORIGIN').startsWith('https://')) errors.push('CORS_ORIGIN precisa usar HTTPS.');
if (value('CORS_ORIGIN').includes('*')) errors.push('CORS_ORIGIN nao pode usar * com sessao/credenciais.');
if (!value('SUPABASE_URL').startsWith('https://')) errors.push('SUPABASE_URL precisa usar HTTPS.');
if (!value('CYRNEX_RELEASE')) warnings.push('CYRNEX_RELEASE nao definido; health check nao mostrara a versao real.');
if (!value('CYRNEX_EXTERNAL_STATUS_URL')) warnings.push('Monitor externo ainda nao configurado.');
if (!value('SMTP_USER')) warnings.push('SMTP_USER vazio: aceite apenas se seu provedor realmente nao exigir usuario.');
if (!value('SMTP_PASSWORD')) warnings.push('SMTP_PASSWORD vazio: aceite apenas se seu provedor realmente nao exigir senha.');

console.log('CYRNEX FLOW — production preflight');
if (warnings.length) {
  console.log('\nAvisos:');
  warnings.forEach(item => console.log(`- ${item}`));
}
if (errors.length) {
  console.error('\nBLOQUEADO:');
  errors.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}
console.log('\nOK: configuracao minima de producao consistente.');
