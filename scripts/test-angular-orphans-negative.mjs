import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const checker = path.resolve(process.cwd(), 'scripts/check-angular-orphans.mjs');
const fixture = path.resolve(process.cwd(), 'scripts/fixtures/angular-orphan');
const result = spawnSync(process.execPath, [checker, `--root=${fixture}`], {
  encoding: 'utf8',
});

if (result.status === 0 || !`${result.stdout}\n${result.stderr}`.includes('orphan')) {
  console.error('The Angular orphan checker did not reject the synthetic orphan.');
  console.error(result.stderr || result.stdout);
  process.exit(1);
}

console.log('Angular orphan checker rejects the synthetic orphan.');
