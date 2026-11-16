const fs = require('node:fs/promises')
const crypto = require('node:crypto')
const { load, writerPaths, Environment, TokenType, respond } = require('./common.cjs')
const { JwtKeyFileRegistry } = load('app_modules/auth/keys/jwt-key-registry.js')
const { JwtKeyAdministration } = load('app_modules/auth/keys/jwt-key-administration.js')
const { jwtKeyAlgorithms } = load('app_modules/auth/keys/jwt-key-manifest.js')
const registry = new JwtKeyFileRegistry(writerPaths, Environment.Staging)
let materials = new Map(), original, unavailable = false, materialCalls = 0
const source = { resolve: async request => {
  materialCalls++
  if (unavailable) throw new Error('Synthetic manager unavailable')
  const value = materials.get(request.material.reference)
  if (!value || request.environment !== Environment.Staging || request.material.version !== 'v1') throw new Error('Unknown synthetic binding')
  return value
} }
const admin = new JwtKeyAdministration(registry, Environment.Staging, source)
async function verifyLocalAdapter() {
  const { ConfigService } = require('@nestjs/config')
  const { JwtService } = require('@nestjs/jwt')
  const { JwtKeyRing } = load('app_modules/auth/keys/jwt-key-ring.js')
  const { migrateLocalJwtKeys, generateLocalJwtKey } = load('app_modules/auth/keys/jwt-key-local.setup.js')
  const { createLocalJwtKeyRuntime } = load('app_modules/auth/keys/jwt-key-local.source.js')
  const root = await fs.mkdtemp('/tmp/mercurion-local-')
  let ring
  try {
    const fields = purpose => purpose === TokenType.ws_AccessToken ? 'ws_accessToken' : purpose === TokenType.SSO_PreAuthorizationToken
      ? 'sso_preAuthorizationToken' : purpose[0].toLowerCase() + purpose.slice(1)
    const config = new ConfigService({ App: { env: Environment.Development }, Session: { shortSessionLasting: 120, persistentSessionLasting: 600 },
      Jwt: Object.fromEntries(Object.values(TokenType).map(purpose => [fields(purpose), { expiresInMs: 120000, secret: crypto.randomBytes(64).toString('base64') }])) })
    const pair = () => crypto.generateKeyPairSync('rsa', { modulusLength: 2048, publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } })
    const input = { config, directory: `${root}/store`, at: new Date().toISOString(), http: pair(), ws: pair() }
    const preview = await migrateLocalJwtKeys(input)
    await migrateLocalJwtKeys(input, preview.digest)
    const configPath = `${root}/store/settings.json`, runtime = await createLocalJwtKeyRuntime(configPath, Environment.Development), jwt = new JwtService()
    ring = new JwtKeyRing(runtime, Environment.Development, jwt)
    await ring.initialize()
    const claims = purpose => ({ iss: 'local-qa', aud: 'local-qa', sub: 'opaque-local', jti: crypto.randomUUID(),
      sid: '11111111-1111-4111-8111-111111111111', typ: purpose, scp: '', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 60 })
    const legacy = await jwt.signAsync(claims(TokenType.ActivationToken), { algorithm: 'HS512', secret: config.get('Jwt.activationToken.secret') })
    await ring.verify(legacy, TokenType.ActivationToken, { issuer: 'local-qa', audience: 'local-qa' })
    const localRegistry = new JwtKeyFileRegistry(runtime.localPaths, Environment.Development), localAdmin = new JwtKeyAdministration(localRegistry, Environment.Development, runtime.materialSource)
    for (const purpose of [TokenType.AccessToken, TokenType.ActivationToken]) {
      const request = await generateLocalJwtKey(configPath, Environment.Development, purpose, `${purpose}-local-v2`)
      await localAdmin.change(request, (await localAdmin.change(request)).digest)
      const activation = { timestamp: new Date().toISOString(), expectedRevision: (await localRegistry.read()).revision, operator: 'local-qa', reason: 'Synthetic local activation',
        command: { kind: 'activate', purpose, kid: `${purpose}-local-v2`, distributionConfirmed: true, verifyUntil: new Date(Date.now() + 86400000).toISOString() } }
      await localAdmin.change(activation, (await localAdmin.change(activation)).digest)
      const token = await ring.sign(claims(purpose), purpose)
      if (jwt.decode(token, { complete: true }).header.kid !== `${purpose}-local-v2`) throw new Error('Local activation failed')
      await ring.verify(token, purpose, { issuer: 'local-qa', audience: 'local-qa' })
    }
    return true
  } finally {
    ring?.close()
    if (!root.startsWith('/tmp/mercurion-local-')) throw new Error('Unsafe fixture cleanup')
    await fs.rm(root, { recursive: true, force: true })
  }
}
function key(purpose, suffix) {
  const kid = `${purpose}-${suffix}`, algorithm = jwtKeyAlgorithms[purpose]
  const value = { kid, material: { reference: kid, version: 'v1' }, state: 'prepared', createdAt: new Date().toISOString() }
  if (algorithm === 'RS256') {
    const pair = crypto.generateKeyPairSync('rsa', { modulusLength: 2048, publicKeyEncoding: { format: 'pem', type: 'spki' }, privateKeyEncoding: { format: 'pem', type: 'pkcs8' } })
    value.publicKeyPem = pair.publicKey
    materials.set(kid, { algorithm, encoding: 'base64-pem', publicKey: Buffer.from(pair.publicKey).toString('base64'), privateKey: Buffer.from(pair.privateKey).toString('base64') })
  } else materials.set(kid, { algorithm, encoding: 'base64', secret: crypto.randomBytes(64).toString('base64') })
  return value
}
async function change(command) {
  const request = { expectedRevision: (await registry.read()).revision, timestamp: new Date().toISOString(), operator: 'linux-qa', reason: 'Synthetic isolated QA', command }
  const preview = await admin.change(request)
  await admin.change(request, preview.digest)
  return preview
}
respond(async (action, data) => {
  if (action === 'boot') {
    if (data?.resume) { materials = new Map(data.resume.materials); original = data.resume.original; return true }
    const domains = Object.values(TokenType).map(purpose => {
      const entry = key(purpose, 'v1')
      return { purpose, algorithm: jwtKeyAlgorithms[purpose], issuance: 'enabled', activeKid: entry.kid,
        keys: [{ ...entry, state: 'active', activatedAt: new Date().toISOString() }] }
    })
    original = { schemaVersion: 1, environment: Environment.Staging, revision: 1, previousRevision: null,
      updatedAt: new Date().toISOString(), lastOperation: { kind: 'initialize', operator: 'linux-qa', reason: 'Synthetic isolated seed' }, domains }
    await registry.initialize(original)
    return true
  }
  if (action === 'material') return source.resolve(data)
  if (action === 'outage') { unavailable = data; return materialCalls }
  if (action === 'calls') return materialCalls
  if (action === 'rotate') {
    const entry = key(data, 'v2')
    await change({ kind: 'prepare', purpose: data, key: entry })
    return change({ kind: 'activate', purpose: data, kid: entry.kid, distributionConfirmed: true, verifyUntil: new Date(Date.now() + 600000).toISOString() })
  }
  if (action === 'revoke') return change({ kind: 'revoke', purpose: data, kid: `${data}-v1` })
  if (action === 'head') return (await registry.read()).revision
  if (action === 'restore-old-current') { await fs.writeFile(`${writerPaths.currentDirectory}/manifest.json`, JSON.stringify(original)); return true }
  if (action === 'recover') return (await registry.recoverLatest(data)).revision
  if (action === 'export-fixture') return { materials: [...materials], original }
  if (action === 'interrupt') {
    const originalRename = fs.rename
    fs.rename = async (...args) => {
      if (args[1] === `${writerPaths.currentDirectory}/manifest.json`) {
        process.send({ checkpoint: true })
        return new Promise(() => undefined)
      }
      return originalRename(...args)
    }
    return change({ kind: 'revoke', purpose: TokenType.AccessToken, kid: 'AccessToken-v1' })
  }
  if (action === 'inspect-public-storage') {
    const contents = []
    for (const dir of Object.values(writerPaths)) for (const name of await fs.readdir(dir)) {
      if (!(await fs.stat(`${dir}/${name}`)).isFile()) continue
      const info = await fs.stat(`${dir}/${name}`)
      if ((info.mode & 0o777) !== 0o640) throw new Error('Incorrect file mode')
      contents.push(await fs.readFile(`${dir}/${name}`, 'utf8'))
    }
    const text = contents.join('')
    if (text.includes('PRIVATE KEY')) throw new Error('Private PEM persisted')
    for (const material of materials.values()) for (const field of ['privateKey', 'secret']) {
      if (material[field] && text.includes(material[field])) throw new Error('Secret persisted')
    }
    return { documents: contents.length, containsSecrets: false }
  }
  if (action === 'local-adapter') return verifyLocalAdapter()
  throw new Error('Unknown operation')
})
