import { spawn } from 'node:child_process';

const npmCli = process.env.npm_execpath;

if (!npmCli) {
  throw new Error('Não foi possível localizar o npm. Inicie usando npm.cmd run dev no Windows.');
}

function startWorkspace(folder, extraEnv = {}) {
  return spawn(process.execPath, [npmCli, '--prefix', folder, 'run', 'dev'], {
    stdio: 'inherit',
    windowsHide: false,
    env: { ...process.env, ...extraEnv }
  });
}

function startMailbox() {
  return spawn(process.execPath, ['scripts/dev-mailbox.mjs'], {
    stdio: 'inherit',
    windowsHide: false,
    env: { ...process.env }
  });
}

const localRecoveryEnv = {
  PASSWORD_RECOVERY_DELIVERY: process.env.PASSWORD_RECOVERY_DELIVERY ?? 'smtp',
  PASSWORD_RECOVERY_EXPOSE_CODE: process.env.PASSWORD_RECOVERY_EXPOSE_CODE ?? 'false',
  SMTP_HOST: process.env.SMTP_HOST ?? '127.0.0.1',
  SMTP_PORT: process.env.SMTP_PORT ?? '1025',
  SMTP_SECURE: process.env.SMTP_SECURE ?? 'false',
  SMTP_FROM: process.env.SMTP_FROM ?? 'CYRNEX FLOW <no-reply@localhost>'
};

const processes = [
  startMailbox(),
  startWorkspace('server', localRecoveryEnv),
  startWorkspace('web')
];
let stopping = false;

function stopAll(signal = 'SIGTERM') {
  if (stopping) return;
  stopping = true;

  for (const child of processes) {
    if (!child.killed) child.kill(signal);
  }
}

process.on('SIGINT', () => {
  stopAll('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopAll();
  process.exit(0);
});

for (const child of processes) {
  child.on('error', error => {
    console.error('Erro ao iniciar uma parte do projeto:', error);
    stopAll();
    process.exit(1);
  });

  child.on('exit', code => {
    if (!stopping && code && code !== 0) {
      stopAll();
      process.exit(code);
    }
  });
}
