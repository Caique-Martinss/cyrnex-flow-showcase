import { createServer as createHttpServer } from 'node:http';
import { createServer as createTcpServer } from 'node:net';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const SMTP_PORT = Number(process.env.DEV_MAILBOX_SMTP_PORT ?? 1025);
const HTTP_PORT = Number(process.env.DEV_MAILBOX_HTTP_PORT ?? 8025);
const MAILBOX_DIR = join(process.cwd(), 'server', 'data', 'dev-mailbox');

await mkdir(MAILBOX_DIR, { recursive: true });

const smtp = createTcpServer(socket => {
  socket.setEncoding('utf8');
  socket.write('220 CYRNEX FLOW Dev Mailbox\r\n');

  let buffer = '';
  let dataMode = false;
  let message = '';

  socket.on('data', chunk => {
    buffer += chunk;

    while (buffer.includes('\r\n')) {
      const end = buffer.indexOf('\r\n');
      const line = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);

      if (dataMode) {
        if (line === '.') {
          dataMode = false;
          void saveMessage(message);
          message = '';
          socket.write('250 Message accepted\r\n');
          continue;
        }
        message += `${line.replace(/^\.\./, '.')}\r\n`;
        continue;
      }

      const command = line.toUpperCase();
      if (command.startsWith('EHLO') || command.startsWith('HELO')) {
        socket.write('250-localhost\r\n250 SIZE 10485760\r\n');
      } else if (command.startsWith('MAIL FROM:') || command.startsWith('RCPT TO:')) {
        socket.write('250 OK\r\n');
      } else if (command === 'DATA') {
        dataMode = true;
        socket.write('354 End data with <CR><LF>.<CR><LF>\r\n');
      } else if (command === 'RSET' || command === 'NOOP') {
        socket.write('250 OK\r\n');
      } else if (command === 'QUIT') {
        socket.write('221 Bye\r\n');
        socket.end();
      } else {
        socket.write('250 OK\r\n');
      }
    }
  });
});

smtp.listen(SMTP_PORT, '127.0.0.1', () => {
  console.log(`📨 Caixa de e-mail local SMTP: 127.0.0.1:${SMTP_PORT}`);
});

const http = createHttpServer(async (_request, response) => {
  try {
    const files = (await readdir(MAILBOX_DIR))
      .filter(name => name.endsWith('.eml'))
      .sort()
      .reverse();
    const messages = await Promise.all(files.slice(0, 30).map(async name => ({
      name,
      content: await readFile(join(MAILBOX_DIR, name), 'utf8')
    })));

    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(renderMailbox(messages));
  } catch (error) {
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(`Erro ao abrir a caixa local: ${String(error)}`);
  }
});

http.listen(HTTP_PORT, '127.0.0.1', () => {
  console.log(`📬 Ver e-mails de teste: http://127.0.0.1:${HTTP_PORT}`);
});

async function saveMessage(content) {
  const name = `${new Date().toISOString().replace(/[:.]/g, '-')}-${Math.random().toString(36).slice(2, 8)}.eml`;
  await writeFile(join(MAILBOX_DIR, name), content, 'utf8');
  console.log(`✉️  E-mail capturado: ${name}`);
}

function renderMailbox(messages) {
  const cards = messages.length === 0
    ? '<div class="empty">Nenhum e-mail recebido ainda.</div>'
    : messages.map(message => {
      const to = header(message.content, 'To') || '—';
      const subject = header(message.content, 'Subject') || 'Sem assunto';
      const code = message.content.match(/\b\d{6}\b/)?.[0] ?? '';
      return `<article><div class="meta"><b>${escapeHtml(subject)}</b><span>${escapeHtml(to)}</span></div>${code ? `<div class="code">${code}</div>` : ''}<pre>${escapeHtml(message.content)}</pre></article>`;
    }).join('');

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta http-equiv="refresh" content="4"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CYRNEX FLOW — Caixa local</title><style>body{font:15px Arial,sans-serif;background:#f4f1ea;color:#171717;margin:0;padding:30px}main{max-width:980px;margin:auto}h1{margin-bottom:4px}p{color:#666}article,.empty{background:white;border:1px solid #ddd3c3;border-radius:16px;padding:18px;margin:14px 0}.meta{display:flex;justify-content:space-between;gap:20px}.meta span{color:#777}.code{font-size:34px;font-weight:900;letter-spacing:.18em;color:#a87022;margin:18px 0}pre{white-space:pre-wrap;background:#f8f6f1;padding:14px;border-radius:10px;overflow:auto}</style></head><body><main><h1>Caixa de e-mail local</h1><p>Usada apenas durante o desenvolvimento do CYRNEX FLOW. Atualiza automaticamente.</p>${cards}</main></body></html>`;
}

function header(content, name) {
  const match = content.match(new RegExp(`^${name}:\\s*(.+)$`, 'im'));
  return match?.[1]?.trim() ?? '';
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function shutdown() {
  smtp.close();
  http.close();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
