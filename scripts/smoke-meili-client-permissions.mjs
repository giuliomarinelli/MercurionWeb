// Local synthetic authorization smoke. Never targets a pre-existing server or the VM.
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'
import { randomUUID } from 'node:crypto'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const image = 'getmeili/meilisearch@sha256:8cd411ba5d9ec2dfce02e241305208eebacce0fd74a72bece21cadd03dc566ce'
const nodeImage = 'node@sha256:0e1754758c2df4cfa3e68d59e2e1b7374bb7fd9ea6328eaaacf15cc934af8202'
const runId = randomUUID()
const name = `meili-permissions-${runId}`
const clientName = `${name}-client`
const labelName = 'mercurion.meili-permissions-run'
const key = `synthetic-${randomUUID()}`
const docker = (...args) => execFileSync('docker', ['--context', 'desktop-linux', ...args], {
  encoding: 'utf8', timeout: 120_000, stdio: ['ignore', 'pipe', 'pipe']
}).trim()
// Preflight before mutation: already installed immutable images only.
docker('image', 'inspect', image, nodeImage)
let network = false
try {
  docker('network', 'create', '--internal', '--label', `${labelName}=${runId}`, name)
  network = true
  docker('run', '-d', '--pull', 'never', '--name', name, '--label', `${labelName}=${runId}`,
    '--network', name, '--network-alias', 'meili', '--user', '10001:10001',
    '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true',
    '--memory', '512m', '--cpus', '1', '--pids-limit', '128',
    '--env', `MEILI_MASTER_KEY=${key}`, '--env', 'MEILI_NO_ANALYTICS=true',
    '--env', 'MEILI_MAX_INDEXING_MEMORY=64Mb', '--env', 'MEILI_MAX_INDEXING_THREADS=1',
    '--tmpfs', '/meili_data:rw,size=128m,uid=10001,gid=10001,mode=700',
    '--tmpfs', '/tmp:rw,noexec,nosuid,size=16m,mode=1777', image)
  const result = spawnSync('docker', ['--context', 'desktop-linux', 'run', '--pull', 'never',
    '--name', clientName, '--label', `${labelName}=${runId}`, '--network', name,
    '--user', '10001:10001', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true',
    '--memory', '128m', '--cpus', '0.5', '--pids-limit', '32',
    '--mount', `type=bind,src=${resolve(root, 'node_modules/meilisearch/dist/umd/index.min.js')},dst=/qa/meilisearch.cjs,readonly`,
    '--mount', `type=bind,src=${resolve(root, 'scripts/fixtures/meili-client-permissions.cjs')},dst=/qa/probe.cjs,readonly`,
    '--env', `QA_MEILI_KEY=${key}`, nodeImage, 'node', '/qa/probe.cjs'
  ], { encoding: 'utf8', timeout: 90_000 })
  if (result.error || result.status !== 0) {
    // Probe diagnostics contain only a fixed phase, counters and error codes.
    process.stderr.write(result.stderr ?? '')
    process.stderr.write(docker('inspect', '--format', '{{json .State}}', name) + '\n')
    throw new Error('Meilisearch synthetic permission probe failed')
  }
  process.stdout.write(result.stdout)
} finally {
  // Own label catches partial `docker run` failures and timed-out client containers.
  const ownedIds = docker('ps', '-aq', '--filter', `label=${labelName}=${runId}`).split(/\s+/).filter(Boolean)
  for (const id of ownedIds) docker('rm', '--force', id)
  if (network) docker('network', 'rm', name)
}
