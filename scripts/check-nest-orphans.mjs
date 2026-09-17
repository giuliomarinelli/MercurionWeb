import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import ts from 'typescript';

const rootArg = process.argv.find((argument) => argument.startsWith('--root='));
const root = path.resolve(
  process.cwd(),
  rootArg ? rootArg.slice('--root='.length) : 'MercurionWebNode',
);
const sourceRoot = path.join(root, 'src');
const configPath = path.join(root, 'nest-reachability.config.json');

function key(file) {
  return path.normalize(path.resolve(file)).toLowerCase();
}

function relative(file) {
  return path.relative(root, file).split(path.sep).join('/');
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function sourceFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(file);
    if (
      !entry.name.endsWith('.ts')
      || entry.name.endsWith('.d.ts')
      || entry.name.endsWith('.spec.ts')
      || entry.name.endsWith('.test.ts')
    ) {
      return [];
    }
    return [path.resolve(file)];
  });
}

function compilerOptions() {
  const tsconfig = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile);
  if (tsconfig.error) {
    throw new Error(ts.flattenDiagnosticMessageText(tsconfig.error.messageText, '\n'));
  }
  return ts.parseJsonConfigFileContent(tsconfig.config, ts.sys, root).options;
}

function importSpecifiers(file) {
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  const specifiers = [];
  const visit = (node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
      && node.moduleSpecifier
      && ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text);
    } else if (
      ts.isCallExpression(node)
      && node.expression.kind === ts.SyntaxKind.ImportKeyword
      && node.arguments.length === 1
      && ts.isStringLiteral(node.arguments[0])
    ) {
      specifiers.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return specifiers;
}

function main() {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Missing Nest reachability configuration: ${relative(configPath)}`);
  }

  const config = readJson(configPath);
  const allFiles = sourceFiles(sourceRoot);
  const filesByKey = new Map(allFiles.map((file) => [key(file), file]));
  const allowlisted = new Map(
    (config.allowlistedNonProductionFiles ?? []).map((entry) => [
      typeof entry === 'string' ? entry : entry.file,
      entry,
    ]),
  );
  const productionFiles = allFiles.filter((file) => !allowlisted.has(relative(file)));
  const productionByKey = new Map(productionFiles.map((file) => [key(file), file]));
  const options = compilerOptions();
  const graph = new Map(productionFiles.map((file) => [file, new Set()]));

  for (const file of productionFiles) {
    for (const specifier of importSpecifiers(file)) {
      const resolved = ts.resolveModuleName(specifier, file, options, ts.sys)
        .resolvedModule?.resolvedFileName;
      const target = resolved && productionByKey.get(key(resolved));
      if (target) graph.get(file).add(target);
    }
  }

  const configuredEntrypoints = [
    ...(config.entrypoints ?? []),
    ...(config.dynamicEntrypoints ?? []).map((entry) =>
      typeof entry === 'string' ? entry : entry.file),
  ];
  const entrypoints = configuredEntrypoints.map((entry) => {
    const file = filesByKey.get(key(path.resolve(root, entry)));
    if (!file) throw new Error(`Configured Nest entrypoint does not exist: ${entry}`);
    return file;
  });
  const reachable = new Set();
  const visit = (file) => {
    if (reachable.has(file)) return;
    reachable.add(file);
    for (const target of graph.get(file) ?? []) visit(target);
  };
  entrypoints.forEach(visit);

  const orphanedFiles = productionFiles
    .filter((file) => !reachable.has(file))
    .map(relative)
    .sort();
  const invalidAllowlist = [...allowlisted.keys()]
    .filter((file) => !filesByKey.has(key(path.resolve(root, file))))
    .sort();
  const invalidEntrypoint = (config.dynamicEntrypoints ?? [])
    .filter((entry) => !filesByKey.has(key(path.resolve(root, typeof entry === 'string' ? entry : entry.file))))
    .map((entry) => typeof entry === 'string' ? entry : entry.file)
    .sort();

  const report = {
    version: 1,
    entrypoints: entrypoints.map(relative),
    dynamicEntrypoints: config.dynamicEntrypoints ?? [],
    productionFileCount: productionFiles.length,
    reachableFileCount: [...reachable].filter((file) => productionByKey.has(key(file))).length,
    orphanedFiles,
    allowlistedNonProductionFiles: [...allowlisted.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([, entry]) => entry),
  };

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
  } else if (orphanedFiles.length || invalidAllowlist.length || invalidEntrypoint.length) {
    if (orphanedFiles.length) {
      console.error(`Nest production reachability found ${orphanedFiles.length} orphaned file(s):`);
      orphanedFiles.forEach((file) => console.error(`  ${file}`));
    }
    if (invalidAllowlist.length) {
      console.error('Nest reachability allowlist contains missing files:');
      invalidAllowlist.forEach((file) => console.error(`  ${file}`));
    }
    if (invalidEntrypoint.length) {
      console.error('Nest reachability dynamic entrypoint list contains missing files:');
      invalidEntrypoint.forEach((file) => console.error(`  ${file}`));
    }
  } else {
    console.log(
      `Nest production reachability is complete (${productionFiles.length} production files checked; `
      + `${allowlisted.size} precise non-production exceptions documented).`,
    );
  }

  if (orphanedFiles.length || invalidAllowlist.length || invalidEntrypoint.length) {
    process.exitCode = 1;
  }
}

main();
