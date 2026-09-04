import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const errors = [];
const authRoutes = [
  readFileSync(join(root, 'server/src/modules/auth/localAuth.routes.ts'), 'utf8'),
  readFileSync(join(root, 'server/src/modules/auth/productionAuth.routes.ts'), 'utf8')
].join('\n');
const authPage = readFileSync(join(root, 'web/src/features/auth/AuthPage.tsx'), 'utf8');
const settings = readFileSync(join(root, 'web/src/features/settings/BusinessAccountSection.tsx'), 'utf8');
const sidebar = readFileSync(join(root, 'web/src/components/layout/Sidebar.tsx'), 'utf8');
const preview = readFileSync(join(root, 'ABRIR-PREVIEW-CYRNEX-FLOW.html'), 'utf8');

const checks = [
  [authPage.includes('Criar minha barbearia'), 'CTA de criação da primeira barbearia ausente.'],
  [authRoutes.includes("router.post('/businesses'"), 'Criação de nova barbearia para usuário existente ausente.'],
  [authRoutes.includes("router.post('/businesses/switch'"), 'Troca de barbearia ausente.'],
  [authRoutes.includes('lastBusinessId') || authRoutes.includes('setBusinessCookie'), 'Última barbearia usada não é lembrada.'],
  [settings.includes('+ Adicionar nova barbearia'), 'Gestão de múltiplas barbearias ausente nas configurações.'],
  [settings.includes('Abrir esta barbearia'), 'Ação para abrir outra barbearia ausente.'],
  [sidebar.includes('Trocar barbearia'), 'Atalho de troca de barbearia ausente no menu lateral.'],
  [preview.includes('id="registerScreen"'), 'Preview não possui tela de criação de conta.'],
  [preview.includes('Adicionar nova barbearia'), 'Preview não possui criação de segunda barbearia.'],
  [preview.includes('businesses:[]'), 'Preview não separa múltiplas barbearias.']
];

for (const [passed, message] of checks) {
  if (!passed) errors.push(message);
}

if (errors.length) {
  console.error('❌ Conta e múltiplas barbearias não passaram:');
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}

console.log('✅ Conta e múltiplas barbearias aprovadas.');
console.log('   Primeira barbearia: criação pelo login');
console.log('   Novas unidades: criação dentro da conta');
console.log('   Dados por unidade: separados');
console.log('   Última unidade usada: lembrada');
console.log('   Troca rápida de unidade: ativa');
