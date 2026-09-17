import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const repositoryRoot = process.cwd();
const configPath = path.join(repositoryRoot, 'scripts', 'topology-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const packageJson = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'package.json'), 'utf8'));
const reportDirArg = process.argv.find((arg) => arg.startsWith('--report-dir='));
const reportDir = path.resolve(
  repositoryRoot,
  reportDirArg ? reportDirArg.slice('--report-dir='.length) : 'reports/topology',
);

const expectedScripts = {
  'ci:angular:import-graph': 'node scripts/check-angular-import-graph.mjs --root=MercurionWebNg && node scripts/test-angular-import-graph-negative.mjs',
  'ng:orphans:check': 'node scripts/check-angular-orphans.mjs --root=MercurionWebNg && node scripts/test-angular-orphans-negative.mjs',
  'ci:nest:architecture': 'node scripts/check-nest-module-graph.mjs --root=MercurionWebNode && node scripts/test-nest-module-graph-negative.mjs && node scripts/check-nest-provider-ownership.mjs --root=MercurionWebNode && node scripts/test-nest-provider-ownership-negative.mjs && node scripts/check-nest-repository-boundaries.mjs --root=MercurionWebNode && node scripts/test-nest-repository-boundaries-negative.mjs && node scripts/check-nest-controller-boundaries.mjs --root=MercurionWebNode && node scripts/test-nest-controller-boundaries-negative.mjs && node scripts/check-nest-test-route-policy.mjs',
  'nest:orphans:check': 'node scripts/check-nest-orphans.mjs --root=MercurionWebNode && node scripts/test-nest-orphans-negative.mjs',
};

function relative(file) {
  return path.relative(repositoryRoot, file).split(path.sep).join('/');
}

function runCheck(check) {
  const script = path.join(repositoryRoot, check.script);
  const result = spawnSync(process.execPath, [script, ...check.arguments], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
  const stdout = (result.stdout ?? '').trim();
  const stderr = (result.stderr ?? '').trim();
  let data;
  try {
    data = stdout ? JSON.parse(stdout) : undefined;
  } catch {
    data = { rawOutput: stdout };
  }
  return {
    id: check.id,
    product: check.product,
    script: check.script,
    configuration: check.configuration ?? null,
    status: result.status ?? 1,
    passed: result.status === 0,
    data,
    stderr,
  };
}

function validateComposition() {
  const errors = [];
  for (const [name, command] of Object.entries(expectedScripts)) {
    if (packageJson.scripts?.[name] !== command) {
      errors.push(`package.json script drift: ${name}`);
    }
  }
  for (const check of config.checks) {
    if (!fs.existsSync(path.join(repositoryRoot, check.script))) {
      errors.push(`missing topology checker: ${check.script}`);
    }
    if (check.configuration && !fs.existsSync(path.join(repositoryRoot, check.configuration))) {
      errors.push(`missing topology configuration: ${check.configuration}`);
    }
  }
  return errors;
}

function main() {
  const compositionErrors = validateComposition();
  const checks = config.checks.map(runCheck);
  const failedChecks = checks.filter((check) => !check.passed).map((check) => check.id);
  const report = {
    version: 1,
    gate: 'ci:topology',
    composition: {
      configuration: relative(configPath),
      errors: compositionErrors,
      passed: compositionErrors.length === 0,
    },
    checks,
    passed: compositionErrors.length === 0 && failedChecks.length === 0,
  };
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(path.join(reportDir, 'topology.json'), `${JSON.stringify(report, null, 2)}\n`);
  const summary = [
    `Repository topology gate: ${report.passed ? 'PASS' : 'FAIL'}`,
    `Checks: ${checks.length}; failed: ${failedChecks.length ? failedChecks.join(', ') : 'none'}`,
    ...compositionErrors.map((error) => `DRIFT: ${error}`),
  ];
  for (const check of checks) {
    const data = check.data ?? {};
    const findings = [
      ...(data.cycles ?? []).map((cycle) => `cycle: ${cycle.join(' -> ')}`),
      ...(data.orphanedFiles ?? []).map((file) => `orphan: ${file} (entrypoints: ${(data.entrypoints ?? []).join(', ')})`),
      ...(data.violations ?? []).map((violation) => `forbidden edge: ${violation}`),
    ];
    summary.push(`${check.id}: ${check.passed ? 'PASS' : 'FAIL'}`);
    summary.push(...findings.map((finding) => `  ${finding}`));
    if (!check.passed && !findings.length && check.stderr) summary.push(`  ${check.stderr}`);
  }
  fs.writeFileSync(path.join(reportDir, 'summary.txt'), `${summary.join('\n')}\n`);
  console.log(summary.join('\n'));
  if (!report.passed) process.exitCode = 1;
}

main();
