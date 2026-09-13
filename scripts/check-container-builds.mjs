import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const dockerfiles = ['MercurionWebNg/Dockerfile', 'MercurionWebNode/Dockerfile'];
const targets = {
  'MercurionWebNg/Dockerfile': ['production', 'staging', 'test'],
  'MercurionWebNode/Dockerfile': ['production', 'staging', 'test'],
};

const requiredToolchain = [
  'FROM node:22.16.0-alpine AS',
  'test "$(node --version)" = "v22.16.0"',
  'test "$(npm --version)" = "10.9.2"',
];

const runtimeUsers = {
  angular: '10101:10101',
  nest: '10001:10001',
};

for (const filename of dockerfiles) {
  const source = await readFile(filename, 'utf8');
  if (/\bnpm\s+install\b/.test(source)) {
    throw new Error(`${filename} uses mutable npm install`);
  }
  if (!source.includes('npm ci')) {
    throw new Error(`${filename} does not use npm ci`);
  }
  for (const token of requiredToolchain) {
    if (!source.includes(token)) {
      throw new Error(`${filename} is missing pinned toolchain check: ${token}`);
    }
  }
  if (!source.includes('package-lock.json')) {
    throw new Error(`${filename} does not copy the canonical lockfile`);
  }
  const runtimeFamily = filename.includes('MercurionWebNg') ? 'angular' : 'nest';
  const expectedUser = runtimeUsers[runtimeFamily];
  if (!source.includes(`USER ${expectedUser}`)) {
    throw new Error(`${filename} must declare runtime user ${expectedUser}`);
  }
  if (!/\bCMD\s+\["[^"]+"/.test(source)) {
    throw new Error(`${filename} must declare an exec-form CMD`);
  }
  for (const target of targets[filename]) {
    if (!new RegExp(`FROM .+ AS ${target}\\b`).test(source)) {
      throw new Error(`${filename} is missing explicit target ${target}`);
    }
  }
}

const ignore = await readFile('.dockerignore', 'utf8');
for (const token of ['**/node_modules', '**/.env.*', '**/*.pem']) {
  if (!ignore.includes(token)) {
    throw new Error(`.dockerignore is missing ${token}`);
  }
}

const stalePaths = ['MercurionWebNg/Dockerfile.staging', 'MercurionWebNg/Dockerfile.test',
  'MercurionWebNode/Dockerfile.staging', 'MercurionWebNode/Dockerfile.test'];
const tracked = spawnSync('git', ['ls-files', '-z'], { encoding: 'buffer' });
if (tracked.status !== 0) throw new Error(`git ls-files failed: ${tracked.stderr.toString()}`);
const excluded = new Set(['.git', 'node_modules', 'dist', 'coverage']);
for (const filename of tracked.stdout.toString().split('\0').filter(Boolean)) {
  if (filename.startsWith('docs/autonomous-development/task/')) continue;
  if (filename === 'scripts/check-container-builds.mjs') continue;
  if (excluded.has(filename.split('/')[0])) continue;
  const source = await readFile(filename, 'utf8').catch(() => '');
  for (const stalePath of stalePaths) {
    if (source.includes(stalePath)) throw new Error(`${filename} retains stale Dockerfile reference ${stalePath}`);
  }
}

const tempRoot = await mkdtemp(join(tmpdir(), 'mercurion-container-lock-drift-'));
try {
  await writeFile(
    join(tempRoot, 'package.json'),
    JSON.stringify({
      name: 'container-lock-drift-fixture',
      version: '1.0.0',
      private: true,
      dependencies: { 'is-number': '7.0.0' },
    }),
  );
  await writeFile(
    join(tempRoot, 'package-lock.json'),
    JSON.stringify({
      name: 'container-lock-drift-fixture',
      version: '1.0.0',
      lockfileVersion: 3,
      packages: { '': { name: 'container-lock-drift-fixture', version: '1.0.0' } },
    }),
  );

  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(
    npmCommand,
    ['ci', '--ignore-scripts', '--dry-run', '--offline'],
    { cwd: tempRoot, encoding: 'utf8' },
  );
  if (result.status === 0) {
    throw new Error('mismatched manifest/lockfile fixture unexpectedly passed npm ci');
  }
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

console.log(`Validated ${dockerfiles.length} Dockerfiles, ${Object.values(targets).flat().length} targets, stale references, and lockfile drift rejection.`);
