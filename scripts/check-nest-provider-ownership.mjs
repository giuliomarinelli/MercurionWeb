import fs from 'node:fs';
import path from 'node:path';

const rootArg = process.argv.find((arg) => arg.startsWith('--root='));
const root = path.resolve(process.cwd(), rootArg ? rootArg.slice('--root='.length) : 'MercurionWebNode');
const json = process.argv.includes('--json');

const governedOwners = new Map([
  ['GlobalGuard', 'src/app_modules/auth/auth.module.ts'],
  ['JwtService', 'src/app_modules/auth/auth.module.ts'],
  ['JwtToolsService', 'src/app_modules/auth/auth.module.ts'],
  ['RedisService', 'src/app_modules/redis/redis.module.ts'],
  ['ResponseService', 'src/services/response.module.ts'],
  ['SessionService', 'src/app_modules/auth/auth.module.ts'],
]);

function moduleFilesIn(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return moduleFilesIn(file);
    return entry.name.endsWith('.module.ts') ? [file] : [];
  });
}

function arrayBlock(source, property) {
  const propertyMatch = new RegExp(`\\b${property}\\s*:`).exec(source);
  if (!propertyMatch) return '';
  const open = source.indexOf('[', propertyMatch.index + propertyMatch[0].length);
  if (open < 0) return '';

  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let index = open; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }
    if (character === '[') depth += 1;
    if (character === ']') {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, index);
    }
  }
  return '';
}

function topLevelEntries(block) {
  const entries = [];
  let start = 0;
  let round = 0;
  let square = 0;
  let curly = 0;
  let quote = '';
  let escaped = false;

  for (let index = 0; index <= block.length; index += 1) {
    const character = block[index] ?? ',';
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }
    if (character === '(') round += 1;
    else if (character === ')') round -= 1;
    else if (character === '[') square += 1;
    else if (character === ']') square -= 1;
    else if (character === '{') curly += 1;
    else if (character === '}') curly -= 1;
    else if (character === ',' && round === 0 && square === 0 && curly === 0) {
      const entry = block.slice(start, index).trim();
      if (entry) entries.push(entry);
      start = index + 1;
    }
  }
  return entries;
}

function providerToken(entry) {
  const direct = entry.match(/^([A-Za-z_$][\w$]*)$/);
  if (direct) return direct[1];
  const objectToken = entry.match(/\bprovide\s*:\s*([A-Za-z_$][\w$]*|'[^']+'|"[^"]+")/);
  return objectToken?.[1]?.replace(/^['"]|['"]$/g, '');
}

const relative = (file) => path.relative(root, file).split(path.sep).join('/');
const declarations = new Map();
for (const file of moduleFilesIn(path.join(root, 'src'))) {
  const providers = topLevelEntries(arrayBlock(fs.readFileSync(file, 'utf8'), 'providers'))
    .map(providerToken)
    .filter(Boolean);
  for (const provider of providers) {
    const owners = declarations.get(provider) ?? [];
    owners.push(relative(file));
    declarations.set(provider, owners);
  }
}

const governed = [...governedOwners].map(([provider, expectedOwner]) => ({
  provider,
  expectedOwner,
  declarations: [...(declarations.get(provider) ?? [])].sort(),
}));
const duplicates = [...declarations]
  .filter(([, owners]) => owners.length > 1)
  .map(([provider, owners]) => ({ provider, declarations: [...owners].sort() }))
  .sort((left, right) => left.provider.localeCompare(right.provider));
const violations = governed.filter(
  ({ expectedOwner, declarations: owners }) =>
    owners.length !== 1 || owners[0] !== expectedOwner,
);

const output = {
  root: path.relative(process.cwd(), root).split(path.sep).join('/'),
  governed,
  duplicates,
  violations,
};

if (json) {
  console.log(JSON.stringify(output, null, 2));
} else if (violations.length) {
  console.error('Governed Nest provider ownership violations:');
  for (const violation of violations) {
    const actual = violation.declarations.length ? violation.declarations.join(', ') : '[missing]';
    console.error(`  ${violation.provider}: expected ${violation.expectedOwner}; found ${actual}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Nest provider ownership is unique for ${governed.length} governed providers.`);
  for (const item of governed) {
    console.log(`  ${item.provider} -> ${item.expectedOwner}`);
  }
  if (duplicates.length) {
    console.log(`Inventory note: ${duplicates.length} other provider token(s) have multiple production declarations.`);
  }
}
