import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const roots = ['MercurionWebNg/src', 'MercurionWebNode/src'];
const files = [];

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (entry.name.endsWith('.spec.ts')) files.push(path);
  }
}

for (const root of roots) await walk(root);

const smokePattern =
  /\b(?:it|test)\s*\(\s*['"`]should be (?:created|defined)['"`][\s\S]*?expect\s*\([^)]*\)\.(?:toBeTruthy|toBeDefined)\s*\(\s*\)/;
const testPattern = /\b(?:it|test)\s*\(/g;
const inventory = [];
let maintainedTests = 0;

for (const file of files) {
  const source = await readFile(file, 'utf8');
  const tests = source.match(testPattern)?.length ?? 0;
  maintainedTests += tests;
  if (tests === 1 && smokePattern.test(source)) {
    inventory.push(relative(process.cwd(), file).replaceAll('\\', '/'));
  }
}

const ratio = maintainedTests === 0 ? 0 : inventory.length / maintainedTests;
const report = {
  maintainedProductionSpecFiles: files.length,
  maintainedProductionUnitTests: maintainedTests,
  smokeOnlySpecFiles: inventory.length,
  smokeOnlyRatio: Number(ratio.toFixed(4)),
  smokeOnlyPercent: Number((ratio * 100).toFixed(2)),
  smokeOnlyFiles: inventory,
};
console.log(JSON.stringify(report, null, 2));
if (ratio > 0.1) {
  console.error(`Smoke-only spec ratio ${report.smokeOnlyPercent}% exceeds the 10% limit.`);
  process.exitCode = 1;
}
