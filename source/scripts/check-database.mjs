import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const MIGRATIONS_DIR = join(ROOT, 'supabase', 'migrations');
const MANIFEST_PATH = join(ROOT, 'docs', 'database', 'SCHEMA-MANIFEST.json');
const SECURITY_PATH = join(
  MIGRATIONS_DIR,
  '20260826001700_production_core.sql'
);

const MAX_SQL_LINE_LENGTH = 120;
const LINE_LENGTH_EXEMPT_FILES = new Set(['20260826001700_production_core.sql']);
const errors = [];

function stripSqlStringsAndComments(sql) {
  let output = '';
  let index = 0;
  let inSingleQuote = false;
  let inLineComment = false;
  let inDollarQuote = false;

  while (index < sql.length) {
    const char = sql[index];
    const next = sql[index + 1];

    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false;
        output += '\n';
      } else {
        output += ' ';
      }
      index += 1;
      continue;
    }

    if (inDollarQuote) {
      if (char === '$' && next === '$') {
        inDollarQuote = false;
        output += '  ';
        index += 2;
      } else {
        output += char === '\n' ? '\n' : ' ';
        index += 1;
      }
      continue;
    }

    if (inSingleQuote) {
      if (char === "'" && next === "'") {
        output += '  ';
        index += 2;
        continue;
      }

      if (char === "'") {
        inSingleQuote = false;
      }

      output += char === '\n' ? '\n' : ' ';
      index += 1;
      continue;
    }

    if (char === '-' && next === '-') {
      inLineComment = true;
      output += '  ';
      index += 2;
      continue;
    }

    if (char === '$' && next === '$') {
      inDollarQuote = true;
      output += '  ';
      index += 2;
      continue;
    }

    if (char === "'") {
      inSingleQuote = true;
      output += ' ';
      index += 1;
      continue;
    }

    output += char;
    index += 1;
  }

  return {
    sql: output,
    unterminatedSingleQuote: inSingleQuote,
    unterminatedDollarQuote: inDollarQuote
  };
}

function validateBalancedSql(file, sql) {
  const stripped = stripSqlStringsAndComments(sql);

  if (stripped.unterminatedSingleQuote) {
    errors.push(`${file}: aspas simples não foram fechadas.`);
  }

  if (stripped.unterminatedDollarQuote) {
    errors.push(`${file}: bloco $$ não foi fechado.`);
  }

  let depth = 0;
  for (const char of stripped.sql) {
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;

    if (depth < 0) {
      errors.push(`${file}: parêntese de fechamento sem abertura.`);
      return;
    }
  }

  if (depth !== 0) {
    errors.push(`${file}: parênteses desbalanceados (${depth}).`);
  }
}

