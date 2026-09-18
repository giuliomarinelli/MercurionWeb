import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve('.')
const schemaPath = resolve(root, 'deployment/deployment-schema.json')
const overlayNames = ['development', 'local-staging', 'beta', 'production']
const artifactPaths = [
  'docker_sl/docker-compose.yml',
  'docker_sl/local-staging/docker-compose.yml',
  'docker_sl/releases/beta/docker-compose.yml',
  'docker_sl/releases/prod/docker-compose.yml',
  'k8s/beta/mercurion-web-ng-deploy.yaml',
  'k8s/beta/mercurion-web-node-deploy.yaml',
  'k8s/beta/redis-deploy.yaml',
  'k8s/beta/nats-deploy.yaml',
  'k8s/beta/pg-stack.yaml',
  'k8s/beta/pg-sts.yaml',
  'k8s/beta/mercurion-tox21-deploy.yaml',
  'k8s/beta/nginx-edge-config.yaml',
  'k8s/beta/nginx-edge-deploy.yaml',
  'k8s/beta/nginx-edge-svc.yaml',
  'k8s/core/meili-deploy.yaml',
  'k8s/core/meili-pvc.yaml',
  'k8s/core/meili-seed.yaml',
  'k8s/core/meili-staging-pvc.yaml'
]

const readJson = async path => JSON.parse(await readFile(path, 'utf8'))
const failures = []
const fail = message => failures.push(message)

function validateModel(schema, overlays) {
  const services = schema.services
  if (!services || Object.keys(services).length < 8) fail('canonical schema must define every active logical service')
  const known = new Set(Object.keys(services))
  for (const [id, service] of Object.entries(services)) {
    if (!service.image || !service.ports || !Array.isArray(service.requiredEnv) ||
        !Array.isArray(service.secretRefs) || !service.health || !Array.isArray(service.dependsOn)) {
      fail(`service ${id} is missing a shared contract field`)
    }
    if (new Set(service.requiredEnv).size !== service.requiredEnv.length) fail(`service ${id} duplicates a required variable`)
    for (const dependency of service.dependsOn) if (!known.has(dependency)) fail(`service ${id} depends on unknown service ${dependency}`)
    for (const secret of service.secretRefs) if (!/^[a-z0-9][a-z0-9-]*$/.test(secret)) fail(`service ${id} has invalid secret reference ${secret}`)
  }
  if (!services['web-node']?.secretRefs?.includes('mercurion-web-node-env') ||
      !services['web-node']?.secretRefs?.includes('mercurion-jwt-b64')) {
    fail('web-node must declare both external secret references')
  }
  const identity = schema.imageIdentity
  if (identity?.versionVariable !== 'BUILD_VERSION' || identity?.revisionVariable !== 'BUILD_REVISION') {
    fail('application image identity must derive from BUILD_VERSION and BUILD_REVISION')
  }
  for (const name of overlayNames) {
    const overlay = overlays[name]
    if (!overlay || overlay.environment !== name) fail(`overlay ${name} is missing or has the wrong environment identity`)
    if (!overlay?.services || Object.keys(overlay.services).sort().join() !== [...known].sort().join()) {
      fail(`overlay ${name} must explicitly declare every canonical service`)
      continue
    }
    for (const [id, config] of Object.entries(overlay.services)) {
      if (typeof config.enabled !== 'boolean' || typeof config.env !== 'object') fail(`overlay ${name}/${id} is not explicit`)
      for (const variable of Object.keys(config.env)) {
        if (!services[id].requiredEnv.includes(variable)) fail(`overlay ${name}/${id} supplies unknown variable ${variable}`)
      }
      if (config.target && !['development', 'test', 'staging', 'production'].includes(config.target)) {
        fail(`overlay ${name}/${id} has an unknown build target`)
      }
    }
  }
}

function validateArtifacts(contents, schema) {
  const appImages = schema.imageIdentity.applicationImages
  for (const [path, source] of Object.entries(contents)) {
    if (!source) {
      fail(`missing deployment artifact ${path}`)
      continue
    }
    if (path.includes('mercurion-web-ng') && (!source.includes(`containerPort: ${schema.services['web-ng'].ports.http}`) && !source.includes(`targetPort: ${schema.services['web-ng'].ports.http}`))) fail(`${path} diverges from web-ng port`)
    if (path.includes('mercurion-web-node') && (!source.includes(`containerPort: ${schema.services['web-node'].ports.http}`) && !source.includes(`targetPort: ${schema.services['web-node'].ports.http}`))) fail(`${path} diverges from web-node port`)
    if (path.includes('releases/beta') || path.includes('releases/prod')) {
      for (const image of Object.values(appImages)) if (!source.includes(image)) fail(`${path} does not use canonical application image ${image}`)
      if (!source.includes('BUILD_VERSION') || !source.includes('BUILD_REVISION')) fail(`${path} does not carry immutable build identity`)
    }
    if (path.includes('mercurion-web-node') && !source.includes('mercurion-web-node-env') && !source.includes('APP_ENV')) fail(`${path} omits the web-node configuration contract`)
    if (path.includes('redis-deploy') && !source.includes('redis-credentials')) fail(`${path} omits the Redis secret reference`)
  }
  const combined = Object.entries(contents)
    .filter(([path]) => path !== 'docker_sl/docker-compose.yml')
    .map(([, source]) => source)
    .join('\n')
  if (Object.entries(contents).some(([path, source]) =>
    !path.includes('docker_sl/docker-compose.yml') && /password\s*:\s*(?!\$\{)[^\s#]+/i.test(source)
  )) fail('non-development deployment artifacts contain a literal secret value')
  if (/image:\s*[^\n]*:stale\b/i.test(combined)) fail('deployment artifacts contain a stale generated image reference')
}

export async function validateDeployment({ schema = null, overlays = null, artifacts = null } = {}) {
  const model = schema ?? await readJson(schemaPath)
  const resolvedOverlays = overlays ?? Object.fromEntries(await Promise.all(
    overlayNames.map(async name => [name, await readJson(resolve(root, `deployment/overlays/${name}.json`))])
  ))
  const contents = artifacts ?? Object.fromEntries(await Promise.all(
    artifactPaths.map(async path => [path, await readFile(resolve(root, path), 'utf8').catch(() => '')])
  ))
  failures.length = 0
  validateModel(model, resolvedOverlays)
  validateArtifacts(contents, model)
  if (failures.length) throw new Error(failures.join('\n'))
  return {
    schemaVersion: model.schemaVersion,
    environments: overlayNames.map(environment => ({
      environment,
      services: Object.entries(resolvedOverlays[environment].services)
        .filter(([, config]) => config.enabled)
        .map(([id, config]) => ({ id, target: config.target ?? null }))
    }))
  }
}

if (process.argv[1]?.endsWith('check-deployment-config.mjs')) {
  const first = await validateDeployment()
  const second = await validateDeployment()
  if (JSON.stringify(first) !== JSON.stringify(second)) throw new Error('deployment render is not deterministic')
  console.log(`Validated canonical deployment schema, ${overlayNames.length} overlays, and ${artifactPaths.length} active artifacts.`)
}
