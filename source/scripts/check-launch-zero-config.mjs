import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const mustExist = [
  'render.yaml',
  '.env.production.template',
  'docs/GO-LIVE-SEM-CONFIGURAR.md',
  'docs/PRODUCTION-ENV-MATRIX.md',
  'docs/DOMINIO-E-DNS.md',
  'docs/MONITORAMENTO-UPTIME.md',
  'docs/EMAIL-PRODUCAO.md',
  'docs/RESPOSTA-A-INCIDENTES.md',
  'server/src/modules/health/runtimeHealth.ts'
];
const problems = [];
for (const file of mustExist) {
  if (!fs.existsSync(path.join(root, file))) problems.push(`Arquivo ausente: ${file}`);
}
const render = fs.readFileSync(path.join(root, 'render.yaml'), 'utf8');
for (const token of ['cyrnex-flow-api', 'cyrnex-flow-web', 'healthCheckPath: /api/health', 'sync: false']) {
  if (!render.includes(token)) problems.push(`render.yaml sem: ${token}`);
}
const app = fs.readFileSync(path.join(root, 'server/src/app.ts'), 'utf8');
if (!app.includes("app.get('/api/ready'")) problems.push('Endpoint /api/ready ausente.');
const index = fs.readFileSync(path.join(root, 'server/src/index.ts'), 'utf8');
if (!index.includes("process.on('SIGTERM'")) problems.push('Graceful shutdown SIGTERM ausente.');
if (problems.length) {
  console.error('CYRNEX launch zero-config: FALHOU');
  problems.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}
console.log('CYRNEX launch zero-config: OK');