function exists(path) {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

if (!exists(MIGRATIONS_DIR)) {
  errors.push('Pasta supabase/migrations ausente.');
}

if (!exists(MANIFEST_PATH)) {
  errors.push('Manifesto docs/database/SCHEMA-MANIFEST.json ausente.');
}

if (errors.length > 0) {
  console.error('\n❌ Banco não passou na validação:\n');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
const expectedTables = Object.values(manifest.modules).flat();
const migrationFiles = readdirSync(MIGRATIONS_DIR)
  .filter((file) => file.endsWith('.sql'))
  .sort();

if (migrationFiles.length === 0) {
  errors.push('Nenhuma migration SQL encontrada.');
}

const migrationNamePattern = /^\d{14}_[a-z0-9_]+\.sql$/;
for (const file of migrationFiles) {
  if (!migrationNamePattern.test(file)) {
    errors.push(`Nome de migration fora do padrão: ${file}`);
  }
}

const combinedSql = migrationFiles
  .map((file) => readFileSync(join(MIGRATIONS_DIR, file), 'utf8'))
  .join('\n');


for (const file of migrationFiles) {
  validateBalancedSql(file, readFileSync(join(MIGRATIONS_DIR, file), 'utf8'));
}

for (const reference of combinedSql.matchAll(/references\s+public\.([a-z0-9_]+)/gi)) {
  const table = reference[1];
  const createPosition = combinedSql.search(
    new RegExp(`create\\s+table\\s+public\\.${table}\\b`, 'i')
  );

  if (createPosition === -1) {
    errors.push(`FK referencia tabela pública inexistente: ${table}`);
    continue;
  }

  if (createPosition > reference.index) {
    errors.push(`FK referencia ${table} antes da criação da tabela.`);
  }
}

for (const view of manifest.views) {
  const viewPattern = new RegExp(
    `create\\s+or\\s+replace\\s+view\\s+public\\.${view}` +
      `[\\s\\S]{0,120}?security_invoker\\s*=\\s*true`,
    'i'
  );

  if (!viewPattern.test(combinedSql)) {
    errors.push(`View sem security_invoker=true ou ausente: ${view}`);
  }
}

const createdTables = [
  ...combinedSql.matchAll(/create\s+table\s+public\.([a-z0-9_]+)/gi)
].map((match) => match[1]);

const duplicateTables = createdTables.filter(
  (table, index) => createdTables.indexOf(table) !== index
);

for (const table of new Set(duplicateTables)) {
  errors.push(`Tabela criada mais de uma vez: ${table}`);
}

for (const table of expectedTables) {
  if (!createdTables.includes(table)) {
    errors.push(`Tabela do manifesto não foi criada: ${table}`);
  }
}

for (const table of createdTables) {
  if (!expectedTables.includes(table)) {
    errors.push(`Tabela criada mas ausente do manifesto: ${table}`);
  }
}

const tenantExceptions = new Set(['businesses', 'user_profiles']);
for (const table of createdTables) {
  if (tenantExceptions.has(table)) {
    continue;
  }

  const tableRegex = new RegExp(
    `create\\s+table\\s+public\\.${table}\\s*\\(([\\s\\S]*?)\\n\\);`,
    'i'
  );
  const match = combinedSql.match(tableRegex);

  if (!match || !/\bbusiness_id\b/i.test(match[1])) {
    errors.push(`Tabela multiempresa sem business_id: ${table}`);
  }
}

const forbiddenNumericTypes = [
  /\b(real|float4|float8|double\s+precision)\b/gi,
  /\bmoney\b/gi
];

const numericTypeSql = stripSqlStringsAndComments(combinedSql).sql;
for (const pattern of forbiddenNumericTypes) {
  if (pattern.test(numericTypeSql)) {
    errors.push(
      'Tipo numérico proibido encontrado. Dinheiro deve usar NUMERIC/DECIMAL.'
    );
  }
}

if (!/appointments_no_professional_overlap/i.test(combinedSql)) {
  errors.push('Constraint de conflito de agenda não encontrada.');
}

if (!/clients_business_phone_unique_idx/i.test(combinedSql)) {
  errors.push('Índice UNIQUE de telefone normalizado por empresa ausente.');
}

if (!/foreign key \(business_id,/i.test(combinedSql)) {
  errors.push('Nenhuma FK composta multiempresa foi encontrada.');
}

const unsafeCompositeSetNull = /foreign key \(business_id, ([a-z0-9_]+)\)[\s\S]{0,180}?on delete set null(?! \()/gi;
if (unsafeCompositeSetNull.test(combinedSql)) {
  errors.push(
    'FK composta usa ON DELETE SET NULL sem limitar a coluna filha; isso pode anular business_id.'
  );
}

const securitySql = exists(SECURITY_PATH)
  ? readFileSync(SECURITY_PATH, 'utf8')
  : '';
const securityCoverageSql = combinedSql;

if (!securitySql) {
  errors.push('Migration de RLS ausente.');
} else {
  for (const table of expectedTables) {
    if (!securityCoverageSql.includes(table)) {
      errors.push(`Tabela não aparece na configuração de RLS: ${table}`);
    }
  }

  if (!/revoke all on all tables in schema public from anon/i.test(securitySql)) {
    errors.push('Revogação explícita de acesso anon não encontrada.');
  }
}

for (const file of migrationFiles) {
  if (LINE_LENGTH_EXEMPT_FILES.has(file)) continue;
  const lines = readFileSync(join(MIGRATIONS_DIR, file), 'utf8').split(/\r?\n/);

  lines.forEach((line, index) => {
    if (line.length > MAX_SQL_LINE_LENGTH) {
      errors.push(
        `${file}:${index + 1}: ${line.length} caracteres ` +
          `(máximo ${MAX_SQL_LINE_LENGTH})`
      );
    }
  });
}

if (!exists(join(ROOT, 'supabase', 'seed.sql'))) {
  errors.push('supabase/seed.sql ausente.');
}

if (!exists(join(ROOT, 'supabase', 'config.toml'))) {
  errors.push('supabase/config.toml ausente.');
}

if (errors.length > 0) {
  console.error('\n❌ Banco não passou nos padrões do projeto:\n');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('✅ Banco aprovado.');
console.log(`   Migrations: ${migrationFiles.length}`);
console.log(`   Tabelas: ${createdTables.length}`);
console.log(`   Views documentadas: ${manifest.views.length}`);
console.log(`   Funções documentadas: ${manifest.functions.length}`);
console.log(`   Máximo por linha SQL: ${MAX_SQL_LINE_LENGTH} caracteres`);
