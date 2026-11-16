import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(process.cwd());
const defaultPolicyPath = join(root, 'docs/autonomous-development/dependency-exception-policy.json');

function packageNameFromLockPath(lockPath) {
  const marker = 'node_modules/';
  const index = lockPath.lastIndexOf(marker);
  return index === -1 ? null : lockPath.slice(index + marker.length);
}

function collectDirectDependencies(manifests) {
  const direct = new Map();
  for (const manifest of manifests) {
    for (const section of ['dependencies', 'devDependencies', 'optionalDependencies']) {
      for (const [name, version] of Object.entries(manifest[section] ?? {})) {
        direct.set(name, version);
      }
    }
  }
  return direct;
}

function collectLockedVersions(lockfile) {
  const versions = new Map();
  for (const [lockPath, entry] of Object.entries(lockfile.packages ?? {})) {
    const name = packageNameFromLockPath(lockPath);
    if (!name || !entry.version) continue;
    if (!versions.has(name)) versions.set(name, new Set());
    versions.get(name).add(entry.version);
  }
  return versions;
}

export function evaluateDependencyPolicy({ manifests, lockfile, policy, warningReport }) {
  const direct = collectDirectDependencies(manifests);
  const lockedVersions = collectLockedVersions(lockfile);
  const violations = [];

  for (const [name, entry] of Object.entries(policy.auditedPackages ?? {})) {
    const version = direct.get(name);
    if (entry.direct === 'forbidden' && version) {
      violations.push(`forbidden audited direct dependency ${name}@${version}`);
    }
    if (entry.direct === 'approved') {
      if (!version) {
        violations.push(`approved canonical dependency is missing: ${name}`);
      } else if (entry.version && version !== entry.version) {
        violations.push(`approved dependency ${name} must be ${entry.version}, found ${version}`);
      }
    }
  }

  const exceptions = new Map();
  for (const exception of policy.transitiveExceptions ?? []) {
    if (exceptions.has(exception.package)) {
      violations.push(`duplicate transitive exception for ${exception.package}`);
    }
    exceptions.set(exception.package, exception);
    if (direct.has(exception.package)) {
      violations.push(`transitive exception is direct and unexplained: ${exception.package}`);
    }
    if (!exception.owner || !exception.reason || !exception.upstream ||
        !exception.removalDeadline || !exception.removalTrigger) {
      violations.push(`incomplete time-bounded exception for ${exception.package}`);
    }
    const versions = lockedVersions.get(exception.package) ?? new Set();
    if (!versions.has(exception.version) && exception.presence !== 'optional-peer') {
      violations.push(`exception ${exception.package}@${exception.version} is absent from package-lock.json`);
    }
  }

  for (const warning of warningReport.warnings ?? []) {
    const exception = exceptions.get(warning.package);
    if (!exception || exception.version !== warning.version) {
      violations.push(`unaccepted dependency warning ${warning.package}@${warning.version}`);
    }
  }

  for (const accepted of warningReport.acceptedWarnings ?? []) {
    const exception = exceptions.get(accepted.package);
    if (!exception || exception.version !== accepted.version) {
      violations.push(`warning report accepts an unregistered package ${accepted.package}@${accepted.version}`);
    }
  }

  return {
    violations,
    directCount: direct.size,
    auditedCount: Object.keys(policy.auditedPackages ?? {}).length,
    exceptionCount: exceptions.size,
    warningCount: (warningReport.warnings ?? []).length,
  };
}

export async function runDependencyPolicy(policyPath = defaultPolicyPath, rootPath = root) {
  const policy = JSON.parse(await readFile(policyPath, 'utf8'));
  const lockfile = JSON.parse(await readFile(join(rootPath, 'package-lock.json'), 'utf8'));
  const rootManifest = JSON.parse(await readFile(join(rootPath, 'package.json'), 'utf8'));
  const manifests = [rootManifest];

  for (const workspace of rootManifest.workspaces ?? []) {
    manifests.push(JSON.parse(await readFile(join(rootPath, workspace, 'package.json'), 'utf8')));
  }

  const warningReport = JSON.parse(await readFile(join(rootPath, policy.warningReport), 'utf8'));
  const result = evaluateDependencyPolicy({ manifests, lockfile, policy, warningReport });
  if (result.violations.length > 0) {
    throw new Error(`Dependency policy failed:\n${result.violations.join('\n')}`);
  }
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await runDependencyPolicy();
  console.log(
    `Dependency policy passed: ${result.directCount} direct packages, ` +
    `${result.exceptionCount} registered transitive exceptions, ${result.warningCount} unaccepted warnings.`,
  );
}

assert.equal(typeof evaluateDependencyPolicy, 'function');
