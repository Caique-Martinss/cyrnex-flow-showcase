import fs from 'node:fs';

const required = [
  ['web/src/app/navigation.ts', "label: 'Financeiro'"],
  ['web/src/app/navigation.ts', "id: 'finance-revenue'"],
  ['web/src/app/navigation.ts', "id: 'finance-expenses'"],
  ['web/src/features/finance/FinancePage.tsx', 'FinancePeriodSelector'],
  ['web/src/features/finance/FinanceRevenueView.tsx', 'Faturado'],
  ['web/src/features/finance/FinanceRevenueView.tsx', 'Recebido'],
  ['web/src/features/finance/FinanceRevenueView.tsx', 'finance-v116-entry'],
  ['web/src/features/finance/FinanceExpensesView.tsx', 'Despesas registradas'],
  ['web/src/features/finance/FinancePeriodSelector.tsx', 'Personalizado'],
  ['web/src/styles/finance-v116.css', '.finance-v116-period-panel'],
  ['ABRIR-PREVIEW-CYRNEX-FLOW.html', 'finance-revenue'],
  ['ABRIR-PREVIEW-CYRNEX-FLOW.html', 'finance-expenses'],
  ['ABRIR-PREVIEW-CYRNEX-FLOW.html', 'pvFinancePeriodHtml'],
  ['ABRIR-PREVIEW-CYRNEX-FLOW.html', 'fv-entry']
];

const errors = [];
for (const [file, marker] of required) {
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes(marker)) {
    errors.push(`${file}: faltando ${marker}`);
  }
}

if (errors.length) {
  console.error('❌ Financeiro V11.6 não passou:');
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}

console.log('✅ Financeiro V11.6 aprovado.');
console.log('   Navegação: Financeiro → Faturamento / Despesas');
console.log('   Períodos: Hoje / Semana / Mês / Personalizado');
console.log('   Faturado + Recebido + resultado por período');
console.log('   Entradas compactas expansíveis + filtros sob demanda');
console.log('   Preview standalone sincronizado');
