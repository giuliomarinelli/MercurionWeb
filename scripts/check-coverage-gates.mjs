import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  if (process.argv[index].startsWith('--')) {
    args.set(process.argv[index].slice(2), process.argv[index + 1]);
    index += 1;
  }
}

const project = args.get('project');
const coverageDir = args.get('coverage-dir');
if (!project || !coverageDir) {
  throw new Error('Usage: node scripts/check-coverage-gates.mjs --project <angular|nest> --coverage-dir <dir>');
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policy = JSON.parse(fs.readFileSync(path.join(root, 'config', 'coverage-policy.json'), 'utf8'));
const projectPolicy = policy.projects[project];
if (!projectPolicy) {
  throw new Error(`No coverage policy is registered for project "${project}".`);
}
for (const metric of ['branches', 'functions', 'lines', 'statements']) {
  if (projectPolicy.global[metric] < projectPolicy.minimums[metric]) {
    throw new Error(
      `${project} ${metric} floor ${projectPolicy.global[metric]}% is below the ratchet minimum ${projectPolicy.minimums[metric]}%.`,
    );
  }
}
for (const rule of projectPolicy.rules) {
  if (!rule.exception && (rule.branches < 80 || rule.functions < 80)) {
    throw new Error(`High-risk rule "${rule.name}" must retain the 80% branch/function floor.`);
  }
}
for (const exclusion of projectPolicy.exclusions) {
  if (!exclusion.match || !exclusion.reason) {
    throw new Error('Every coverage exclusion must include a match and a rationale.');
  }
}

const coverageRoot = path.resolve(root, coverageDir);
const coveragePath = path.join(coverageRoot, 'coverage-final.json');
if (!fs.existsSync(coveragePath)) {
  throw new Error(`Coverage report is missing: ${coveragePath}`);
}

const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
const normalize = (value) => value.replaceAll('\\', '/');
const relativeSource = (file) => normalize(path.relative(root, file));
const excluded = projectPolicy.exclusions.map((entry) => ({
  ...entry,
  regex: new RegExp(entry.match),
}));
const rules = projectPolicy.rules.map((entry) => ({
  ...entry,
  regex: new RegExp(entry.match),
}));

const percent = (values) => {
  const flattened = values.flat();
  if (flattened.length === 0) return 100;
  return (flattened.filter((value) => value > 0).length / flattened.length) * 100;
};
const lineCoverage = (entry) => {
  const lineHits = new Map();
  for (const [statementId, locations] of Object.entries(entry.statementMap ?? {})) {
    const firstLine = locations.start?.line;
    if (typeof firstLine !== 'number') continue;
    lineHits.set(firstLine, (lineHits.get(firstLine) ?? 0) + (entry.s?.[statementId] ?? 0));
  }
  return percent([...lineHits.values()]);
};
const countsFor = (entry, metric) => {
  if (metric !== 'lines') {
    const values = Object.values(entry[metric === 'branches' ? 'b' : metric === 'functions' ? 'f' : 's'] ?? {}).flat();
    return {
      covered: values.filter((value) => value > 0).length,
      total: values.length,
    };
  }
  const lineHits = new Map();
  for (const [statementId, locations] of Object.entries(entry.statementMap ?? {})) {
    const firstLine = locations.start?.line;
    if (typeof firstLine !== 'number') continue;
    lineHits.set(firstLine, (lineHits.get(firstLine) ?? 0) + (entry.s?.[statementId] ?? 0));
  }
  const values = [...lineHits.values()];
  return {
    covered: values.filter((value) => value > 0).length,
    total: values.length,
  };
};
const metricsFor = (entry) => ({
  branches: percent(Object.values(entry.b ?? {})),
  functions: percent(Object.values(entry.f ?? {})),
  lines: lineCoverage(entry),
  statements: percent(Object.values(entry.s ?? {})),
});

const included = [];
const excludedFiles = [];
for (const [absoluteFile, entry] of Object.entries(coverage)) {
  const file = relativeSource(absoluteFile);
  const exclusion = excluded.find((candidate) => candidate.regex.test(file));
  if (exclusion) {
    excludedFiles.push({ file, reason: exclusion.reason });
    continue;
  }
  included.push({ file, metrics: metricsFor(entry) });
}

const aggregate = {};
for (const metric of ['branches', 'functions', 'lines', 'statements']) {
  const totals = included.reduce(
    (result, item) => {
      const fileEntry = coverage[path.resolve(root, item.file)] ?? coverage[path.join(root, item.file)];
      const counts = countsFor(fileEntry ?? {}, metric);
      result.covered += counts.covered;
      result.total += counts.total;
      return result;
    },
    { covered: 0, total: 0 },
  );
  aggregate[metric] = totals.total === 0 ? 100 : (totals.covered / totals.total) * 100;
}

const failures = [];
for (const metric of Object.keys(projectPolicy.global)) {
  if (aggregate[metric] < projectPolicy.global[metric]) {
    failures.push({
      scope: 'global',
      metric,
      actual: aggregate[metric],
      required: projectPolicy.global[metric],
    });
  }
}

for (const rule of rules) {
  const matches = included.filter((item) => rule.regex.test(item.file));
  if (matches.length === 0) {
    failures.push({ scope: rule.name, reason: 'No maintained source matched the registered high-risk rule.' });
    continue;
  }
  for (const item of matches) {
    for (const metric of ['branches', 'functions', 'lines', 'statements']) {
      if (item.metrics[metric] < rule[metric]) {
        failures.push({
          scope: `${rule.name}:${item.file}`,
          metric,
          actual: item.metrics[metric],
          required: rule[metric],
          exception: rule.exception ?? null,
        });
      }
    }
  }
}

const report = {
  version: policy.version,
  project,
  generatedAt: new Date().toISOString(),
  global: aggregate,
  rules: rules.map(({ regex, ...rule }) => rule),
  excludedFiles,
  failures,
};
const reportDir = path.join(root, 'reports', 'coverage', project);
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, 'coverage-gate-report.json'), `${JSON.stringify(report, null, 2)}\n`);

console.log(`Coverage gate: ${project}`);
for (const metric of ['branches', 'functions', 'lines', 'statements']) {
  console.log(`  ${metric}: ${aggregate[metric].toFixed(2)}% (floor ${projectPolicy.global[metric]}%)`);
}
if (failures.length > 0) {
  console.error(JSON.stringify({ project, failures }, null, 2));
  process.exitCode = 1;
} else {
  console.log(`  high-risk rules: ${rules.length}; explicit exclusions: ${excludedFiles.length}`);
}
