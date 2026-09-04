import app from './app.js';
import { writePlatformSystemLog } from './modules/platform-admin/platformSystemLog.js';
import { validateProductionConfiguration } from './utils/productionConfig.js';

validateProductionConfiguration();

const port = Number(process.env.PORT ?? 4000);

const server = app.listen(port, () => {
  console.log(`CYRNEX FLOW API rodando em http://localhost:${port}`);
  void writePlatformSystemLog({
    severity: 'info',
    category: 'lifecycle',
    source: 'api',
    message: 'CYRNEX FLOW API iniciada.',
    metadata: {
      port,
      environment: process.env.NODE_ENV ?? 'development',
      nodeVersion: process.version
    }
  });
});

process.on('unhandledRejection', reason => {
  console.error('[CYRNEX] unhandledRejection', reason);
  void writePlatformSystemLog({
    severity: 'critical',
    category: 'process_failure',
    source: 'node',
    message: 'Promise rejeitada sem tratamento no processo da API.',
    metadata: { reason: reason instanceof Error ? reason.message : String(reason) }
  });
});

process.on('uncaughtException', error => {
  console.error('[CYRNEX] uncaughtException', error);
  void writePlatformSystemLog({
    severity: 'critical',
    category: 'process_failure',
    source: 'node',
    message: 'Exceção não tratada derrubou o processo da API.',
    metadata: { errorName: error.name, message: error.message, stack: error.stack ?? null }
  }).finally(() => {
    server.close(() => process.exit(1));
    setTimeout(() => process.exit(1), 1200).unref();
  });
});


let shuttingDown = false;

function shutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[CYRNEX] ${signal} recebido; encerrando API com segurança.`);
  void writePlatformSystemLog({
    severity: 'info',
    category: 'lifecycle',
    source: 'api',
    message: 'CYRNEX FLOW API iniciando encerramento controlado.',
    metadata: { signal }
  }).finally(() => {
    server.close(error => {
      if (error) {
        console.error('[CYRNEX] Falha ao encerrar servidor HTTP.', error);
        process.exit(1);
      }
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 20_000).unref();
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
