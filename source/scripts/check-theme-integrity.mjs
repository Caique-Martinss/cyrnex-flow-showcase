import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const tokens = read('web/src/styles/tokens.css');
const panelTheme = read('web/src/styles/panel-theme.css');
const onboarding = read('web/src/styles/onboarding.css');
const preview = read('ABRIR-PREVIEW-CYRNEX-FLOW.html');
const finalTheme = read('web/src/styles/theme-integrity-v115.css');

const checks = [
  [tokens.includes('--bg: #090b0a') && tokens.includes('--surface: #121512'),
    'Tema escuro não usa a base preto/carvão oficial.'],
  [tokens.includes('--primary: #d6a34b') && tokens.includes('--text: #f5f3ed'),
    'Tema escuro não usa dourado/texto da Página Pública.'],
  [tokens.includes('--success-soft:') && tokens.includes('--warning-soft:')
      && tokens.includes('--danger-soft:'),
    'Tokens semânticos de sucesso/aviso/erro estão incompletos.'],
  [panelTheme.includes('V11.4 — Color Integrity Layer'),
    'Camada global de integridade de cores do painel foi removida.'],
  [panelTheme.includes('.customer-page-preview.light') && panelTheme.includes('.customer-page-preview.auto'),
    'Prévia da Página Pública perdeu o tratamento explícito light/auto/dark.'],
  [onboarding.includes('background: var(--success-soft);')
      && onboarding.includes('border: 1px solid var(--success-border);'),
    'Badges do onboarding voltaram a usar cores fixas legadas.'],
  [preview.includes('V11.4 UI — INTEGRIDADE GLOBAL DE CORES DO PREVIEW')
      && preview.includes('--theme-bg:#090b0a')
      && preview.includes('--theme-gold:#d6a34b'),
    'Preview standalone não está sincronizado com a correção global de cores.'],
];

const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  console.error('\n❌ Integridade visual/temas não passou:\n');
  failed.forEach(([, message]) => console.error(`- ${message}`));
  process.exit(1);
}

console.log('✅ Integridade global de cores aprovada.');
console.log('   Claro: paleta administrativa premium.');
console.log('   Escuro: preto/carvão + dourado da Página Pública.');
console.log('   Estados: sucesso/aviso/erro usam tokens semânticos.');


// V11.4.1_COLOR_GUARDS
const focusedChecks = [
  [preview.includes('.app.theme-dark .pva-rules>div'), 'Agenda preview sem proteção de superfícies escuras.'],
  [preview.includes('.app .pm-ring{background:radial-gradient(circle,var(--theme-surface)'), 'Financeiro preview sem anel temático.'],
  [preview.includes("previewDark=p.theme==='dark'||(p.theme==='auto'&&readPanelTheme()==='dark')"), 'Prévia pública auto não acompanha o tema.'],
  [panelTheme.includes('.customer-page-preview.auto'), 'Código real sem tratamento do tema auto da prévia pública.'],
];
const focusedFailed = focusedChecks.filter(([ok]) => !ok);
if (focusedFailed.length) {
  console.error('\n❌ Integridade visual V11.4.1 não passou:\n');
  focusedFailed.forEach(([, message]) => console.error(`- ${message}`));
  process.exit(1);
}
console.log('   Guardas V11.4.1: Agenda, Clientes, Financeiro e prévia pública aprovados.');


// V11.4.2_OVERVIEW_COLOR_GUARDS
const overviewChecks = [
  [preview.includes('.app .ov-ring{background:conic-gradient(var(--theme-gold)'), 'Visão Geral preview sem anel temático.'],
  [preview.includes('.app .ov-summary strong{color:var(--theme-text)'), 'Resumo inteligente do preview voltou a usar texto fixo.'],
  [preview.includes('.app .ov-first{background:var(--theme-soft)'), 'CTA inicial da Visão Geral voltou a usar fundo claro fixo.'],
  [panelTheme.includes("V11.4.2 UI — integridade final da Visão Geral"), 'Código real sem guarda final da Visão Geral no tema escuro.'],
];
const overviewFailed = overviewChecks.filter(([ok]) => !ok);
if (overviewFailed.length) {
  console.error('\n❌ Integridade visual V11.4.2 não passou:\n');
  overviewFailed.forEach(([, message]) => console.error(`- ${message}`));
  process.exit(1);
}
console.log('   Guardas V11.4.2: Visão Geral sem hardcodes claros no tema escuro.');

// V11.5_FULL_COLOR_SWEEP
const v115Checks = [
  [finalTheme.includes('V11.5 UI — varredura completa de integridade de tema'),
    'Folha final de integridade V11.5 foi removida.'],
  [finalTheme.includes('.professional-hours-row') && finalTheme.includes('.fee-example-grid > div'),
    'Onboarding perdeu proteção de horários profissionais/exemplos financeiros.'],
  [finalTheme.includes('.smart-calendar-grid button') && finalTheme.includes('.agenda-slot-button'),
    'Agenda perdeu proteção de calendário/horários no tema escuro.'],
  [finalTheme.includes('.occupancy-ring > div') && finalTheme.includes('.finance-margin-ring > div'),
    'Visão Geral/Financeiro perderam proteção de indicadores circulares.'],
  [preview.includes('V11.5 UI — VARREDURA COMPLETA DE CORES / PREVIEW STANDALONE'),
    'Preview standalone perdeu a camada final V11.5.'],
  [preview.includes('.preview-modal-overlay.theme-dark .pva-slot')
      && preview.includes('.premium-onboarding-preview.theme-dark .prof-hour-row')
      && preview.includes('.premium-onboarding-preview.theme-dark .fee-example>div'),
    'Preview standalone perdeu guardas de modal/onboarding V11.5.'],
];
const v115Failed = v115Checks.filter(([ok]) => !ok);
if (v115Failed.length) {
  console.error('\n❌ Integridade visual V11.5 não passou:\n');
  v115Failed.forEach(([, message]) => console.error(`- ${message}`));
  process.exit(1);
}
console.log('   Guardas V11.5: varredura global de Login, Onboarding, Painel, Agenda, Clientes e Financeiro aprovada.');

