// Local transport integration only. All broker credentials are synthetic.
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { resolve, dirname, join, basename } from 'node:path'
import { randomUUID } from 'node:crypto'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const image = 'nats@sha256:77a161c7d888a1791d5a46b50cd87a2f8466ce40a33cbb51238d227ace01e35a'
const nodeImage = 'node@sha256:0e1754758c2df4cfa3e68d59e2e1b7374bb7fd9ea6328eaaacf15cc934af8202'
const transportFile = resolve(root, 'MercurionWebNode/dist/src/nats-transport.js')
if (statSync(transportFile).mtimeMs < statSync(resolve(root, 'MercurionWebNode/src/nats-transport.ts')).mtimeMs) {
  throw new Error('Build Nest before running the transport integration check')
}
const runId = randomUUID()
const name = `nats-auth-${runId}`
const labelName = 'mercurion.nats-auth-run'
const docker = (...args) => execFileSync('docker', ['--context', 'desktop-linux', ...args], {
  encoding: 'utf8', timeout: 120_000, stdio: ['ignore', 'pipe', 'pipe']
}).trim()
docker('image', 'inspect', image, nodeImage)
const directory = mkdtempSync(join(tmpdir(), 'mercurion-nats-auth-'))
let network = false
try {
  docker('network', 'create', '--internal', '--label', `${labelName}=${runId}`, name)
  network = true
  for (const environment of ['staging', 'production', 'legacy']) {
    const configuration = { port: 4222 }
    if (environment !== 'legacy') configuration.authorization = { users: [
      { user: `nest_${environment}`, password: `synthetic-${environment}-password` }
    ] }
    const path = join(directory, `${environment}.json`)
    writeFileSync(path, JSON.stringify(configuration))
    docker('run', '-d', '--pull', 'never', '--name', `${name}-${environment}`, '--label', `${labelName}=${runId}`,
      '--network', name, '--network-alias', `nats-${environment}`, '--user', '10001:10001',
      '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true',
      '--memory', '64m', '--cpus', '0.25', '--pids-limit', '32',
      '--mount', `type=bind,src=${path},dst=/qa.conf,readonly`, image, '--config', '/qa.conf')
  }
  const result = spawnSync('docker', ['--context', 'desktop-linux', 'run', '--pull', 'never',
    '--name', `${name}-client`, '--label', `${labelName}=${runId}`, '--network', name,
    '--user', '10001:10001', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true',
    '--memory', '256m', '--cpus', '1', '--pids-limit', '64',
    '--mount', `type=bind,src=${transportFile},dst=/qa/nats-transport.js,readonly`,
    '--mount', `type=bind,src=${resolve(root, 'node_modules')},dst=/root_deps,readonly`,
    '--mount', `type=bind,src=${resolve(root, 'MercurionWebNode/node_modules')},dst=/node_deps,readonly`,
    '--mount', `type=bind,src=${resolve(root, 'scripts/fixtures/nats-client-auth.cjs')},dst=/qa/probe.cjs,readonly`,
    '--env', 'NODE_PATH=/node_deps:/root_deps', nodeImage, 'node', '/qa/probe.cjs'
  ], { encoding: 'utf8', timeout: 90_000 })
  if (result.error || result.status !== 0) {
    process.stderr.write(result.stderr ?? '')
    throw new Error('NATS synthetic authentication probe failed')
  }
  process.stdout.write(result.stdout)
} finally {
  try {
    const ownedIds = docker('ps', '-aq', '--filter', `label=${labelName}=${runId}`).split(/\s+/).filter(Boolean)
    for (const id of ownedIds) docker('rm', '--force', id)
    if (network) docker('network', 'rm', name)
  } finally {
    if (dirname(directory) !== tmpdir() || !basename(directory).startsWith('mercurion-nats-auth-')) {
      throw new Error('Refusing cleanup outside the owned temporary directory')
    }
    rmSync(directory, { recursive: true, force: true })
  }
}
