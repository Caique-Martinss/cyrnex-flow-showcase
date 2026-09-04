import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const index = read('web/src/styles/index.css');
const mobile = read('web/src/styles/mobile-first-v1163.css');
const sidebar = read('web/src/components/layout/Sidebar.tsx');
const onboarding = read('web/src/features/onboarding/OnboardingShell.tsx');
const preview = read('ABRIR-PREVIEW-CYRNEX-FLOW.html');

const checks = [
  [index.trim().endsWith("@import './mobile-first-v1163.css';"),
    'Camada mobile V11.6.3 não é carregada por último.'],
  [sidebar.includes('mobile-bottom-nav') && sidebar.includes("label: 'Agenda'")
    && sidebar.includes("label: 'Financeiro'") && sidebar.includes("label: 'Mais'"),
    'Painel não possui navegação inferior mobile dedicada.'],
  [sidebar.includes('mobile-more-sheet') && sidebar.includes('Link do cliente')
    && sidebar.includes('Configurações') && sidebar.includes('Em desenvolvimento'),
    'Menu Mais no celular não concentra opções secundárias e roadmap.'],
  [mobile.includes('env(safe-area-inset-bottom)') && mobile.includes('100dvh'),
    'Safe area/iPhone ou viewport dinâmica não estão protegidos.'],
  [mobile.includes("font-size: 16px !important") && mobile.includes('.icon-button')
    && mobile.includes('min-height: 44px !important'),
    'Inputs/touch targets não têm proteção mobile contra zoom e alvos pequenos.'],
  [mobile.includes('.agenda-week-grid') && mobile.includes('grid-template-columns: 1fr !important')
    && mobile.includes('.agenda-month-grid')
    && mobile.includes('repeat(7, minmax(0, 1fr)) !important'),
    'Agenda Semana/Mês ainda depende de rolagem horizontal no celular.'],
  [mobile.includes('.modal-header') && mobile.includes('position: sticky')
    && mobile.includes('.modal .modal-actions'),
    'Modais mobile não mantêm contexto e ações acessíveis.'],
  [onboarding.includes('onboarding-mobile-current')
    && mobile.includes('.onboarding-mobile-current')
    && mobile.includes('.premium-onboarding-shell .onboarding-sidebar'),
    'Onboarding não mostra etapa/progresso de forma apropriada no celular.'],
  [mobile.includes('.client-row-actions') && mobile.includes('.finance-v116-filter-popover')
    && mobile.includes('.manual-pix-card'),
    'Clientes, Financeiro ou Pix não receberam acabamento mobile final.'],
  [preview.includes('V11.6.3 MOBILE FIRST'),
    'Preview standalone não está marcado/sincronizado com a rodada mobile V11.6.3.']
];

const failed = checks.filter(([passed]) => !passed);
if (failed.length) {
  console.error('\n❌ Mobile readiness V11.6.3 não passou:\n');
  failed.forEach(([, message]) => console.error(`- ${message}`));
  process.exit(1);
}

console.log('✅ Mobile readiness V11.6.3 aprovado no código estático.');
console.log('   Navegação inferior, safe areas, touch targets, Agenda, modais, onboarding e fluxos públicos protegidos.');
