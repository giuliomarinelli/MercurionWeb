import assert from 'node:assert/strict';
import { evaluateDependencyPolicy } from './check-dependency-policy.mjs';

const policy = {
  auditedPackages: {
    scmp: { direct: 'forbidden' },
  },
  transitiveExceptions: [{
    package: 'scmp',
    version: '2.1.0',
    owner: 'Owner',
    reason: 'Reason',
    upstream: 'https://example.test/scmp',
    removalDeadline: '2027-03-31',
    removalTrigger: 'Trigger',
  }],
};

const result = evaluateDependencyPolicy({
  manifests: [{ dependencies: { scmp: '2.1.0' } }],
  lockfile: { packages: { 'node_modules/scmp': { version: '2.1.0' } } },
  policy,
  warningReport: { warnings: [], acceptedWarnings: [] },
});

assert.match(result.violations.join('\n'), /forbidden audited direct dependency scmp@2\.1\.0/);
assert.match(result.violations.join('\n'), /transitive exception is direct and unexplained: scmp/);
console.log('Dependency policy negative check passed.');
