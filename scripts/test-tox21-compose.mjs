// Requires Docker Compose, but never starts/builds/pulls any service or image.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'

const root = resolve('.')
const temporary = realpathSync(mkdtempSync(join(tmpdir(), 'mercurion-tox21-compose-')))
const emptyEnv = join(temporary, 'empty.env')
writeFileSync(emptyEnv, '')
const webRevision = 'a'.repeat(40)
const toxRevision = 'b'.repeat(40)
const fixture = {
  ...process.env,
  BUILD_VERSION: 'web-qa', BUILD_REVISION: webRevision,
  REGISTRY_IMAGE_NG: 'fixture/web-ng', REGISTRY_IMAGE_NODE: 'fixture/web-node',
  REGISTRY_IMAGE_MT21: 'fixture/tox21', TOX21_VERSION: 'tox-qa', TOX21_REVISION: toxRevision,
  TOX21_NATS_URL: 'nats://fixture-broker:4222', REGISTRY_IMAGE_NGINX: 'fixture/nginx',
  NGINX_TAG: 'qa', APP_VERSION: 'qa', PGV_TAG: 'qa'
}
delete fixture.TOX21_SOURCE_CONTEXT
delete fixture.TOX21_MODEL_PACKAGE_CONTEXT

function config(files, env = fixture) {
  return JSON.parse(execFileSync('docker', ['compose', '--env-file', emptyEnv,
    ...files.flatMap(file => ['-f', resolve(root, file)]), 'config', '--format', 'json'],
  { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }))
}

try {
  for (const [directory, suffix, target] of [['beta', 'beta', 'staging'], ['prod', 'prod', 'production']]) {
    const base = `docker_sl/releases/${directory}/docker-compose.yml`
    const override = `docker_sl/releases/${directory}/docker-compose.tox21-build.yml`
    const name = `mercurion_tox_21_${suffix}`
    const service = config([base]).services[name]
    assert.equal(service.image, `fixture/tox21:tox-qa-${toxRevision}`)
    assert.equal(service.build, undefined, 'Image consumer must not need the Tox21 checkout')
    assert.deepEqual(service.environment, { PY_ENV: target, VERSION: 'tox-qa', NATS_URL: 'nats://fixture-broker:4222' })
    assert.equal(service.user, '10021:10021')
    assert.equal(service.read_only, true)
    assert.equal(service.init, true)
    assert.equal(service.stop_grace_period, '15s')
    assert.deepEqual(service.cap_drop, ['ALL'])
    const env = { ...fixture, TOX21_SOURCE_CONTEXT: join(temporary, 'independent-source'),
      TOX21_MODEL_PACKAGE_CONTEXT: join(temporary, 'independent-model') }
    const built = config([base, override], env).services[name]
    assert.equal(built.image, service.image)
    assert.equal(built.build.target, target)
    assert.equal(built.build.dockerfile, 'Dockerfile')
    assert.equal(resolve(built.build.context), resolve(env.TOX21_SOURCE_CONTEXT))
    assert.equal(resolve(built.build.additional_contexts.model_package), resolve(env.TOX21_MODEL_PACKAGE_CONTEXT))
    assert.deepEqual(built.build.args, { BUILD_VERSION: 'tox-qa', BUILD_REVISION: toxRevision })
    assert.throws(() => config([base, override]), /TOX21_SOURCE_CONTEXT/)
    assert.throws(() => config([base, override], { ...fixture, TOX21_SOURCE_CONTEXT: env.TOX21_SOURCE_CONTEXT }), /TOX21_MODEL_PACKAGE_CONTEXT/)
    for (const variable of ['REGISTRY_IMAGE_MT21', 'TOX21_VERSION', 'TOX21_REVISION', 'TOX21_NATS_URL']) {
      const missing = { ...fixture }
      delete missing[variable]
      assert.throws(() => config([base], missing), new RegExp(variable))
    }
  }
  console.log('Compose passed: beta/production image-only and optional build projections; twelve missing-input cases rejected. No sibling checkout or services used.')
} finally {
  // Verify the resolved Windows target before deleting only this test's temporary directory.
  if (dirname(temporary) !== realpathSync(tmpdir()) || !basename(temporary).startsWith('mercurion-tox21-compose-')) {
    throw new Error('Unsafe temporary cleanup path')
  }
  rmSync(temporary, { recursive: true })
}
