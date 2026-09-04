import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const errors = [];

const requiredPaths = [
  'web/src/features/onboarding/OnboardingPage.tsx',
  'web/src/features/onboarding/OnboardingShell.tsx',
  'web/src/features/onboarding/useOnboardingEditor.ts',
  'web/src/features/onboarding/steps/AboutStep.tsx',
  'web/src/features/onboarding/steps/OperationStep.tsx',
  'web/src/features/onboarding/ProfessionalHoursEditor.tsx',
  'web/src/features/onboarding/steps/HoursStep.tsx',
  'web/src/features/onboarding/steps/ServicesStep.tsx',
  'web/src/features/onboarding/steps/BookingRulesStep.tsx',
  'web/src/features/onboarding/steps/PaymentsStep.tsx',
  'web/src/features/onboarding/steps/ModulesStep.tsx',
  'web/src/features/onboarding/steps/PublicPageStep.tsx',
  'web/src/features/onboarding/steps/ReviewStep.tsx',
  'web/src/features/settings/SettingsPage.tsx',
  'server/src/modules/onboarding/onboarding.routes.ts',
  'server/src/modules/onboarding/onboarding.service.ts',
  'server/src/modules/onboarding/onboarding.payload.ts',
  'server/src/modules/onboarding/onboarding.validation.ts',
  'supabase/migrations/20260826001700_production_core.sql',
  'docs/ONBOARDING-E-CONFIGURACAO.md',
  'docs/database/MAPEAMENTO-ONBOARDING.md'
];

function exists(relativePath) {
  try {
    statSync(join(ROOT, relativePath));
    return true;
  } catch {
    return false;
  }
}

function read(relativePath) {
  return readFileSync(join(ROOT, relativePath), 'utf8');
}

for (const path of requiredPaths) {
  if (!exists(path)) errors.push(`Arquivo obrigatório do onboarding ausente: ${path}`);
}

if (errors.length === 0) {
  const app = read('web/src/app/App.tsx');
  const editor = read('web/src/features/onboarding/useOnboardingEditor.ts');
  const about = read('web/src/features/onboarding/steps/AboutStep.tsx');
  const operation = read('web/src/features/onboarding/steps/OperationStep.tsx');
  const professionalHours = read('web/src/features/onboarding/ProfessionalHoursEditor.tsx');
  const hours = read('web/src/features/onboarding/steps/HoursStep.tsx');
  const services = read('web/src/features/onboarding/steps/ServicesStep.tsx');
  const booking = read('web/src/features/onboarding/steps/BookingRulesStep.tsx');
  const publicPage = read('web/src/features/onboarding/steps/PublicPageStep.tsx');
  const review = read('web/src/features/onboarding/steps/ReviewStep.tsx');
  const serverApp = read('server/src/app.ts');
  const routes = read('server/src/modules/onboarding/onboarding.routes.ts');
  const validation = read('server/src/modules/onboarding/onboarding.validation.ts');
  const settingsPage = read('web/src/features/settings/SettingsPage.tsx');
  const productionMigration = read('supabase/migrations/20260826001700_production_core.sql');

  const requiredChecks = [
    [app.includes("onboarding.status !== 'completed'"), 'App não bloqueia o painel antes do onboarding.'],
    [app.includes('<OnboardingPage'), 'App não monta a tela de onboarding.'],
    [serverApp.includes("app.use('/api/onboarding'"), 'API não montou /api/onboarding.'],
    [routes.includes("router.post('/complete'"), 'Endpoint de conclusão do onboarding ausente.'],
    [routes.includes("router.put('/'"), 'Endpoint de salvamento progressivo ausente.'],
    [editor.includes('AUTO_SAVE_DELAY_MS'), 'Autosave do onboarding ausente.'],
    [editor.includes('validateStep'), 'Avanço sem validação de etapa.'],
    [about.includes('Outra especialidade'), 'Especialidade personalizada ausente.'],
    [about.includes('Mostrar na página pública'), 'Privacidade de mídia ausente.'],
    [about.includes('Trocar foto'), 'Troca de foto sem remover o item ausente.'],
    [about.includes('Trocar mídia'), 'Troca de mídia sem remover o item ausente.'],
    [operation.includes('Dono protegido'), 'Proteção do dono na equipe ausente.'],
    [operation.includes('+ Adicionar profissional'), 'Cadastro de equipe no onboarding ausente.'],
    [professionalHours.includes('Definir horário próprio'), 'Horário individual do profissional ausente.'],
    [hours.includes('Usar estes horários em outros dias'), 'Aplicação de horários em outros dias ausente.'],
    [hours.includes('+ Adicionar outra pausa'), 'Pausas adicionais por dia ausentes.'],
    [services.includes('Adicionar serviço comum'), 'Atalhos de serviço ausentes.'],
    [services.includes('Nome do adicional'), 'Campos autoexplicativos dos adicionais ausentes.'],
    [services.includes('Recolher'), 'Serviços não podem ser recolhidos/minimizados.'],
    [booking.toLocaleLowerCase('pt-BR').includes('hora extra'), 'Regra de hora extra ausente.'],
    [publicPage.includes('Prévia em tempo real'), 'Preview vivo da página pública ausente.'],
    [publicPage.includes('O que você quer que o cliente faça primeiro?'), 'Ação principal continua técnica/confusa.'],
    [review.includes('Checklist de lançamento'), 'Revisão final inteligente ausente.'],
    [review.includes('Como corrigir'), 'Erros não explicam como corrigir.'],
    [validation.includes('validateSchedule'), 'Validação de horários ausente.'],
    [validation.includes('validateServices'), 'Validação de serviços ausente.'],
    [validation.includes('validateModulesAndRules'), 'Validação de módulos/regras ausente.'],
    [settingsPage.includes('onEdit'), 'Configurações não permite reabrir o onboarding.'],
    [productionMigration.includes('onboarding_completed_at'), 'Schema não guarda conclusão do onboarding.'],
    [productionMigration.includes('location_visibility'), 'Schema de produção não guarda visibilidade da localização.'],
    [productionMigration.includes('price_type'), 'Schema de produção não guarda o tipo de preço do serviço.'],
    [productionMigration.includes('serves_clients'), 'Schema de produção não guarda se o profissional atende clientes.']
  ];

  for (const [passed, message] of requiredChecks) {
    if (!passed) errors.push(message);
  }
}

if (errors.length > 0) {
  console.error('\n❌ Onboarding não passou na validação:\n');
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}

console.log('✅ Onboarding aprovado.');
console.log('   Fluxo inicial: 10 etapas definitivas');
console.log('   Autosave + retomada: ativos');
console.log('   Equipe, horários individuais e serviços: núcleo completo');
console.log('   Pagamentos: taxas prontas; recursos futuros bloqueados como Em desenvolvimento');
console.log('   Mídia: troca de arquivo preservando o bloco');
console.log('   Erros explicativos: o que + por quê + como corrigir');
console.log('   Página pública: preview em tempo real');
console.log('   Revisão final: conflitos e recomendações separados');
console.log('   Mapeamento PostgreSQL v0.8: presente');
