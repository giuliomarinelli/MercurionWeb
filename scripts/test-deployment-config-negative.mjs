import { readFile } from 'node:fs/promises'
import { artifactPaths, validateDeployment } from './check-deployment-config.mjs'

const schema = JSON.parse(await readFile('deployment/deployment-schema.json', 'utf8'))
const overlays = {}
for (const name of ['development', 'local-staging', 'beta', 'production']) {
  overlays[name] = JSON.parse(await readFile(`deployment/overlays/${name}.json`, 'utf8'))
}
const artifacts = {}
for (const path of artifactPaths) artifacts[path] = await readFile(path, 'utf8')

async function rejects(label, mutate) {
  const copy = structuredClone({ schema, overlays, artifacts })
  mutate(copy)
  try {
    await validateDeployment(copy)
    throw new Error(`${label} fixture unexpectedly passed`)
  } catch (error) {
    if (error.message.includes('unexpectedly passed')) throw error
  }
}

await rejects('unknown variable', ({ overlays: value }) => {
  value.beta.services['web-node'].env.UNKNOWN_VARIABLE = '${bad}'
})
await rejects('port mismatch', ({ schema: value }) => {
  value.services['web-node'].ports.http = 8999
})
await rejects('missing secret reference', ({ schema: value }) => {
  value.services['web-node'].secretRefs = []
})
await rejects('stale generated manifest', ({ artifacts: value }) => {
  value['docker_sl/releases/beta/docker-compose.yml'] = value['docker_sl/releases/beta/docker-compose.yml']
    .replace('${REGISTRY_IMAGE_NG}:${BUILD_VERSION}-${BUILD_REVISION}', 'example/mercurion-web-ng:stale')
})
await rejects('cross-environment image mismatch', ({ schema: value }) => {
  value.imageIdentity.applicationImages['web-node'] = 'wrong/image:${BUILD_VERSION}-${BUILD_REVISION}'
})
await rejects('Tox21 uses Web revision', ({ schema: value }) => {
  value.imageIdentity.componentImages.tox21.revisionVariable = 'BUILD_REVISION'
})
await rejects('Tox21 namespace drift', ({ overlays: value }) => {
  value.beta.services.tox21.env.PY_ENV = 'production'
})
await rejects('Tox21 checkout required by base', ({ artifacts: value }) => {
  const path = 'docker_sl/releases/beta/docker-compose.yml'
  value[path] = value[path].replace('  mercurion_tox_21_beta:', '  mercurion_tox_21_beta:\n    build: ../MercurionTox21')
})
await rejects('Tox21 unused build argument', ({ artifacts: value }) => {
  const path = 'docker_sl/releases/beta/docker-compose.tox21-build.yml'
  value[path] = value[path].replace('      args:', '      args:\n        APP_VERSION: ignored')
})
await rejects('Tox21 package context missing', ({ artifacts: value }) => {
  const path = 'docker_sl/releases/prod/docker-compose.tox21-build.yml'
  value[path] = value[path].replace('model_package:', 'wrong_context:')
})
await rejects('Tox21 Kubernetes version drift', ({ artifacts: value }) => {
  const path = 'k8s/beta/mercurion-tox21-deploy.yaml'
  value[path] = value[path].replace('value: "${TOX21_VERSION}"', 'value: "old-version"')
})
console.log('Deployment negative fixtures passed: five existing guards plus six Tox21 identity, namespace, build and package guards.')
