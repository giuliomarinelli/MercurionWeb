import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policy = JSON.parse(
  fs.readFileSync(path.join(repositoryRoot, 'scripts', 'architecture-policy.json'), 'utf8'),
);

const angularRoot = path.join(repositoryRoot, 'MercurionWebNg', 'src', 'app');
const nestRoot = path.join(repositoryRoot, 'MercurionWebNode', 'src');

function sourceFiles(root) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(root, entry.name);
    if (entry.isDirectory()) return sourceFiles(file);
    return entry.name.endsWith('.ts') &&
      !entry.name.endsWith('.spec.ts') &&
      !entry.name.endsWith('.test.ts')
      ? [file]
      : [];
  });
}

function layerOf(file, root, names) {
  const relative = path.relative(root, file).split(path.sep).join('/');
  return names.find((name) => relative === name || relative.startsWith(`${name}/`));
}

function relativeLayer(file, names) {
  const relative = file.split(path.sep).join('/');
  return names.find((name) => relative === name || relative.startsWith(`${name}/`));
}

function resolveRelativeImport(file, specifier, root) {
  if (!specifier.startsWith('.')) return undefined;
  const base = path.resolve(path.dirname(file), specifier);
  const candidates = [base, `${base}.ts`, path.join(base, 'index.ts')];
  return candidates.find((candidate) => fs.existsSync(candidate));
}

function imports(source) {
  const values = [];
  for (const match of source.matchAll(/\b(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g)) {
    const lineStart = source.lastIndexOf('\n', match.index) + 1;
    const linePrefix = source.slice(lineStart, match.index);
    values.push({
      specifier: match[1],
      dynamic: match[0].trimStart().startsWith('import('),
      typeOnly: /^\s*import\s+type\b/.test(linePrefix),
    });
  }
  return values;
}

function isAllowlisted(product, file, specifier) {
  const relative = path.relative(repositoryRoot, file).split(path.sep).join('/');
  return policy.allowlist.some((entry) =>
    entry.product === product && entry.file === relative && entry.specifier === specifier);
}

function collectLayerViolations(root, rules, layers, product) {
  const violations = [];
  for (const file of sourceFiles(root)) {
    const from = layerOf(file, root, layers);
    if (!from) continue;
    const rulesForLayer = rules.filter((rule) => rule.from === from);
    if (!rulesForLayer.length) continue;
    const source = fs.readFileSync(file, 'utf8');
    for (const { specifier, dynamic, typeOnly } of imports(source)) {
      // Dynamic imports are lazy entrypoints. The graph checker still includes
      // them for cycle detection, but layer policy deliberately models only
      // eager/static ownership edges.
      if (dynamic || typeOnly || isAllowlisted(product, file, specifier)) continue;
      const target = resolveRelativeImport(file, specifier, root);
      if (!target) continue;
      const to = layerOf(target, root, layers);
      if (!to) continue;
      for (const rule of rulesForLayer) {
        if (rule.forbidden.includes(to)) {
          const line = source.slice(0, source.indexOf(specifier)).split(/\r?\n/).length;
          violations.push(
            `${path.relative(repositoryRoot, file).split(path.sep).join('/')}:"${specifier}" ` +
            `(${product} rule ${from} -> ${to}, line ${line}): ${rule.rationale}`,
          );
        }
      }
    }
  }
  return violations;
}

export function collectArchitecturePolicyViolations({
  angularFiles = new Map(),
  nestFiles = new Map(),
} = {}) {
  const violations = [];
  const collectFixture = (files, rules, layers, product) => {
    for (const [file, source] of files) {
      const from = relativeLayer(file, layers);
      if (!from) continue;
      for (const { specifier, dynamic } of imports(source)) {
        if (dynamic || !specifier.startsWith('.')) continue;
        const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier));
        const to = relativeLayer(target, layers);
        for (const rule of rules.filter((item) => item.from === from)) {
          if (to && rule.forbidden.includes(to)) {
            violations.push(`${file} imports ${specifier}: ${product} rule ${from} -> ${to}`);
          }
        }
      }
    }
  };
  collectFixture(angularFiles, policy.angular.staticLayerRules,
    ['utils', 'config', 'components', 'services', 'pages', 'graphql', 'chemistry'], 'Angular');
  collectFixture(nestFiles, policy.nest.staticLayerRules,
    ['utils', 'config', 'contracts', 'metadata', 'app_modules'], 'Nest');
  return violations;
}

function run(label, script, args = []) {
  const result = spawnSync(process.execPath, [path.join(repositoryRoot, 'scripts', script), ...args], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
  if (output) console.log(`[architecture:${label}]\n${output}`);
  if (result.status !== 0) {
    console.error(`Architecture policy failed in ${label}. Preserve the violating edge/path above.`);
    process.exitCode = result.status ?? 1;
    return false;
  }
  return true;
}

function main() {
  const violations = [
    ...collectLayerViolations(angularRoot, policy.angular.staticLayerRules,
      ['utils', 'config', 'components', 'pages', 'services', 'graphql', 'chemistry'], 'Angular'),
    ...collectLayerViolations(nestRoot, policy.nest.staticLayerRules,
      ['utils', 'config', 'contracts', 'metadata', 'app_modules'], 'Nest'),
  ];
  if (violations.length) {
    console.error('Architecture layer policy violations:');
    violations.forEach((violation) => console.error(`  ${violation}`));
    process.exitCode = 1;
    return;
  }
  console.log('Architecture layer policy passed; lazy dynamic imports are handled by the graph scanner.');

  const checks = [
    ['graphql-internal-imports', 'check-graphql-internal-import-policy.mjs'],
    ['graphql-internal-imports-negative', 'test-graphql-internal-import-policy-negative.mjs'],
    ['angular-environment-imports', 'check-angular-environment-import-boundaries.mjs'],
    ['angular-environment-imports-negative', 'test-angular-environment-import-boundaries-negative.mjs'],
    ['angular-storage', 'check-angular-browser-storage-registry.mjs'],
    ['angular-import-graph', 'check-angular-import-graph.mjs', ['--root=MercurionWebNg']],
    ['angular-import-graph-negative', 'test-angular-import-graph-negative.mjs'],
    ['nest-module-graph', 'check-nest-module-graph.mjs', ['--root=MercurionWebNode']],
    ['nest-module-graph-negative', 'test-nest-module-graph-negative.mjs'],
    ['nest-provider-ownership', 'check-nest-provider-ownership.mjs', ['--root=MercurionWebNode']],
    ['nest-provider-ownership-negative', 'test-nest-provider-ownership-negative.mjs'],
    ['nest-test-route-policy', 'check-nest-test-route-policy.mjs'],
    ['architecture-layers-negative', 'test-architecture-policy-negative.mjs'],
  ];
  for (const [label, script, args] of checks) {
    if (!run(label, script, args)) return;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
