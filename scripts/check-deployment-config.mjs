import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve('.')
const schemaPath = resolve(root, 'deployment/deployment-schema.json')
const overlayNames = ['development', 'local-staging', 'preview', 'production']
export const artifactPaths = [
  'docker_sl/docker-compose.yml',
  'docker_sl/local-staging/docker-compose.yml',
  'docker_sl/releases/preview/docker-compose.yml',
  'docker_sl/releases/prod/docker-compose.yml',
  'docker_sl/releases/preview/docker-compose.tox21-build.yml',
  'docker_sl/releases/prod/docker-compose.tox21-build.yml',
  'k8s/preview/mercurion-web-ng-deploy.yaml',
  'k8s/preview/mercurion-web-node-deploy.yaml',
  'k8s/preview/redis-deploy.yaml',
  'k8s/preview/nats-deploy.yaml',
  'k8s/preview/pg-stack.yaml',
  'k8s/preview/pg-sts.yaml',
  'k8s/preview/mercurion-tox21-deploy.yaml',
  'k8s/preview/nginx-edge-config.yaml',
  'k8s/preview/nginx-edge-deploy.yaml',
  'k8s/preview/nginx-edge-svc.yaml',
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
  const tox21 = identity?.componentImages?.tox21
  if (tox21?.versionVariable !== 'TOX21_VERSION' || tox21?.revisionVariable !== 'TOX21_REVISION' ||
      tox21?.image !== '${REGISTRY_IMAGE_MT21}:${TOX21_VERSION}-${TOX21_REVISION}') {
    fail('tox21 image identity must use its own version and source revision')
  }
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
      if (id === 'tox21') {
        const expectedEnvironment = { development: 'development', 'local-staging': 'staging', preview: 'staging', production: 'production' }[name]
        if (config.env.PY_ENV !== expectedEnvironment || config.env.VERSION !== '${TOX21_VERSION}') {
          fail(`overlay ${name}/tox21 has inconsistent environment or version`)
        }
      }
    }
  }
}

// Focused source contracts supplement (not replace) actual Compose config validation.
const normalizeRequiredVariables = source => source.replace(/\$\{([A-Z][A-Z0-9_]*):\?[^}]+\}/g, (_, name) => '${' + name + '}')
function composeService(source, name) {
  const lines = source.split(/\r?\n/)
  const start = lines.indexOf(`  ${name}:`)
  if (start < 0) return ''
  let end = start + 1
  while (end < lines.length && !/^\S|^  \S/.test(lines[end])) end++
  return normalizeRequiredVariables(lines.slice(start + 1, end).join('\n'))
}

function validateTox21(contents, schema) {
  const image = schema.imageIdentity?.componentImages?.tox21?.image ?? ''
  for (const [directory, suffix, target] of [['preview', 'preview', 'staging'], ['prod', 'prod', 'production']]) {
    const path = `docker_sl/releases/${directory}/docker-compose.yml`
    const source = composeService(contents[path] ?? '', `mercurion_tox_21_${suffix}`)
    if (!image || !source.includes(`image: ${image}`) || /\bbuild:/.test(source)) fail(`${path}: tox21 must consume its own image without a source checkout`)
    for (const field of [`PY_ENV: ${target}`, 'VERSION: ${TOX21_VERSION}', 'NATS_URL: ${TOX21_NATS_URL}',
      'user: "10021:10021"', 'read_only: true', 'stop_grace_period: 15s']) {
      if (!source.includes(field)) fail(`${path}: tox21 missing ${field}`)
    }
    const buildPath = `docker_sl/releases/${directory}/docker-compose.tox21-build.yml`
    const build = composeService(contents[buildPath] ?? '', `mercurion_tox_21_${suffix}`)
    for (const field of ['context: ${TOX21_SOURCE_CONTEXT}', 'dockerfile: Dockerfile', `target: ${target}`,
      'model_package: ${TOX21_MODEL_PACKAGE_CONTEXT}', 'BUILD_VERSION: ${TOX21_VERSION}', 'BUILD_REVISION: ${TOX21_REVISION}']) {
      if (!build.includes(field)) fail(`${buildPath}: tox21 build missing ${field}`)
    }
    const args = [...build.matchAll(/^        ([A-Z_]+):/gm)].map(match => match[1]).sort()
    if (args.join() !== 'BUILD_REVISION,BUILD_VERSION') fail(`${buildPath}: unsupported Tox21 build argument`)
  }
  const path = 'k8s/preview/mercurion-tox21-deploy.yaml'
  const source = contents[path] ?? ''
  if (!image || !source.includes(`image: ${image}`) ||
      !/name: VERSION\s+value: "\$\{TOX21_VERSION\}"/.test(source) ||
      !/name: PY_ENV\s+value: "staging"/.test(source)) fail(`${path}: tox21 image/runtime identity or namespace drift`)
  for (const path of Object.keys(contents).filter(path => path.includes('docker-compose'))) {
    if (/MercurionAI|Dockerfile\.staging|MT21_APP_VERSION/.test(contents[path])) fail(`${path}: obsolete Tox21 build reference`)
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
    if (path.endsWith('/docker-compose.yml') && (path.includes('releases/preview') || path.includes('releases/prod'))) {
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
  validateTox21(contents, model)
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
