import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const checker = path.resolve(process.cwd(), 'scripts/check-angular-import-graph.mjs');
const fixture = path.resolve(process.cwd(), 'scripts/fixtures/angular-import-graph-cycle');
const result = spawnSync(process.execPath, [checker, `--root=${fixture}`], {
  encoding: 'utf8',
});

if (result.status === 0 || !result.stderr.includes('contains 1 cycle(s)')) {
  console.error('The Angular graph checker did not reject the synthetic cycle.');
  console.error(result.stderr || result.stdout);
  process.exit(1);
}

console.log('Angular graph checker rejects the synthetic cycle.');
