import { existsSync, readFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

loadLocalEnv('.env');

const url = required('SUPABASE_URL').replace(/\/$/, '');
const secretKey = required('SUPABASE_SECRET_KEY');
const defaultRole = (process.env.CYRNEX_ADMIN_ROLE ?? 'super_admin').trim();

if (!['super_admin', 'support'].includes(defaultRole)) {
  fail('CYRNEX_ADMIN_ROLE deve ser super_admin ou support.');
}

const rl = createInterface({ input, output });

try {
  console.log('');
  console.log('CYRNEX — criação segura de administrador da plataforma');
  console.log('A senha será enviada diretamente ao Supabase Auth e não será gravada pelo projeto.');
  console.log('');

  const username = normalizeUsername(
    process.env.CYRNEX_ADMIN_USERNAME || await rl.question('Login/username: ')
  );
  const email = normalizeEmail(
    process.env.CYRNEX_ADMIN_EMAIL || await rl.question('E-mail da conta: ')
  );
  const displayName = normalizeDisplayName(
    process.env.CYRNEX_ADMIN_DISPLAY_NAME || await rl.question('Nome para exibição: ')
  );

  validateIdentity({ username, email, displayName });

  const existingProfile = await findProfileByUsername(username);
  if (existingProfile?.user_id) {
    fail(
      'Esse login já existe. Para promover uma conta já criada, use npm run admin:grant em vez de admin:create.'
    );
  }

  const existingEmail = await findAuthUserByEmail(email);
  if (existingEmail?.id) {
    fail(
      'Esse e-mail já existe no Supabase Auth. Use npm run admin:grant para promover a conta existente.'
    );
  }

  const password = await hiddenQuestion('Senha: ');
  const confirmPassword = await hiddenQuestion('Confirme a senha: ');

  if (password !== confirmPassword) fail('As senhas não coincidem. Nenhuma conta foi criada.');
  validatePassword(password);

  const created = await createAuthUser({ username, email, displayName, password });
  if (!created?.id) fail('O Supabase não retornou o ID da nova conta.');

  try {
    await grantPlatformAdmin(created.id, defaultRole);
  } catch (error) {
    console.error('⚠️ A identidade Auth foi criada, mas a promoção administrativa falhou.');
    console.error('Use npm run admin:grant depois de corrigir a configuração.');
    throw error;
  }

  console.log('');
  console.log('✅ Conta CYRNEX criada e promovida com segurança.');
  console.log(`Login: ${maskUsername(username)}`);
  console.log(`E-mail: ${maskEmail(email)}`);
  console.log(`Papel: ${defaultRole}`);
  console.log('Empresa vinculada: nenhuma (conta da plataforma).');
  console.log('Senha: não gravada pelo projeto.');
  console.log('Quando frontend/backend estiverem online, use essa mesma conta em /admin.');
} finally {
  rl.close();
}

async function hiddenQuestion(label) {
  if (!input.isTTY || !output.isTTY) {
    fail('Por segurança, admin:create exige um terminal interativo (TTY).');
  }

  output.write(label);
  input.setRawMode(true);
  input.resume();
  input.setEncoding('utf8');

  let value = '';
  try {
    while (true) {
      const chunk = await new Promise((resolve, reject) => {
        const onData = data => { cleanup(); resolve(data); };
        const onError = error => { cleanup(); reject(error); };
        const cleanup = () => {
          input.off('data', onData);
          input.off('error', onError);
        };
        input.once('data', onData);
        input.once('error', onError);
      });

      for (const char of String(chunk)) {
        if (char === '\r' || char === '\n') {
          output.write('\n');
          return value;
        }
        if (char === '\u0003') {
          output.write('\n');
          process.exit(130);
        }
        if (char === '\u007f' || char === '\b') {
          if (value.length > 0) value = value.slice(0, -1);
          continue;
        }
        if (char >= ' ') value += char;
      }
    }
  } finally {
    input.setRawMode(false);
    input.pause();
  }
}

async function createAuthUser({ username, email, displayName, password }) {
  const response = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username,
        display_name: displayName,
        cyrnex_account_kind: 'platform_admin_bootstrap'
      }
    })
  });

  if (!response.ok) {
    const body = await response.text();
    fail(`Não foi possível criar a identidade no Supabase Auth (${response.status}): ${body}`);
  }
  return response.json();
}

async function grantPlatformAdmin(userId, role) {
  const response = await fetch(`${url}/rest/v1/platform_admins?on_conflict=user_id`, {
    method: 'POST',
    headers: adminHeaders({ prefer: 'resolution=merge-duplicates,return=representation' }),
    body: JSON.stringify({ user_id: userId, role, active: true })
  });
  if (!response.ok) {
    const body = await response.text();
    fail(`Não foi possível conceder o papel administrativo (${response.status}): ${body}`);
  }
}

async function findProfileByUsername(username) {
  const query = new URLSearchParams({
    select: 'user_id,username',
    username: `eq.${username}`,
    limit: '1'
  });
  const response = await fetch(`${url}/rest/v1/user_profiles?${query.toString()}`, {
    headers: adminHeaders()
  });
  if (!response.ok) {
    const body = await response.text();
    fail(`Não foi possível verificar o login (${response.status}): ${body}`);
  }
  const rows = await response.json();
  return Array.isArray(rows) ? rows[0] ?? null : null;
}

async function findAuthUserByEmail(targetEmail) {
  for (let page = 1; page <= 20; page += 1) {
    const response = await fetch(`${url}/auth/v1/admin/users?page=${page}&per_page=100`, {
      headers: adminHeaders()
    });
    if (!response.ok) {
      const body = await response.text();
      fail(`Não foi possível verificar o e-mail no Auth (${response.status}): ${body}`);
    }
    const payload = await response.json();
    const users = Array.isArray(payload?.users) ? payload.users : [];
    const match = users.find(item => String(item?.email ?? '').trim().toLowerCase() === targetEmail);
    if (match) return match;
    if (users.length < 100) return null;
  }
  return null;
}

function validateIdentity({ username, email, displayName }) {
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
    fail('O login deve ter 3 a 40 caracteres: letras minúsculas, números, ponto, _ ou -.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Informe um e-mail válido.');
  if (displayName.length < 2 || displayName.length > 120) fail('Nome de exibição inválido.');
}

function validatePassword(password) {
  if (password.length < 12) fail('Use uma senha com pelo menos 12 caracteres para a conta Super Admin.');
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    fail('A senha deve conter letra minúscula, maiúscula e número.');
  }
}

function normalizeUsername(value) {
  return String(value ?? '').trim().toLowerCase();
}
function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase();
}
function normalizeDisplayName(value) {
  return String(value ?? '').trim();
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
  if (!value) fail(`Defina ${name} no .env local antes de executar.`);
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
