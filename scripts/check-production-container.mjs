import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const argument = process.argv[index];
  if (!argument.startsWith('--')) continue;
  args.set(argument.slice(2), process.argv[index + 1]);
  index += 1;
}

const image = args.get('image');
const reportDirectory = resolve(args.get('report-dir') ?? 'reports/containers');
if (!image) {
  throw new Error('Usage: node scripts/check-production-container.mjs --image <tag> [--report-dir <path>]');
}

const run = (command, commandArgs, options = {}) => {
  const result = spawnSync(command, commandArgs, { encoding: 'utf8', ...options });
  if (result.status !== 0) {
    throw new Error(`${command} ${commandArgs.join(' ')} failed:\n${result.stdout}${result.stderr}`);
  }
  return result.stdout.trim();
};

const inspect = JSON.parse(run('docker', ['image', 'inspect', image, '--format', '{{json .}}']));
const digest = inspect.Id;
if (!/^sha256:[0-9a-f]{64}$/.test(digest)) {
  throw new Error(`Image ${image} did not resolve to an immutable digest: ${digest}`);
}

const packageManifest = JSON.parse(await readFile('MercurionWebNode/package.json', 'utf8'));
const directDevDependencies = Object.keys(packageManifest.devDependencies ?? {});
const requiredRuntimeFiles = [
  'dist/src/main.js',
  'dist/src/schema.graphql',
  'dist/src/app_modules/notification/email-templates/confirmation.hbs',
  'dist/src/app_modules/notification/email-templates/layouts/email-shell.hbs',
  'dist/src/app_modules/notification/email-templates/partials/email-footer.hbs',
  'dist/src/persistence/migrations/1789580000000-CanonicalizeHelpPublicIdSources.js',
  'assets-root/og/mercurion-og.png',
  'packages/rest-contracts/dist/index.js',
  'packages/socket-contracts/cjs/index.js',
];
const requiredModules = ['argon2', 'fastify', 'graphql', 'pg', 'typeorm'];

const runtimeCheck = `
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = '/usr/src/app';
const requiredFiles = ${JSON.stringify(requiredRuntimeFiles)};
const devDependencies = ${JSON.stringify(directDevDependencies)};
const requiredModules = ${JSON.stringify(requiredModules)};
const missing = requiredFiles.filter(file => !fs.existsSync(path.join(root, file)));
const presentDevDependencies = devDependencies.filter(name => fs.existsSync(path.join(root, 'node_modules', name)));
const missingModules = requiredModules.filter(name => {
  try { require(name); return false; } catch { return true; }
});
const dependencyTree = spawnSync('npm', ['ls', '--omit=dev', '--depth=0', '--json'], {
  cwd: root,
  encoding: 'utf8',
});
const installedDirectDependencies = Object.keys(JSON.parse(dependencyTree.stdout).dependencies ?? {});
const installedDevDependencies = devDependencies.filter(name => installedDirectDependencies.includes(name));
const forbidden = [];
const files = [];
function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(file);
    else files.push(file);
  }
}
visit(root);
for (const file of files) {
  if ((file.startsWith(root + '/dist/') || file.startsWith(root + '/packages/')) &&
    (/\\.(?:map|d\\.ts|ts|tsbuildinfo)$/.test(file) || file.includes('/.npm/'))) forbidden.push(file);
}
if (missing.length || installedDevDependencies.length || missingModules.length || forbidden.length) {
  console.error(JSON.stringify({ missing, presentDevDependencies, installedDevDependencies, missingModules, forbidden: forbidden.slice(0, 20) }));
  process.exit(1);
}
console.log(JSON.stringify({
  topLevelNodeModules: fs.readdirSync(path.join(root, 'node_modules')).length,
  requiredFiles: requiredFiles.length,
  requiredModules: requiredModules.length,
}));
`;
const runtimeInventory = JSON.parse(run('docker', [
  'run', '--rm', '--entrypoint', 'node', image, '-e', runtimeCheck,
]));

await mkdir(reportDirectory, { recursive: true });
const sbomPath = resolve(reportDirectory, 'nest-production.sbom.json');
const vulnerabilityPath = resolve(reportDirectory, 'nest-production.vulnerability.sarif');
run('docker', ['scout', 'sbom', '--output', sbomPath, `local://${image}`]);
const sbom = JSON.parse(await readFile(sbomPath, 'utf8'));
const sbomDigest = sbom.source?.image?.digest;
if (sbomDigest !== digest) {
  throw new Error(`SBOM digest ${sbomDigest} does not match image digest ${digest}`);
}
run('docker', [
  'scout', 'cves', '--format', 'sarif', '--output', vulnerabilityPath, `local://${image}`,
]);

const inventory = {
  image,
  digest,
  sizeBytes: inspect.Size,
  packageCount: Array.isArray(sbom.artifacts) ? sbom.artifacts.length : 0,
  runtimeInventory,
  sbom: sbomPath,
  vulnerabilityScan: vulnerabilityPath,
};
await writeFile(resolve(reportDirectory, 'nest-production.inventory.json'), `${JSON.stringify(inventory, null, 2)}\n`);
console.log(JSON.stringify(inventory));
