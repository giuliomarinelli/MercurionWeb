import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const argument = process.argv[index];
  if (!argument.startsWith('--')) continue;
  args.set(argument.slice(2), process.argv[index + 1]);
  index += 1;
}

const dockerfile = args.get('dockerfile');
const image = args.get('image');
if (!dockerfile || !image) {
  throw new Error('Usage: node scripts/check-container-runtime.mjs --dockerfile <path> --image <tag>');
}

const source = await readFile(dockerfile, 'utf8');
const isAngular = dockerfile.includes('MercurionWebNg');
const expectedUser = isAngular ? '10101:10101' : '10001:10001';
const expectedPort = isAngular ? '3497' : '8098';

if (!source.includes(`USER ${expectedUser}`)) {
  throw new Error(`${dockerfile} does not declare ${expectedUser}`);
}
if (!source.includes(`EXPOSE ${expectedPort}`)) {
  throw new Error(`${dockerfile} does not expose ${expectedPort}`);
}
if (!/\bCMD\s+\["[^"]+"/.test(source)) {
  throw new Error(`${dockerfile} does not declare an exec-form CMD`);
}

const inspected = spawnSync('docker', ['image', 'inspect', image, '--format', '{{json .Config}}'], {
  encoding: 'utf8',
});
if (inspected.status !== 0) {
  throw new Error(`docker image inspect failed for ${image}: ${inspected.stderr.trim()}`);
}

const config = JSON.parse(inspected.stdout);
if (config.User !== expectedUser) {
  throw new Error(`${image} effective user is ${JSON.stringify(config.User)}, expected ${expectedUser}`);
}
if (!Array.isArray(config.Cmd) || config.Cmd.length === 0 || config.Cmd.some(value => typeof value !== 'string')) {
  throw new Error(`${image} has no standalone exec-form runtime command`);
}
if (config.ExposedPorts === undefined || !Object.keys(config.ExposedPorts).some(port => port.startsWith(`${expectedPort}/`))) {
  throw new Error(`${image} does not expose ${expectedPort}`);
}

console.log(`Validated ${image}: user=${config.User}, cmd=${JSON.stringify(config.Cmd)}, port=${expectedPort}.`);
