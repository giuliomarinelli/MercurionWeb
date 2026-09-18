import { readFile } from 'node:fs/promises'
import { validateDeployment } from './check-deployment-config.mjs'

const schema = JSON.parse(await readFile('deployment/deployment-schema.json', 'utf8'))
const overlays = {}
for (const name of ['development', 'local-staging', 'beta', 'production']) {
  overlays[name] = JSON.parse(await readFile(`deployment/overlays/${name}.json`, 'utf8'))
}
const artifacts = {}
for (const path of [
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
]) artifacts[path] = await readFile(path, 'utf8')

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
console.log('Deployment negative fixtures rejected unknown variables, port drift, missing secrets, stale manifests, and image mismatch.')
