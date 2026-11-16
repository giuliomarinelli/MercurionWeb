import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const cases = [
  ['orphan', 'scripts/test-angular-orphans-negative.mjs'],
  ['cycle', 'scripts/test-angular-import-graph-negative.mjs'],
  ['forbidden edge', 'scripts/test-architecture-policy-negative.mjs'],
  ['Nest orphan', 'scripts/test-nest-orphans-negative.mjs'],
  ['Nest cycle', 'scripts/test-nest-module-graph-negative.mjs'],
];

for (const [label, script] of cases) {
  const result = spawnSync(process.execPath, [path.join(root, script)], {
    cwd: root,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    console.error(`Topology negative fixture failed: ${label}`);
    console.error(result.stderr || result.stdout);
    process.exit(1);
  }
}

console.log('Repository topology negative fixtures reject orphan, cycle, and forbidden-edge findings.');
