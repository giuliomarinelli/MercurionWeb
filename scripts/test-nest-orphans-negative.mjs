import { spawnSync } from 'node:child_process';
import path from 'node:path';

const checker = path.resolve('scripts/check-nest-orphans.mjs');
const fixture = path.resolve('scripts/fixtures/nest-orphan');
const result = spawnSync(process.execPath, [checker, `--root=${fixture}`], {
  encoding: 'utf8',
});

if (result.status === 0 || !`${result.stdout}\n${result.stderr}`.includes('orphan')) {
  console.error('The Nest orphan checker did not reject the synthetic orphan.');
  console.error(result.stderr || result.stdout);
  process.exit(1);
}

console.log('Nest orphan checker rejects the synthetic orphan.');

const nonProductionFixture = path.resolve('scripts/fixtures/nest-orphan-nonproduction');
const nonProductionResult = spawnSync(process.execPath, [checker, `--root=${nonProductionFixture}`], {
  encoding: 'utf8',
});
if (nonProductionResult.status === 0 ||
    !`${nonProductionResult.stdout}\n${nonProductionResult.stderr}`.includes('src/main.ts -> src/legacy.ts')) {
  console.error('The Nest orphan checker did not reject the production import of a non-production file.');
  console.error(nonProductionResult.stderr || nonProductionResult.stdout);
  process.exit(1);
}
console.log('Nest orphan checker rejects production imports of non-production files.');
