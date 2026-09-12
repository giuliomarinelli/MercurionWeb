import { spawnSync } from 'node:child_process';
import path from 'node:path';

const checker = path.resolve('scripts/check-nest-module-graph.mjs');
const cycleFixture = path.resolve('scripts/fixtures/nest-module-graph-cycle');
const cycleResult = spawnSync(process.execPath, [checker, `--root=${cycleFixture}`], {
  encoding: 'utf8',
});

if (cycleResult.status === 0) {
  console.error('Nest module graph checker accepted a cyclic fixture.');
  process.exit(1);
}
if (!cycleResult.stderr.includes('cycle') || !cycleResult.stderr.includes('configuration')) {
  console.error('Nest module graph checker failed without reporting a cycle.');
  process.exit(1);
}

const duplicateFixture = path.resolve('scripts/fixtures/nest-module-graph-duplicate');
const duplicateResult = spawnSync(process.execPath, [checker, `--root=${duplicateFixture}`], {
  encoding: 'utf8',
});

if (duplicateResult.status === 0) {
  console.error('Nest module graph checker accepted a duplicate production import.');
  process.exit(1);
}
if (
  !duplicateResult.stderr.includes('duplicate import')
  || !duplicateResult.stderr.includes('RealtimeModule')
  || !duplicateResult.stderr.includes('2 times')
) {
  console.error('Nest module graph checker failed without reporting the duplicate import.');
  process.exit(1);
}
console.log('Nest module graph negative test passed.');
