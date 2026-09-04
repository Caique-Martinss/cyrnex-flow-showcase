import net from 'node:net';
import tls from 'node:tls';

interface RecoveryEmailInput {
  to: string;
  code: string;
  expiresInMinutes: number;
}

interface PasswordChangedEmailInput {
  to: string;
}

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
  requireTls: boolean;
}

const DELIVERY_MODE = (process.env.PASSWORD_RECOVERY_DELIVERY ?? 'development').toLowerCase();

export function isRecoveryDeliveryConfigured(): boolean {
  if (DELIVERY_MODE === 'development') return true;
  if (DELIVERY_MODE !== 'smtp') return false;

  try {
    readSmtpConfig();
    return true;
  } catch {
    return false;
  }
}

export async function sendRecoveryCodeEmail(input: RecoveryEmailInput): Promise<void> {
  if (DELIVERY_MODE === 'development') {
    console.info(`[auth] Código de recuperação para ${input.to}: ${input.code}`);
    return;
  }

  if (DELIVERY_MODE !== 'smtp') {
    throw new Error('PASSWORD_RECOVERY_DELIVERY precisa ser development ou smtp.');
  }

  const config = readSmtpConfig();
  const subject = 'Código para recuperar sua senha — CYRNEX FLOW';
  const text = [
    'Você solicitou a recuperação da sua senha no CYRNEX FLOW.',
    '',
    `Seu código é: ${input.code}`,
    `Ele expira em ${input.expiresInMinutes} minutos.`,
    '',
    'Se você não solicitou esta alteração, ignore este e-mail.',
    'Nunca compartilhe este código com outras pessoas.'
  ].join('\n');

  await sendSmtpMail(config, input.to, subject, text);
}

export async function sendPasswordChangedEmail(input: PasswordChangedEmailInput): Promise<void> {
  if (DELIVERY_MODE === 'development') {
    console.info(`[auth] Aviso de senha alterada para ${input.to}.`);
    return;
  }

  if (DELIVERY_MODE !== 'smtp') return;

  const config = readSmtpConfig();
  const subject = 'Sua senha foi alterada — CYRNEX FLOW';
  const text = [
    'A senha da sua conta no CYRNEX FLOW foi alterada com sucesso.',
    '',
    'Por segurança, as sessões anteriores foram revogadas.',
    'Se você não fez esta alteração, entre em contato com o suporte imediatamente.'
  ].join('\n');

  await sendSmtpMail(config, input.to, subject, text);
}

export function canExposeDevelopmentCode(): boolean {
  return process.env.NODE_ENV !== 'production'
    && process.env.PASSWORD_RECOVERY_EXPOSE_CODE !== 'false';
}

function readSmtpConfig(): SmtpConfig {
  const host = process.env.SMTP_HOST?.trim() ?? '';
  const port = Number(process.env.SMTP_PORT ?? '587');
  const secure = (process.env.SMTP_SECURE ?? 'false').toLowerCase() === 'true';
  const user = process.env.SMTP_USER?.trim() ?? '';
  const password = process.env.SMTP_PASSWORD ?? '';
  const from = process.env.SMTP_FROM?.trim() ?? '';
  const requireTls = (process.env.SMTP_REQUIRE_TLS
    ?? (process.env.NODE_ENV === 'production' ? 'true' : 'false')).toLowerCase() === 'true';

  if (!host || !Number.isFinite(port) || !from) {
    throw new Error('SMTP não configurado. Preencha SMTP_HOST, SMTP_PORT e SMTP_FROM.');
  }

  return { host, port, secure, user, password, from, requireTls };
}

