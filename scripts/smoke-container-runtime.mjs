import { spawnSync } from 'node:child_process';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const argument = process.argv[index];
  if (!argument.startsWith('--')) continue;
  args.set(argument.slice(2), process.argv[index + 1]);
  index += 1;
}

const image = args.get('image');
const envFile = args.get('env-file');
const timeoutMs = Number(args.get('timeout-ms') ?? 10000);
if (!image) {
  throw new Error('Usage: node scripts/smoke-container-runtime.mjs --image <tag> [--env-file <path>]');
}

const name = `mercurion-runtime-smoke-${process.pid}`;
const runArgs = [
  'run',
  '--detach',
  '--name',
  name,
  '--read-only',
  '--tmpfs',
  '/tmp:rw,noexec,nosuid,size=64m',
  '--security-opt',
  'no-new-privileges:true',
  '--cap-drop',
  'ALL',
];
if (envFile) runArgs.push('--env-file', envFile);
runArgs.push(image);

const started = spawnSync('docker', runArgs, { encoding: 'utf8' });
if (started.status !== 0) {
  throw new Error(`docker run failed for ${image}: ${started.stderr.trim()}`);
}

const containerId = started.stdout.trim();
try {
  const deadline = Date.now() + timeoutMs;
  let running = false;
  while (Date.now() < deadline) {
    const state = spawnSync('docker', ['inspect', '--format', '{{.State.Running}}', containerId], {
      encoding: 'utf8',
    });
    if (state.status !== 0) {
      throw new Error(`docker inspect failed for ${containerId}: ${state.stderr.trim()}`);
    }
    if (state.stdout.trim() === 'true') {
      running = true;
      break;
    }
  }
  if (!running) {
    const logs = spawnSync('docker', ['logs', containerId], { encoding: 'utf8' });
    throw new Error(`container exited before the ${timeoutMs}ms smoke window:\n${logs.stdout}${logs.stderr}`);
  }
  console.log(`Started ${image} with its declared command for ${timeoutMs}ms.`);
} finally {
  spawnSync('docker', ['stop', '--time', '5', containerId], { encoding: 'utf8' });
  spawnSync('docker', ['rm', '--force', containerId], { encoding: 'utf8' });
}
