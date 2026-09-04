import { existsSync, readFileSync } from 'node:fs';

loadLocalEnv('.env');

const url = required('SUPABASE_URL').replace(/\/$/, '');
const secretKey = required('SUPABASE_SECRET_KEY');
const username = (process.env.CYRNEX_ADMIN_USERNAME ?? '').trim();
const email = (process.env.CYRNEX_ADMIN_EMAIL ?? '').trim().toLowerCase();
const role = (process.env.CYRNEX_ADMIN_ROLE ?? 'super_admin').trim();

if (!['super_admin', 'support'].includes(role)) {
  fail('CYRNEX_ADMIN_ROLE deve ser super_admin ou support.');
}
if (!username && !email) {
  fail('Defina CYRNEX_ADMIN_USERNAME (preferido) ou CYRNEX_ADMIN_EMAIL no .env local.');
}

const resolved = username
  ? await findAuthUserByUsername(username)
  : await findAuthUserByEmail(email);

if (!resolved?.userId) {
  const label = username ? `login ${username}` : `e-mail ${email}`;
  fail(
    `Nenhuma conta Supabase Auth foi encontrada para ${label}. ` +
    'Crie a conta normalmente no CYRNEX FLOW primeiro; a senha nunca deve ser gravada neste script.'
  );
}

const response = await fetch(`${url}/rest/v1/platform_admins?on_conflict=user_id`, {
  method: 'POST',
  headers: adminHeaders({ prefer: 'resolution=merge-duplicates,return=representation' }),
  body: JSON.stringify({ user_id: resolved.userId, role, active: true })
});

if (!response.ok) {
  const text = await response.text();
  fail(`Não foi possível conceder acesso administrativo (${response.status}): ${text}`);
}

console.log('✅ Acesso CYRNEX Admin concedido com segurança.');
console.log(`Conta: ${username ? maskUsername(username) : maskEmail(email)}`);
console.log(`Papel: ${role}`);
console.log('Senha: não lida nem armazenada pelo projeto. Use a senha da própria conta CYRNEX.');
console.log('Acesse /admin ou use o botão CYRNEX Admin no menu da sua conta.');

async function findAuthUserByUsername(targetUsername) {
  const query = new URLSearchParams({
    select: 'user_id,username',
    username: `eq.${targetUsername}`,
    limit: '1'
  });
  const response = await fetch(`${url}/rest/v1/user_profiles?${query.toString()}`, {
    headers: adminHeaders()
  });
  if (!response.ok) {
    const text = await response.text();
    fail(`Não foi possível consultar o login no Supabase (${response.status}): ${text}`);
  }
  const rows = await response.json();
  const profile = Array.isArray(rows) ? rows[0] : null;
  return profile?.user_id ? { userId: profile.user_id } : null;
}

async function findAuthUserByEmail(targetEmail) {
  for (let page = 1; page <= 20; page += 1) {
    const response = await fetch(`${url}/auth/v1/admin/users?page=${page}&per_page=100`, {
      headers: adminHeaders()
    });
    if (!response.ok) {
      const text = await response.text();
      fail(`Não foi possível consultar usuários do Supabase Auth (${response.status}): ${text}`);
    }
    const payload = await response.json();
    const users = Array.isArray(payload?.users) ? payload.users : [];
    const match = users.find(item => String(item?.email ?? '').trim().toLowerCase() === targetEmail);
    if (match) return { userId: match.id };
    if (users.length < 100) return null;
  }
  return null;
}

function adminHeaders({ prefer } = {}) {
  return {
    apikey: secretKey,
    Authorization: `Bearer ${secretKey}`,
    'Content-Type': 'application/json',
    ...(prefer ? { Prefer: prefer } : {})
  };
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) fail(`Defina ${name} no ambiente local antes de executar.`);
  return value;
}

function loadLocalEnv(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index < 1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function maskEmail(value) {
  const [local, domain] = value.split('@');
  if (!domain) return '***';
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'*'.repeat(Math.max(2, local.length - visible.length))}@${domain}`;
}

function maskUsername(value) {
  const visible = value.slice(0, Math.min(2, value.length));
  return `${visible}${'*'.repeat(Math.max(2, value.length - visible.length))}`;
}

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}
