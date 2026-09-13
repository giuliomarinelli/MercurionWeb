import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const dockerfiles = [
  'MercurionWebNg/Dockerfile',
  'MercurionWebNg/Dockerfile.staging',
  'MercurionWebNg/Dockerfile.test',
  'MercurionWebNode/Dockerfile',
  'MercurionWebNode/Dockerfile.staging',
  'MercurionWebNode/Dockerfile.test',
];

const requiredToolchain = [
  'FROM node:22.16.0-alpine AS',
  'test "$(node --version)" = "v22.16.0"',
  'test "$(npm --version)" = "10.9.2"',
];

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
}

const ignore = await readFile('.dockerignore', 'utf8');
for (const token of ['**/node_modules', '**/.env.*', '**/*.pem']) {
  if (!ignore.includes(token)) {
    throw new Error(`.dockerignore is missing ${token}`);
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

console.log(`Validated ${dockerfiles.length} Dockerfiles and lockfile drift rejection.`);
