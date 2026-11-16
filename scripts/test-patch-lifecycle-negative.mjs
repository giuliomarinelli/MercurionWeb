import assert from 'node:assert/strict'
import { evaluatePatchLifecycle } from './check-patch-lifecycle.mjs'

const baseRegistry = {
  retainedPatches: [{
    package: '@scope/pkg',
    resolvedVersion: '1.2.3',
    patchPath: 'patches/pkg.patch',
    targetFiles: ['node_modules/@scope/pkg/dist/index.js'],
    owner: 'Owner',
    rationale: 'Reason',
    behavioralImpact: 'Impact',
    upstreamReference: 'https://example.test/upstream',
    removalDeadline: '2099-01-01',
    removalCondition: 'Condition',
    regressionTest: 'scripts/test-pkg.mjs',
    delta: { before: ['-before'], after: ['+after'] }
  }],
  removedPatches: []
}

const valid = {
  registry: baseRegistry,
  lockfile: { packages: { 'node_modules/@scope/pkg': { version: '1.2.3' } } },
  manifests: [{ dependencies: { '@scope/pkg': '1.2.3' } }],
  patchFiles: new Map([[
    'patches/pkg.patch',
    'diff --git a/node_modules/@scope/pkg/dist/index.js b/node_modules/@scope/pkg/dist/index.js\n-before\n+after\n'
  ]]),
  installedPackages: new Map([[
    '@scope/pkg',
    { version: '1.2.3', files: new Set(['node_modules/@scope/pkg/dist/index.js']) }
  ]]),
  availableFiles: new Set(['scripts/test-pkg.mjs'])
}

assert.deepEqual(evaluatePatchLifecycle(valid), [])
assert.match(
  evaluatePatchLifecycle({
    ...valid,
    patchFiles: new Map([['patches/orphan.patch', 'diff --git a/a b/a\n']])
  }).join('\n'),
  /registered patch file is missing/
)
assert.match(
  evaluatePatchLifecycle({
    ...valid,
    patchFiles: new Map([
      ...valid.patchFiles,
      ['patches/orphan.patch', 'diff --git a/a b/a\n']
    ])
  }).join('\n'),
  /orphan patch file/
)
assert.match(
  evaluatePatchLifecycle({
    ...valid,
    lockfile: { packages: { 'node_modules/@scope/pkg': { version: '9.9.9' } } }
  }).join('\n'),
  /lockfile version mismatch/
)
assert.match(
  evaluatePatchLifecycle({
    ...valid,
    registry: {
      ...baseRegistry,
      retainedPatches: [{
        ...baseRegistry.retainedPatches[0],
        removalDeadline: '2000-01-01'
      }]
    },
    today: '2026-09-18'
  }).join('\n'),
  /removal deadline elapsed/
)

console.log('Patch lifecycle negative checks passed.')
