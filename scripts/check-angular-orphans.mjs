import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const rootArg = process.argv.find(arg => arg.startsWith('--root='));
const workspaceRoot = path.resolve(process.cwd(), rootArg ? rootArg.slice('--root='.length) : 'MercurionWebNg');
const sourceRoot = path.join(workspaceRoot, 'src');
const configPath = path.join(workspaceRoot, 'angular-reachability.config.json');

function sourceKey(file) {
  return path.normalize(path.resolve(file)).toLowerCase();
}

function relative(file) {
  return path.relative(workspaceRoot, file).split(path.sep).join('/');
}

function readOptions() {
  const config = ts.readConfigFile(path.join(workspaceRoot, 'tsconfig.json'), ts.sys.readFile);
  if (config.error) {
    throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
  }
  return ts.parseJsonConfigFileContent(config.config, ts.sys, workspaceRoot).options;
}

function productionFiles() {
  return ts.sys.readDirectory(sourceRoot, ['.ts'], ['node_modules'])
    .filter(file =>
      !file.endsWith('.d.ts') &&
      !file.endsWith('.spec.ts') &&
      !file.endsWith('.test.ts') &&
      !file.endsWith('.stories.ts')
    )
    .map(file => path.resolve(file));
}

function importsFrom(file) {
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true
  );
  const specifiers = [];
  const visit = node => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      specifiers.push(node.moduleSpecifier.text);
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
  visit(source);
  return specifiers;
}

function buildGraph(files) {
  const options = readOptions();
  const fileSet = new Map(files.map(file => [sourceKey(file), file]));
  const graph = new Map(files.map(file => [file, new Set()]));
  for (const file of files) {
    for (const specifier of importsFrom(file)) {
      const resolved = ts.resolveModuleName(specifier, file, options, ts.sys)
        .resolvedModule?.resolvedFileName;
      const target = resolved && fileSet.get(sourceKey(resolved));
      if (target) graph.get(file).add(target);
    }
  }
  return graph;
}

function readAllowlist() {
  if (!fs.existsSync(configPath)) return new Set();
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  return new Set((config.allowlistedNonProductionFiles ?? []).map(entry =>
    typeof entry === 'string' ? entry : entry.file
  ));
}

function main() {
  const files = productionFiles();
  const graph = buildGraph(files);
  const byKey = new Map(files.map(file => [sourceKey(file), file]));
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const entrypoints = (config.entrypoints ?? []).map(entry => {
    const file = path.resolve(workspaceRoot, entry);
    const found = byKey.get(sourceKey(file));
    if (!found) throw new Error(`Configured Angular entrypoint does not exist: ${entry}`);
    return found;
  });
  const reachable = new Set();
  const visit = file => {
    if (reachable.has(file)) return;
    reachable.add(file);
    for (const target of graph.get(file) ?? []) visit(target);
  };
  for (const entrypoint of entrypoints) visit(entrypoint);

  const allowlisted = readAllowlist();
  const orphaned = files
    .filter(file => !reachable.has(file) && !allowlisted.has(relative(file)))
    .map(relative)
    .sort();
  const invalidAllowlist = [...allowlisted]
    .filter(file => !byKey.has(sourceKey(path.resolve(workspaceRoot, file))))
    .sort();

  const report = {
    version: 1,
    entrypoints: entrypoints.map(relative),
    productionFileCount: files.length,
    reachableFileCount: reachable.size,
    orphanedFiles: orphaned,
    allowlistedNonProductionFiles: (config.allowlistedNonProductionFiles ?? []).sort((a, b) =>
      (typeof a === 'string' ? a : a.file).localeCompare(typeof b === 'string' ? b : b.file)
    ),
  };
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
  } else if (orphaned.length || invalidAllowlist.length) {
    if (orphaned.length) {
      console.error(`Angular production reachability found ${orphaned.length} orphaned file(s):`);
      for (const file of orphaned) console.error(`  ${file}`);
    }
    if (invalidAllowlist.length) {
      console.error('Angular reachability allowlist contains missing files:');
      for (const file of invalidAllowlist) console.error(`  ${file}`);
    }
  } else {
    console.log(`Angular production reachability is complete (${files.length} modules checked).`);
  }
  if (orphaned.length || invalidAllowlist.length) process.exitCode = 1;
}

main();
