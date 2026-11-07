// Static only: Compose config does not create networks, volumes or containers.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const base = resolve(root, 'deployment/local-vm')
const image = 'python@sha256:65bd3d9f1d7fa268dd1909973ba7eb4bdf41f6dcf2cfbe76ba9528b170f3fd79'
const schema = JSON.parse(readFileSync(resolve(root, 'deployment/deployment-schema.json'), 'utf8'))
const overlays = Object.fromEntries(['preview', 'production'].map(name => [name,
  JSON.parse(readFileSync(resolve(root, `deployment/overlays/${name}.json`), 'utf8'))]))
const roles = ['web-ng', 'web-node', 'postgres', 'redis', 'nats', 'tox21']
const sharedRoles = ['cloudflared', 'nginx-edge', 'meilisearch', 'meilisearch-ui']
const connections = {
  cloudflared: ['edge', 'tunnel-egress'], 'nginx-edge': ['edge', 'stg-web', 'prod-web'],
  meilisearch: ['stg-search', 'prod-search'], 'meilisearch-ui': ['admin-ui'],
  'web-ng': ['web'], 'web-node': ['web', 'data', 'bus', 'search', 'egress'],
  postgres: ['data'], redis: ['data'], nats: ['bus'], tox21: ['bus', 'egress']
}
const sorted = value => [...value].sort()
const same = (actual, expected, label) => assert.deepEqual(sorted(actual), sorted(expected), label)

export function renderVmProjects() {
  const env = { ...process.env }
  for (const key of Object.keys(env)) if (key.startsWith('COMPOSE_')) delete env[key]
  env.COMPOSE_DISABLE_ENV_FILE = 'true'
  return Object.fromEntries(['shared', 'preview', 'production'].map(name => {
    const file = resolve(base, name, 'compose.yaml')
    assert(!readFileSync(file, 'utf8').includes('${'), `${name}: fixtures must not interpolate operational variables`)
    const output = execFileSync('docker', ['compose', '--env-file', resolve(base, 'validation.env.example'),
      '--profile', '*', '-f', file, 'config', '--format', 'json'],
    { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000 })
    return [name, JSON.parse(output)]
  }))
}

