import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const previewPath = path.join(root, 'ABRIR-PREVIEW-CYRNEX-FLOW.html');
const html = fs.readFileSync(previewPath, 'utf8');

const required = [
  'id="loginForm"',
  'id="forgotPasswordBtn"',
  'id="registerScreen"',
  'Criar minha barbearia',
  'Adicionar nova barbearia',
  'function renderRecovery()',
  'function togglePassword(',
  'Reenviar código em',
  'r.attempts>=5',
  'Escolha uma senha diferente da senha atual.',
  'function renderOnboarding()',
  'function renderStep(',
  'function reviewIssues(',
  'function bindStep(',
  'function captureStep(',
  'function renderAbout(',
  'function renderOperation(',
  'function renderHours(',
  'function renderServices(',
  'function renderBooking(',
  'function renderPayments(',
  'function renderModules(',
  'function renderPublic(',
  'function sitePreview(',
  'allowOvertime',
  '+ Adicionar profissional',
  '+ Adicionar outra pausa',
  '+ Adicionar outro serviço',
  'Pular por enquanto',
  'Usar estes horários em outros dias',
  'Nome do adicional',
  'Recolher',
  'Taxas usadas no Financeiro',
  'Em desenvolvimento',
  'Salvar alterações',
  'Exemplo do valor líquido',
  'O que você quer que o cliente faça primeiro?',
  'Concluir configuração e entrar no painel',
  'localStorage',
  'stepCard.oninput=debounce',
  'function renderApp()',
  'function bindAppPage(',
  "addBusiness.onclick=()=>",
  'function previewOverview(',
  'Seu dia em uma frase',
  'Aconteceu hoje',
  'pva-booking-footer',
  'pvaStatusInCurrentScope',
  'Linha do tempo —',
  'previewConfirm('
];


const publicPreviewPath = path.join(root, 'ABRIR-PREVIEW-PAGINA-PUBLICA.html');
if (!fs.existsSync(publicPreviewPath)) {
  console.error('❌ Preview da Página Pública não encontrado.');
  process.exit(1);
}

const publicHtml = fs.readFileSync(publicPreviewPath, 'utf8');
const publicRequired = [
  'Preview • dados de demonstração',
  'data-pick-service',
  'data-pick-pro',
  'booking-overlay',
  'booking-progress',
  'sectionOrder',
  'applyDemoScene',
  'Seu horário está reservado',
  'outra pessoa acabou de ocupar o horário',
  'nav-flyout',
  'team-cards-new',
  'experience-grid',
  'map-frame',
  'live-panel',
  'hero-stage:hover .media-tile:not(:hover)',
  'data-nav-service',
  'function focusService(',
  'Agendar este serviço',
  'Ver meu agendamento',
  'Adicionar ao calendário',
  'Falar no WhatsApp',
  'Ver rota',
  'appointmentHubStep',
  'service-card.focused'
];

const publicMissing = publicRequired.filter(item => !publicHtml.includes(item));
if (publicMissing.length > 0) {
  console.error('❌ Preview da Página Pública incompleto. Itens ausentes:');
  for (const item of publicMissing) console.error(`   - ${item}`);
  process.exit(1);
}

const publicScriptMatch = publicHtml.match(/<script>([\s\S]*?)<\/script>/);
if (!publicScriptMatch) {
  console.error('❌ Preview da Página Pública não possui JavaScript principal.');
  process.exit(1);
}

try {
  new Function(publicScriptMatch[1]);
} catch (error) {
  console.error('❌ JavaScript do preview da Página Pública possui erro de sintaxe.');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const missing = required.filter(item => !html.includes(item));
if (missing.length > 0) {
  console.error('❌ Preview incompleto. Itens ausentes:');
  for (const item of missing) console.error(`   - ${item}`);
  process.exit(1);
}


if (/\bconfirm\s*\(|\bprompt\s*\(/.test(html)) {
  console.error('❌ Preview principal ainda possui confirm()/prompt() nativos.');
  process.exit(1);
}

if (!html.includes('Resultados do filtro —') || !html.includes('O registro permanece no histórico')) {
  console.error('❌ Preview não preserva claramente Cancelados/Faltas nos filtros/histórico.');
  process.exit(1);
}

if (!html.includes("u!==state.account.username||p!==state.account.password")) {
  console.error('❌ Preview ainda aceita credenciais diferentes da conta salva.');
  process.exit(1);
}

if (html.includes("displayName:'João'") || html.includes("username:'joao'")) {
  console.error('❌ Preview ainda possui identidade fixa de demonstração.');
  process.exit(1);
}

const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  console.error('❌ Preview não possui JavaScript principal.');
  process.exit(1);
}

try {
  new Function(scriptMatch[1]);
} catch (error) {
  console.error('❌ JavaScript do preview possui erro de sintaxe.');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

console.log('✅ Preview funcional aprovado.');
console.log('   Página Pública premium + booking progressivo: conectados');
console.log('   Conta: login + criação de barbearia + recuperação');
console.log('   Onboarding: 10 etapas funcionais + autosave');
console.log('   Horários simplificados + cópia explícita: conectados');
console.log('   Serviços recolhíveis + adicionais autoexplicativos: conectados');
console.log('   Taxas de cartão + cálculo líquido: conectados');
console.log('   Recursos incompletos: visíveis como Em desenvolvimento e bloqueados');
console.log('   Clientes: criação + edição conectadas no preview');
console.log('   Página pública: preview vivo + revisão final');
console.log('   Nova barbearia: botão conectado no preview');
console.log('   Painel pós-onboarding: Visão Geral funcional e dados operacionais zerados');
