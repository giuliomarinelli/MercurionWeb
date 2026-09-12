import { spawnSync } from 'node:child_process';
import path from 'node:path';

const checker = path.resolve('scripts/check-nest-module-graph.mjs');
const fixture = path.resolve('scripts/fixtures/nest-module-graph-cycle');
const result = spawnSync(process.execPath, [checker, `--root=${fixture}`], {
  encoding: 'utf8',
});

if (result.status === 0) {
  console.error('Nest module graph checker accepted a cyclic fixture.');
  process.exit(1);
}
if (!result.stderr.includes('cycle') || !result.stderr.includes('configuration')) {
  console.error('Nest module graph checker failed without reporting a cycle.');
  process.exit(1);
}
console.log('Nest module graph negative test passed.');
