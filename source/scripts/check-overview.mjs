import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const page = read('web/src/features/overview/OverviewPage.tsx');
const helpers = read('web/src/features/overview/overview.helpers.ts');
const ui = read('web/src/features/overview/OverviewUi.tsx');
const preview = read('ABRIR-PREVIEW-CYRNEX-FLOW.html');

const checks = [
  [page.includes('Próximo atendimento') && page.includes('Atendimento atual'), 'React: card de atendimento atual/próximo ausente.'],
  [page.includes('Horários livres') && helpers.includes('buildFreeStarts'), 'React: disponibilidade real do dia ausente.'],
  [page.includes('Ocupação da agenda') && page.includes('occupancy-ring'), 'React: indicador de ocupação ausente.'],
  [page.includes('Agenda rápida') && page.includes('timeline-item'), 'React: linha do tempo do dia ausente.'],
  [page.includes('Precisa da sua atenção'), 'React: alertas operacionais ausentes.'],
  [page.includes('Resumo de hoje') && page.includes('FinanceLine'), 'React: resumo financeiro do dia ausente.'],
  [page.includes('Horários mais ocupados hoje'), 'React: visualização de movimento do dia ausente.'],
  [page.includes('Seu dia em uma frase'), 'React: resumo inteligente ausente.'],
  [ui.includes('Aconteceu hoje') && ui.includes('buildActivityItems'), 'React: histórico rápido do dia ausente.'],
  [page.includes("session.role === 'owner' || session.role === 'manager'"), 'React: proteção de faturamento por papel ausente.'],
  [page.includes('onNewAppointmentAt') && page.includes('onNewClient') && page.includes('onNewExpense'), 'React: ações rápidas incompletas.'],
  [preview.includes('function previewOverview('), 'Preview: Visão Geral nova não foi incorporada.'],
  [preview.includes('openPreviewAppointmentModal') && preview.includes('openPreviewClientModal'), 'Preview: ações rápidas não possuem fluxo.'],
  [preview.includes('ov-free-slot') && preview.includes('previewFreeStarts'), 'Preview: horários livres não são interativos.'],
  [preview.includes('ov-complete') && preview.includes("a.status='completed'"), 'Preview: concluir atendimento não possui ação.'],
  [preview.includes('Seu dia em uma frase') && preview.includes('Aconteceu hoje'), 'Preview: blocos de resumo/histórico ausentes.']
];

const failed = checks.filter(([passed]) => !passed);
if (failed.length) {
  console.error('\n❌ Visão Geral incompleta:\n');
  failed.forEach(([, message]) => console.error(`- ${message}`));
  process.exit(1);
}

console.log('✅ Visão Geral aprovada.');
console.log('   Agora → Hoje → contexto complementar, com ações reais e dados adaptativos.');
