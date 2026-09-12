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

const files = filesIn(path.join(root, 'src'));
const modules = new Map();
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const match = source.match(/export\s+class\s+([A-Za-z_$][\w$]*)/);
  if (match) modules.set(match[1], file);
}

const graph = new Map(files.map((file) => [file, new Set()]));
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const block = importsBlock(source);
  for (const [name, target] of modules) {
    if (target !== file && new RegExp(`\\b${name}\\b`).test(block)) graph.get(file).add(target);
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
const output = {
  root: relative(root),
  modules: [...graph.keys()].sort().map(relative),
  edges: [...graph.entries()].flatMap(([from, targets]) =>
    [...targets].sort().map((to) => ({ from: relative(from), to: relative(to) }))),
  cycles: cycles.map((cycle) => cycle.map(relative)),
};

if (json) {
  console.log(JSON.stringify(output, null, 2));
} else if (cycles.length) {
  console.error(`Nest production module graph contains ${cycles.length} cycle(s):`);
  cycles.forEach((cycle, index) => {
    console.error(`\nCycle ${index + 1}:`);
    cycle.forEach((file) => console.error(`  ${relative(file)}`));
  });
  process.exitCode = 1;
} else {
  console.log(`Nest production module graph is acyclic (${graph.size} modules checked).`);
}