export function validateVmProjects(projects) {
  same(Object.keys(projects), ['shared', 'preview', 'production'], 'project set')
  const owners = new Map()
  const volumeNames = new Set()
  for (const [project, model] of Object.entries(projects)) {
    assert.equal(model.name, `mercurion-${project}`, 'stable project identity')
    const shared = project === 'shared'
    const prefix = project === 'preview' ? 'stg' : 'prod'
    const expectedRoles = shared ? sharedRoles : roles
    const serviceName = role => shared ? role : `${role}-${project}`
    same(Object.keys(model.services), expectedRoles.map(serviceName), `${project}: service set`)
    const expectedNetworks = shared
      ? ['edge', 'tunnel-egress', 'stg-web', 'prod-web', 'stg-search', 'prod-search', 'admin-ui']
      : ['web', 'search', 'data', 'bus', 'egress']
    same(Object.keys(model.networks), expectedNetworks, `${project}: network set`)
    for (const [key, network] of Object.entries(model.networks)) {
      const suffix = key.replaceAll('-', '_')
      const name = shared ? `mercurion_${suffix}` : `mercurion_${prefix}_${suffix}`
      assert.equal(network.name, name, `${project}/${key}: network identity`)
      const external = !shared && ['web', 'search'].includes(key)
      assert.equal(!!network.external, external, `${project}/${key}: network owner`)
      if (external) {
        same(Object.keys(network).filter(k => k !== 'ipam'), ['name', 'external'], 'external network attributes')
        assert.deepEqual(network.ipam ?? {}, {}, 'no external IPAM configuration')
      } else {
        assert(!owners.has(name), `duplicate network owner ${name}`)
        owners.set(name, project)
        assert.equal(network.driver, 'bridge', 'bridge driver')
        assert.equal(!!network.internal, !['tunnel-egress', 'egress'].includes(key), `${project}/${key}: egress policy`)
        same(Object.keys(network).filter(k => !['internal', 'ipam'].includes(k)), ['name', 'driver'], 'unexpected network setting')
        assert.deepEqual(network.ipam ?? {}, {}, 'no guessed subnets')
      }
    }
    const expectedVolumes = shared ? ['meili-data'] : ['postgres-data', 'redis-data', 'nats-data']
    same(Object.keys(model.volumes), expectedVolumes, `${project}: volume set`)
    for (const [key, volume] of Object.entries(model.volumes)) {
      assert.deepEqual(volume, { name: `mercurion_${project}_${key.replace('-data', '')}` }, 'volume identity')
      assert(!volumeNames.has(volume.name), 'cross-project volume reuse')
      volumeNames.add(volume.name)
    }
    for (const role of expectedRoles) {
      const id = serviceName(role)
      const service = model.services[id]
      const canonical = role === 'nginx-edge' ? 'nginx' : role
      if (!['cloudflared', 'meilisearch-ui'].includes(role)) assert(schema.services[canonical], `unknown canonical role ${role}`)
      const allowed = ['profiles', 'restart', 'cap_drop', 'cpus', 'command', 'entrypoint', 'image', 'mem_limit',
        'networks', 'pids_limit', 'pull_policy', 'read_only', 'security_opt', 'user', 'volumes', 'expose', 'environment',
        'x-mercurion-canonical-service']
      for (const key of Object.keys(service)) assert(allowed.includes(key), `${project}/${id}: forbidden setting ${key}`)
      assert.equal(service.image, image, 'fixture image must stay pinned')
      assert.equal(service.pull_policy, 'never', 'no implicit pull')
      assert.equal(service.user, '65534:65534', 'fixture non-root user')
      assert.equal(service.read_only, true, 'read-only root')
      assert.deepEqual(service.cap_drop, ['ALL'], 'drop capabilities')
      assert.deepEqual(service.security_opt, ['no-new-privileges:true'], 'no privilege escalation')
      assert.equal(service.restart, 'no', 'no persistent fixture restart')
      assert.equal(String(service.mem_limit), '67108864', 'fixture memory budget')
      assert.equal(service.cpus, 0.25, 'fixture CPU budget')
      assert.equal(service.pids_limit, 32, 'fixture PID budget')
      assert.deepEqual(service.entrypoint, ['python'], 'fixture entrypoint')
      assert.deepEqual(service.command, ['-B', '-c', 'import time; time.sleep(600)'], 'bounded inert fixture')
      assert.deepEqual(service.profiles, [role === 'meilisearch-ui' ? 'admin-fixture' : 'topology-fixture'], 'opt-in fixture profile')
      same(Object.keys(service.networks), connections[role], `${project}/${id}: network membership`)
      for (const config of Object.values(service.networks)) {
        if (config && Object.keys(config).length) assert.deepEqual(config, { aliases: [id] }, `${project}/${id}: qualified DNS alias`)
      }
      if (['web-ng', 'web-node', 'nats'].includes(role)) {
        const key = role === 'nats' ? 'bus' : 'web'
        assert.deepEqual(service.networks[key]?.aliases, [id], 'explicit environment-qualified alias')
      }
      let environment = {}
      if (['web-ng', 'web-node'].includes(role)) environment = overlays[project].services[role].env
      if (role === 'tox21') environment = {
        PY_ENV: overlays[project].services.tox21.env.PY_ENV,
        NATS_URL: `nats://nats-${project}:${schema.services.nats.ports.client}`, VERSION: 'topology-fixture'
      }
      assert.deepEqual(service.environment ?? {}, environment, `${project}/${id}: canonical runtime environment`)
      const port = role === 'nginx-edge' ? [schema.services.nginx.ports.http]
        : role === 'meilisearch-ui' ? [24900] : Object.values(schema.services[canonical]?.ports ?? {})
      same(service.expose ?? [], port.map(String), `${project}/${id}: canonical intended ports`)
      const volume = shared ? (role === 'meilisearch' ? 'meili-data' : null)
        : ['postgres', 'redis', 'nats'].includes(role) ? `${role}-data` : null
      if (volume) {
        assert.deepEqual(service.volumes, [{ type: 'volume', source: volume, target: '/fixture-data', volume: {} }], 'fixture volume binding')
      } else assert(!service.volumes?.length, 'unexpected service mount')
    }
  }
  for (const model of Object.values(projects)) for (const network of Object.values(model.networks)) {
    if (network.external) assert.equal(owners.get(network.name), 'shared', 'shared owns cross-project networks')
  }
  assert.equal(owners.size, 13, 'thirteen distinct physical networks')
  return { projects: 3, services: 16, networks: owners.size, volumes: volumeNames.size }
}

function selfTest(projects) {
  const cases = [
    ['published port', p => { p.preview.services['web-node-preview'].ports = [{ target: 8098, published: '8098' }] }],
    ['host network', p => { p.production.services['tox21-production'].network_mode = 'host' }],
    ['production network in preview', p => { p.preview.networks.data.name = 'mercurion_prod_data' }],
    ['internal network opened', p => { p.production.networks.data.internal = false }],
    ['wrong external owner', p => { p.preview.networks.web.external = false }],
    ['cross-environment volume', p => { p.preview.volumes['postgres-data'].name = 'mercurion_production_postgres' }],
    ['wrong preview environment', p => { p.preview.services['web-ng-preview'].environment.APP_ENV = 'production' }],
    ['secret mount', p => { p.shared.services.cloudflared.volumes = [{ type: 'bind', source: '/secret', target: '/secret' }] }],
    ['unapproved application image', p => { p.shared.services['meilisearch-ui'].image = 'eyeix/meilisearch-ui:latest' }],
    ['implicit default network', p => { p.preview.services['redis-preview'].networks = { default: null } }],
    ['duplicate singleton', p => { p.preview.services.meilisearch = p.shared.services.meilisearch }]
  ]
  for (const [name, mutate] of cases) {
    const changed = structuredClone(projects)
    mutate(changed)
    assert.throws(() => validateVmProjects(changed), undefined, `negative fixture not rejected: ${name}`)
  }
  return cases.length
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert(process.argv.slice(2).every(arg => arg === '--self-test'), 'only --self-test is accepted')
  const projects = renderVmProjects()
  const summary = validateVmProjects(projects)
  console.log(`VM Compose static validation passed: ${JSON.stringify(summary)}. No runtime evidence.`)
  if (process.argv.includes('--self-test')) console.log(`Negative topology fixtures rejected: ${selfTest(projects)}.`)
}