async function sendSmtpMail(
  config: SmtpConfig,
  to: string,
  subject: string,
  text: string
): Promise<void> {
  let socket = await connect(config.host, config.port, config.secure);
  let reader = createReader(socket);

  await reader.expect(220);
  await command(socket, reader, `EHLO cyrnex-flow`, 250);

  const capabilities = reader.lastResponse.toUpperCase();
  const supportsStartTls = capabilities.includes('STARTTLS');
  if (!config.secure && supportsStartTls) {
    await command(socket, reader, 'STARTTLS', 220);
    socket.removeAllListeners('data');
    socket = await upgradeToTls(socket, config.host);
    reader = createReader(socket);
    await command(socket, reader, 'EHLO cyrnex-flow', 250);
  } else if (!config.secure && config.requireTls) {
    socket.end();
    throw new Error('O servidor SMTP não oferece STARTTLS, mas SMTP_REQUIRE_TLS está ativo.');
  }

  if (config.user) {
    const authCapabilities = reader.lastResponse.toUpperCase();
    if (authCapabilities.includes('AUTH LOGIN')) {
      await command(socket, reader, 'AUTH LOGIN', 334);
      await command(socket, reader, Buffer.from(config.user).toString('base64'), 334);
      await command(socket, reader, Buffer.from(config.password).toString('base64'), 235);
    } else if (authCapabilities.includes('AUTH PLAIN')) {
      const credentials = Buffer.from(`\0${config.user}\0${config.password}`).toString('base64');
      await command(socket, reader, `AUTH PLAIN ${credentials}`, 235);
    } else {
      socket.end();
      throw new Error('O servidor SMTP não oferece AUTH LOGIN nem AUTH PLAIN.');
    }
  }

  await command(socket, reader, `MAIL FROM:<${extractAddress(config.from)}>`, 250);
  await command(socket, reader, `RCPT TO:<${to}>`, [250, 251]);
  await command(socket, reader, 'DATA', 354);

  const headers = [
    `From: ${config.from}`,
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit'
  ].join('\r\n');
  const body = text.replace(/\r?\n/g, '\r\n').replace(/^\./gm, '..');
  socket.write(`${headers}\r\n\r\n${body}\r\n.\r\n`);
  await reader.expect(250);

  await command(socket, reader, 'QUIT', 221).catch(() => undefined);
  socket.end();
}

function connect(host: string, port: number, secure: boolean): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    const onError = (error: Error) => reject(error);
    const socket = secure
      ? tls.connect({ host, port, servername: host }, () => resolve(socket))
      : net.createConnection({ host, port }, () => resolve(socket));
    socket.once('error', onError);
  });
}

function upgradeToTls(socket: net.Socket, host: string): Promise<tls.TLSSocket> {
  return new Promise((resolve, reject) => {
    const secureSocket = tls.connect({ socket, servername: host }, () => resolve(secureSocket));
    secureSocket.once('error', reject);
  });
}

function createReader(socket: net.Socket) {
  let buffer = '';
  let lastResponse = '';
  const responses: string[] = [];
  const waiters: Array<(value: string) => void> = [];

  socket.on('data', chunk => {
    buffer += chunk.toString('utf8');

    while (true) {
      const lines = buffer.split('\r\n');
      let terminalIndex = -1;

      for (let index = 0; index < lines.length - 1; index += 1) {
        if (/^\d{3} /.test(lines[index])) {
          terminalIndex = index;
          break;
        }
      }

      if (terminalIndex < 0) break;
      const response = lines.slice(0, terminalIndex + 1).join('\r\n');
      buffer = lines.slice(terminalIndex + 1).join('\r\n');
      lastResponse = response;

      const waiter = waiters.shift();
      if (waiter) waiter(response);
      else responses.push(response);
    }
  });

  return {
    get lastResponse() { return lastResponse; },
    async expect(expected: number | number[]): Promise<string> {
      const response = responses.length > 0
        ? responses.shift()!
        : await new Promise<string>(resolve => waiters.push(resolve));
      const responseLines = response.split(/\r\n/);
      const lastLine = responseLines[responseLines.length - 1] ?? '';
      const code = Number(lastLine.slice(0, 3));
      const valid = Array.isArray(expected) ? expected.includes(code) : code === expected;
      if (!valid) throw new Error(`SMTP respondeu ${code}: ${response}`);
      return response;
    }
  };
}

async function command(
  socket: net.Socket,
  reader: ReturnType<typeof createReader>,
  value: string,
  expected: number | number[]
): Promise<string> {
  socket.write(`${value}\r\n`);
  return reader.expect(expected);
}

function extractAddress(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return (match?.[1] ?? from).trim();
}

function encodeHeader(value: string): string {
  return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
}
