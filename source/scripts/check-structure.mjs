import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const ROOT = process.cwd();
const SOURCE_ROOTS = ['web/src', 'server/src'];
const CODE_EXTENSIONS = new Set(['.ts', '.tsx']);
const MAX_LINES_PER_FILE = 450;
const MAX_LINE_LENGTH = 120;
const MAX_CSS_LINE_LENGTH = 160;

const requiredPaths = [
  'web/src/app/App.tsx',
  'web/src/features',
  'web/src/components',
  'web/src/services',
  'server/src/modules',
  'server/src/database',
  'web/src/features/onboarding',
  'web/src/features/settings',
  'server/src/modules/onboarding',
  'docs/ARQUITETURA.md',
  'docs/ONDE-ENCONTRAR-CADA-COISA.md',
  'docs/PADRAO-DE-CODIGO.md',
  'docs/ONBOARDING-E-CONFIGURACAO.md'
];

const forbiddenLegacyPaths = [
  'web/src/types.ts',
  'web/src/services/api.ts',
  'server/src/database.ts',
  'server/src/types.ts'
];

function pathExists(path) {
  try {
    statSync(join(ROOT, path));
    return true;
  } catch {
    return false;
  }
}

function collectFiles(directory) {
  const absoluteDirectory = join(ROOT, directory);
  const files = [];

  for (const entry of readdirSync(absoluteDirectory, { withFileTypes: true })) {
    const absolutePath = join(absoluteDirectory, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectFiles(relative(ROOT, absolutePath)));
      continue;
    }

    if (CODE_EXTENSIONS.has(extname(entry.name))) {
      files.push(relative(ROOT, absolutePath));
    }
  }

  return files;
}

const errors = [];

for (const requiredPath of requiredPaths) {
  if (!pathExists(requiredPath)) {
    errors.push(`Estrutura obrigatória ausente: ${requiredPath}`);
  }
}

for (const legacyPath of forbiddenLegacyPaths) {
  if (pathExists(legacyPath)) {
    errors.push(`Arquivo legado voltou para a estrutura: ${legacyPath}`);
  }
}

const codeFiles = SOURCE_ROOTS.flatMap(collectFiles);

for (const file of codeFiles) {
  const lines = readFileSync(join(ROOT, file), 'utf8').split(/\r?\n/);

  if (lines.length > MAX_LINES_PER_FILE) {
    errors.push(`${file}: ${lines.length} linhas (máximo ${MAX_LINES_PER_FILE})`);
  }

  lines.forEach((line, index) => {
    if (line.length > MAX_LINE_LENGTH) {
      errors.push(
        `${file}:${index + 1}: ${line.length} caracteres (máximo ${MAX_LINE_LENGTH})`
      );
    }
  });
}


const packageFiles = ['package.json', 'web/package.json', 'server/package.json'];
const packageVersions = packageFiles.map((file) => ({
  file,
  version: JSON.parse(readFileSync(join(ROOT, file), 'utf8')).version
}));
const expectedVersion = packageVersions[0].version;

for (const item of packageVersions) {
  if (item.version !== expectedVersion) {
    errors.push(
      `Versão inconsistente: ${item.file} está em ${item.version}; esperado ${expectedVersion}`
    );
  }
}

const cssDirectory = join(ROOT, 'web', 'src', 'styles');
const cssFiles = readdirSync(cssDirectory)
  .filter((file) => file.endsWith('.css'))
  .map((file) => join(cssDirectory, file));
const cssText = cssFiles.map((file) => readFileSync(file, 'utf8')).join('\n');
const cssDefinitions = new Set(
  [...cssText.matchAll(/(--[a-zA-Z0-9_-]+)\s*:/g)].map((match) => match[1])
);
const cssReferences = new Set(
  [...cssText.matchAll(/var\((--[a-zA-Z0-9_-]+)/g)].map((match) => match[1])
);

for (const variable of cssReferences) {
  if (!cssDefinitions.has(variable)) {
    errors.push(`Variável CSS usada sem definição: ${variable}`);
  }
}

for (const file of cssFiles) {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    if (line.length > MAX_CSS_LINE_LENGTH) {
      errors.push(
        `${relative(ROOT, file)}:${index + 1}: ${line.length} caracteres CSS ` +
          `(máximo ${MAX_CSS_LINE_LENGTH})`
      );
    }
  });
}

if (errors.length > 0) {
  console.error('\n❌ A estrutura não passou nos padrões do projeto:\n');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('✅ Estrutura aprovada.');
console.log(`   Arquivos TypeScript verificados: ${codeFiles.length}`);
console.log(`   Máximo por arquivo: ${MAX_LINES_PER_FILE} linhas`);
console.log(`   Máximo por linha TS/TSX: ${MAX_LINE_LENGTH} caracteres`);
console.log(`   Máximo por linha CSS: ${MAX_CSS_LINE_LENGTH} caracteres`);
console.log(`   Versão sincronizada: ${expectedVersion}`);
