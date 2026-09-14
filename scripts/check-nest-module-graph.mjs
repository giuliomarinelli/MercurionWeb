import fs from 'node:fs';
import path from 'node:path';

const rootArg = process.argv.find((arg) => arg.startsWith('--root='));
const root = path.resolve(process.cwd(), rootArg ? rootArg.slice('--root='.length) : 'MercurionWebNode');
const json = process.argv.includes('--json');

function filesIn(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return filesIn(file);
    return entry.name.endsWith('.module.ts') ? [file] : [];
  });
}

function typescriptFilesIn(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return typescriptFilesIn(file);
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts') ? [file] : [];
  });
}

function importsBlock(source) {
  const start = source.indexOf('imports:');
  if (start < 0) return '';
  const open = source.indexOf('[', start);
  if (open < 0) return '';
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === '[') depth += 1;
    if (source[index] === ']') {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, index);
    }
  }
  return '';
}

function topLevelEntries(block) {
  const entries = [];
  let current = '';
  let depth = 0;
  let quote = '';
  let escaped = false;

  for (const character of block) {
    if (quote) {
      current += character;
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === quote) {
        quote = '';
      }
      continue;
    }

    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      current += character;
      continue;
    }
    if (character === '(' || character === '[' || character === '{') depth += 1;
    if (character === ')' || character === ']' || character === '}') depth -= 1;
    if (character === ',' && depth === 0) {
      if (current.trim()) entries.push(current.trim());
      current = '';
      continue;
    }
    current += character;
  }

  if (current.trim()) entries.push(current.trim());
  return entries;
}

const files = filesIn(path.join(root, 'src'));
const modules = new Map();
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const match = source.match(/export\s+class\s+([A-Za-z_$][\w$]*)/);
  if (match) modules.set(match[1], file);
}

const graph = new Map(files.map((file) => [file, new Set()]));
const duplicateImports = [];
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const block = importsBlock(source);
  const entries = topLevelEntries(block);
  for (const [name, target] of modules) {
    if (target !== file && new RegExp(`\\b${name}\\b`).test(block)) graph.get(file).add(target);
    const count = entries.filter((entry) => new RegExp(`\\b${name}\\b`).test(entry)).length;
    if (target !== file && count > 1) {
      duplicateImports.push({ file, module: name, count });
    }
  }
}

let nextIndex = 0;
const indices = new Map();
const lowLinks = new Map();
const stack = [];
const onStack = new Set();
const cycles = [];

function visit(node) {
  indices.set(node, nextIndex);
  lowLinks.set(node, nextIndex);
  nextIndex += 1;
  stack.push(node);
  onStack.add(node);
  for (const child of graph.get(node) ?? []) {
    if (!indices.has(child)) {
      visit(child);
      lowLinks.set(node, Math.min(lowLinks.get(node), lowLinks.get(child)));
    } else if (onStack.has(child)) {
      lowLinks.set(node, Math.min(lowLinks.get(node), indices.get(child)));
    }
  }
  if (lowLinks.get(node) === indices.get(node)) {
    const component = [];
    let member;
    do {
      member = stack.pop();
      onStack.delete(member);
      component.push(member);
    } while (member !== node);
    if (component.length > 1 || graph.get(node)?.has(node)) cycles.push(component.sort());
  }
}

for (const file of graph.keys()) if (!indices.has(file)) visit(file);
const relative = (file) => path.relative(root, file).split(path.sep).join('/');

const configFiles = [
  ...typescriptFilesIn(path.join(root, 'src', 'config')),
  ...(fs.existsSync(path.join(root, 'src', 'utils', 'env-helpers.ts'))
    ? [path.join(root, 'src', 'utils', 'env-helpers.ts')]
    : []),
];
const configGraph = new Map(configFiles.map((file) => [file, new Set()]));
const configFileBySpecifier = (file, specifier) => {
  const candidate = specifier.startsWith('.')
    ? path.resolve(path.dirname(file), specifier)
    : specifier.startsWith('src/')
      ? path.resolve(root, specifier)
      : undefined;
  if (!candidate) return undefined;
  const matches = [candidate, `${candidate}.ts`, path.join(candidate, 'index.ts')];
  return matches.find((match) => configGraph.has(match));
};
for (const file of configFiles) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(/(?:from\s+|import\s*)['"]([^'"]+)['"]/g)) {
    const target = configFileBySpecifier(file, match[1]);
    if (target) configGraph.get(file).add(target);
  }
}

const configCycles = [];
const configIndices = new Map();
const configLowLinks = new Map();
const configStack = [];
const configOnStack = new Set();
let configNextIndex = 0;
function visitConfig(node) {
  configIndices.set(node, configNextIndex);
  configLowLinks.set(node, configNextIndex);
  configNextIndex += 1;
  configStack.push(node);
  configOnStack.add(node);
  for (const child of configGraph.get(node) ?? []) {
    if (!configIndices.has(child)) {
      visitConfig(child);
      configLowLinks.set(node, Math.min(configLowLinks.get(node), configLowLinks.get(child)));
    } else if (configOnStack.has(child)) {
      configLowLinks.set(node, Math.min(configLowLinks.get(node), configIndices.get(child)));
    }
  }
  if (configLowLinks.get(node) === configIndices.get(node)) {
    const component = [];
    let member;
    do {
      member = configStack.pop();
      configOnStack.delete(member);
      component.push(member);
    } while (member !== node);
    if (component.length > 1 || configGraph.get(node)?.has(node)) {
      configCycles.push(component.sort());
    }
  }
}
for (const file of configGraph.keys()) if (!configIndices.has(file)) visitConfig(file);

const output = {
  root: relative(root),
  modules: [...graph.keys()].sort().map(relative),
  edges: [...graph.entries()].flatMap(([from, targets]) =>
    [...targets].sort().map((to) => ({ from: relative(from), to: relative(to) }))),
  duplicateImports: duplicateImports
    .sort((left, right) => left.file.localeCompare(right.file) || left.module.localeCompare(right.module))
    .map(({ file, module, count }) => ({ file: relative(file), module, count })),
  cycles: cycles.map((cycle) => cycle.map(relative)),
  config: {
    files: configFiles.sort().map(relative),
    edges: [...configGraph.entries()].flatMap(([from, targets]) =>
      [...targets].sort().map((to) => ({ from: relative(from), to: relative(to) }))),
    cycles: configCycles.map((cycle) => cycle.map(relative)),
  },
};

if (json) {
  console.log(JSON.stringify(output, null, 2));
} else if (cycles.length || configCycles.length || duplicateImports.length) {
  if (cycles.length) console.error(`Nest production module graph contains ${cycles.length} cycle(s):`);
  cycles.forEach((cycle, index) => {
    console.error(`\nCycle ${index + 1}:`);
    cycle.forEach((file) => console.error(`  ${relative(file)}`));
  });
  if (configCycles.length) {
    console.error(`Nest configuration graph contains ${configCycles.length} cycle(s):`);
    configCycles.forEach((cycle, index) => {
      console.error(`\nConfiguration cycle ${index + 1}:`);
      cycle.forEach((file) => console.error(`  ${relative(file)}`));
    });
  }
  if (duplicateImports.length) {
    console.error(`Nest production module graph contains ${duplicateImports.length} duplicate import(s):`);
    duplicateImports.forEach(({ file, module, count }) => {
      console.error(`  ${relative(file)} imports ${module} ${count} times`);
    });
  }
  process.exitCode = 1;
} else {
  console.log(`Nest production and configuration graphs are acyclic with unique module imports (${graph.size} modules, ${configGraph.size} config files checked).`);
}
