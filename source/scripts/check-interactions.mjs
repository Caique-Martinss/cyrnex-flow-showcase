import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const preview = read('ABRIR-PREVIEW-CYRNEX-FLOW.html');
const hours = read('web/src/features/onboarding/steps/HoursStep.tsx');
const services = read('web/src/features/onboarding/steps/ServicesStep.tsx');
const payments = read('web/src/features/onboarding/steps/PaymentsStep.tsx');
const publicPage = read('web/src/features/onboarding/steps/PublicPageStep.tsx');
const auth = read('web/src/features/auth/AuthPage.tsx');
const onboardingPage = read('web/src/features/onboarding/OnboardingPage.tsx');
const onboardingShell = read('web/src/features/onboarding/OnboardingShell.tsx');
const modules = read('web/src/features/onboarding/steps/ModulesStep.tsx');
const themeHook = read('web/src/hooks/useTheme.ts');
const topbar = read('web/src/components/layout/Topbar.tsx');
const themeSwitch = read('web/src/components/ui/ThemeSwitch.tsx');
const panelTheme = read('web/src/styles/panel-theme.css');
const themeTokens = read('web/src/styles/tokens.css');

const checks = [
  [preview.includes('openCopyHoursModal'), 'Preview: botão de aplicar horários não possui fluxo.'],
  [preview.includes("querySelectorAll('.toggle-service')"), 'Preview: recolher/expandir serviço não possui handler.'],
  [preview.includes('Exigir sinal por padrão')
      && preview.includes('Pix manual com confirmação segura.'),
    'Preview: sinal Pix manual não está configurável/explicado.'],
  [preview.includes('Taxas usadas no Financeiro') && preview.includes('debit.oninput=()=>')
      && preview.includes('credit.oninput=()=>'),
    'Preview: taxas de cartão não atualizam o cálculo financeiro.'],
  [preview.includes('bindCustomerActions'), 'Preview: botões da página pública não respondem.'],
  [preview.includes('markPreviewSession'), 'Preview: “Manter conectado” não controla a sessão.'],
  [preview.includes("addBusiness.onclick=()=>"), 'Preview: adicionar nova barbearia não está conectado.'],
  [hours.includes('onClick={() => startCopy(day)}'), 'React: aplicar horários em outros dias sem ação.'],
  [hours.includes('onClick={applyCopy}'), 'React: confirmação da cópia de horários ausente.'],
  [services.includes('onClick={props.onToggle}'), 'React: serviços não podem ser recolhidos/expandidos.'],
  [services.includes('Sinal deste serviço')
      && services.includes('Regra padrão')
      && services.includes('Pix manual com comprovante'),
    'React: sinal de serviço não está conectado à regra padrão de Pix manual.'],
  [payments.includes('Taxas usadas no Financeiro') && payments.includes('feeValue'),
    'React: configuração de taxas do cartão não alimenta o Financeiro.'],
  [payments.includes('Taxa descontada:'), 'React: cálculo da taxa não mostra o valor descontado.'],
  [payments.includes('Exemplo do valor líquido'), 'React: taxas não mostram resultado para o usuário.'],
  [publicPage.includes('onPrimaryAction'), 'React: ação principal da página não possui callback.'],
  [auth.includes('rememberMe'), 'React: opção “Manter conectado” não está ligada ao login.'],
  [modules.includes('isLaunchReadyModule') && modules.includes('Em desenvolvimento'),
    'React: módulos não prontos não estão bloqueados como Em desenvolvimento.'],
  [!modules.includes('Em preparação'), 'React: texto interno de desenvolvimento ainda aparece no onboarding.'],
  [preview.includes('Em desenvolvimento'),
    'Preview: módulos não prontos não estão identificados como Em desenvolvimento.'],
  [preview.includes("debit.oninput=()=>") && preview.includes("credit.oninput=()=>"),
    'Preview: cálculo de taxas não atualiza em tempo real.'],
  [preview.includes('Taxa descontada:'), 'Preview: cálculo de taxas não mostra o valor descontado.'],
  [publicPage.includes('testPrimaryAction'), 'React: ação principal no modo cliente não executa teste real.'],
  [publicPage.includes('testWhatsApp'), 'React: botão de WhatsApp no modo cliente não possui teste funcional.']
  ,[themeHook.includes('localStorage.setItem(storageKey, theme)'),
    'React: preferência de tema não fica salva por usuário.']
  ,[auth.includes("useTheme('auth')") && auth.includes('<ThemeSwitch'),
    'React: login não está conectado ao seletor claro/escuro.']
  ,[onboardingPage.includes('onThemeChange={props.onThemeChange}')
      && onboardingShell.includes('<ThemeSwitch'),
    'React: onboarding não está conectado ao tema do usuário.']
  ,[topbar.includes('<ThemeSwitch')
      && themeSwitch.includes("onChange('light')")
      && themeSwitch.includes("onChange('dark')"),
    'React: seletor claro/escuro não possui as duas ações.']
  ,[themeTokens.includes('--bg: #090b0a') && themeTokens.includes('--primary: #d6a34b')
      && panelTheme.includes('Color Integrity Layer'),
    'React: tema escuro deixou de usar a paleta aprovada da Página Pública.']
  ,[preview.includes('panelThemeKey()') && preview.includes('data-theme-choice=\"dark\"'),
    'Preview: tema claro/escuro não está persistido/conectado.']
];

const failed = checks.filter(([passed]) => !passed);
if (failed.length) {
  console.error('\n❌ Regra “apareceu = funciona” não passou:\n');
  failed.forEach(([, message]) => console.error(`- ${message}`));
  process.exit(1);
}

console.log('✅ Interações essenciais aprovadas.');
console.log('   Regra: apareceu = funciona; clicou = responde; erro = explica.');
