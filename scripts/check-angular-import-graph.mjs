import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const projectRoot = path.resolve(process.cwd(), 'MercurionWebNg');

function readOptions(root) {
  const configPath = path.join(root, 'tsconfig.json');
  if (!fs.existsSync(configPath)) {
    return {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      baseUrl: root,
    };
  }

  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error) {
    throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
  }
  return ts.parseJsonConfigFileContent(config.config, ts.sys, root).options;
}

function productionFiles(root) {
  return ts.sys.readDirectory(
    path.join(root, 'src'),
    ['.ts'],
    ['node_modules'],
  )
    .filter((file) =>
      !file.endsWith('.d.ts') &&
      !file.endsWith('.spec.ts') &&
      !file.endsWith('.test.ts') &&
      !file.endsWith('.stories.ts'),
    )
    .map((file) => path.resolve(file));
}

function sourceKey(file) {
  return path.normalize(path.resolve(file)).toLowerCase();
}

function importsFrom(sourceFile) {
  const specifiers = [];
  const visit = (node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        specifiers.push(node.moduleSpecifier.text);
      }
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      specifiers.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return specifiers;
}

function resolveGraph(root) {
  const files = productionFiles(root);
  const fileSet = new Map(files.map((file) => [sourceKey(file), file]));
  const options = readOptions(root);
  const graph = new Map(files.map((file) => [file, new Set()]));

  for (const file of files) {
    const source = ts.createSourceFile(
      file,
      fs.readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    for (const specifier of importsFrom(source)) {
      const result = ts.resolveModuleName(specifier, file, options, ts.sys);
      const resolved = result.resolvedModule?.resolvedFileName;
      if (!resolved) continue;
      const target = fileSet.get(sourceKey(resolved));
      if (target) graph.get(file).add(target);
    }
  }
  return graph;
}

function stronglyConnectedComponents(graph) {
  let index = 0;
  const indices = new Map();
  const lowLinks = new Map();
  const stack = [];
  const onStack = new Set();
  const components = [];

  function visit(node) {
    indices.set(node, index);
    lowLinks.set(node, index);
    index += 1;
    stack.push(node);
    onStack.add(node);

    for (const next of graph.get(node) ?? []) {
      if (!indices.has(next)) {
        visit(next);
        lowLinks.set(node, Math.min(lowLinks.get(node), lowLinks.get(next)));
      } else if (onStack.has(next)) {
        lowLinks.set(node, Math.min(lowLinks.get(node), indices.get(next)));
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
      if (component.length > 1 || graph.get(node)?.has(node)) {
        components.push(component.sort());
      }
    }
  }

  for (const node of graph.keys()) {
    if (!indices.has(node)) visit(node);
  }
  return components.sort((a, b) => a.join('\n').localeCompare(b.join('\n')));
}

function relative(file, root) {
  return path.relative(root, file).split(path.sep).join('/');
}

const rootArg = process.argv.find((arg) => arg.startsWith('--root='));
const root = path.resolve(process.cwd(), rootArg ? rootArg.slice('--root='.length) : 'MercurionWebNg');
const graph = resolveGraph(root);
const cycles = stronglyConnectedComponents(graph);

if (cycles.length > 0) {
  console.error(`Angular production import graph contains ${cycles.length} cycle(s):`);
  for (const [index, cycle] of cycles.entries()) {
    console.error(`\nCycle ${index + 1}:`);
    for (const file of cycle) console.error(`  ${relative(file, root)}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Angular production import graph is acyclic (${graph.size} modules checked).`);
}
