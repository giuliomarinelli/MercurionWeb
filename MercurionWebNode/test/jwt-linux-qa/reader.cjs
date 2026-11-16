require('reflect-metadata')
const http = require('node:http')
const fs = require('node:fs/promises')
const crypto = require('node:crypto')
const { Server } = require('socket.io')
const Redis = require('ioredis')
const { JwtService } = require('@nestjs/jwt')
const { ConfigService } = require('@nestjs/config')
const { Reflector } = require('@nestjs/core')
const { load, logger, userId, deviceId, readerPaths, Environment, TokenType, respond } = require('./common.cjs')
const auth = file => load(`app_modules/auth/${file}.js`)
const get = (file, name) => auth(file)[name]
const { socketEventRegistry } = require('@mercurion/socket-contracts')
let config, jwtTools, security, sessions, redis, gateway, io, server, secureCookie, wsGuard, guard, currentSession
let materialId = 0
const pending = new Map()
process.on('message', message => {
  if (!message.materialResponse) return
  const handlers = pending.get(message.materialResponse)
  if (!handlers) return
  pending.delete(message.materialResponse)
  clearTimeout(handlers.timer)
  if (message.error) handlers.reject(new Error('Synthetic manager unavailable'))
  else handlers.resolve(message.value)
})
const source = { resolve: request => new Promise((resolve, reject) => {
  const id = ++materialId
  const timer = setTimeout(() => { pending.delete(id); reject(new Error('Synthetic source timeout')) }, 4000)
  pending.set(id, { resolve, reject, timer }); process.send({ materialId: id, request })
}) }

async function boot(secrets) {
  const JwtKeyRuntimeModule = get('keys/jwt-key-runtime.module', 'JwtKeyRuntimeModule')
  const SecurityService = get('services/security.service', 'SecurityService')
  const RedisService = load('app_modules/redis/services/redis.service.js').RedisService
  const RedisSessionRepository = get('repositories/redis-session.repository', 'RedisSessionRepository')
  const SessionRedisCodec = get('repositories/session-redis.codec', 'SessionRedisCodec')
  const SessionService = get('services/session.service', 'SessionService')
  const SessionIdentityService = get('services/session-identity.service', 'SessionIdentityService')
  const JwtToolsService = get('services/jwt-tools.service', 'JwtToolsService')
  const JwtKeysProvider = get('providers/jwt-keys.provider', 'JwtKeysProvider')
  const Jwt = { issuer: 'qa-issuer', audience: { access: 'qa-access', ws: 'qa-ws', auth: 'qa-auth' } }
  for (const name of ['accessToken', 'ws_accessToken', 'preAuthorizationToken', 'activationToken', 'phoneNumberVerificationToken',
    'emailVerificationToken', 'emailOtpMfaActivationToken', 'smsOtpMfaActivationToken', 'appTotpMfaActivationToken',
    'emailOtpMfaInactivationToken', 'smsOtpMfaInactivationToken', 'appTotpMfaInactivationToken', 'changePasswordToken', 'accountRecoveryToken', 'sso_preAuthorizationToken']) Jwt[name] = { expiresInMs: 120000 }
  config = new ConfigService({ App: { env: Environment.Staging, AES_secret: secrets.aes, userId_AES_encryptionSecret: secrets.aes,
    sessionSignatureSecret: secrets.signature, deviceIdSignatureSecret: secrets.signature }, Jwt, Totp: { totpPepper: secrets.signature },
    SecureCookie: { secret: secrets.signature }, Session: { shortSessionLasting: 600, persistentSessionLasting: 600, sessionZeroId: '00000000-0000-4000-8000-000000000000' },
    Redis: { host: 'redis', port: 6379 } })
  security = new SecurityService(config, {})
  redis = new Redis({ host: 'redis', port: 6379, lazyConnect: true })
  await redis.connect()
  const redisService = new RedisService(redis, logger)
  sessions = new SessionService(new RedisSessionRepository(redisService, new SessionRedisCodec()), new SessionIdentityService(config), { publishToUser() {} }, config)
  jwtTools = new JwtToolsService(new JwtService(), config, { getUserScopesById: async () => [] }, sessions, logger,
    new JwtKeysProvider(config), security, redisService, JwtKeyRuntimeModule.fromFiles(readerPaths, Environment.Staging, source))
  await jwtTools.onModuleInit()
  const SecureCookieService = get('services/secure-cookie.service', 'SecureCookieService')
  secureCookie = new SecureCookieService(config, logger)
  const reflector = new Reflector()
  const scopeFixture = { scopeVerificationLayer: async () => undefined, verifyUserClaimScopesConsistencyThenGetScopes: async () => [], generateScopesArrayFromJwtClaim: () => [] }
  const AccessTokenAuthenticationPolicy = get('guards/policies/access-token-authentication.policy', 'AccessTokenAuthenticationPolicy')
  const SessionValidationPolicy = get('guards/policies/session-validation.policy', 'SessionValidationPolicy')
  const Transport = get('guards/policies/authentication-transport.policy', 'AuthenticationTransportPolicy')
  const transport = new Transport(secureCookie)
  const GlobalGuard = get('guards/global.guard', 'GlobalGuard')
  guard = new GlobalGuard(reflector,
    new (get('guards/policies/authentication-request-context.factory', 'AuthenticationRequestContextFactory'))(),
    new (get('guards/policies/credential-extraction.policy', 'CredentialExtractionPolicy'))(jwtTools),
    new AccessTokenAuthenticationPolicy(jwtTools, sessions, security, logger),
    new (get('guards/policies/scope-authorization.policy', 'ScopeAuthorizationPolicy'))(scopeFixture, security, reflector),
    new SessionValidationPolicy(sessions, security, logger), transport, security,
    new (get('guards/policies/authentication-failure.policy', 'AuthenticationFailurePolicy'))(jwtTools, sessions, security, transport, logger))
  wsGuard = new (load('app_modules/socket-io/guards/ws.guard.js').WsGuard)(jwtTools, sessions, reflector, secureCookie, scopeFixture, config, security, logger)
  const handler = () => undefined
  server = http.createServer(async (request, response) => {
    const reply = { header: (name, value) => response.setHeader(name, value), clearCookie: name => response.setHeader('set-cookie', `${name}=; Max-Age=0`) }
    try {
      const context = { getType: () => 'http', getHandler: () => handler, switchToHttp: () => ({ getRequest: () => request, getResponse: () => reply }) }
      await guard.canActivate(context)
      response.writeHead(200, { 'content-type': 'application/json' }); response.end(JSON.stringify({ authenticated: true }))
    } catch (error) { response.writeHead(error.getStatus?.() || 401); response.end('denied') }
  })
  io = new Server(server, { serveClient: false })
  const Gateway = load('app_modules/socket-io/socket.io.gateway.js').SocketIOGateway
  gateway = new Gateway(config, { setSocketServer() {} }, jwtTools, security, { setServer() {} }, logger)
  gateway.afterInit(io); gateway.onApplicationBootstrap()
  io.on('connection', async socket => {
    await gateway.handleConnection(socket)
    socket.emit('qa-ready', { private: Boolean(socket.data.userId) })
    socket.on(socketEventRegistry.sessionInit.name, async callback => {
      const context = { getType: () => 'ws', getHandler: () => handler, switchToWs: () => ({ getClient: () => socket }) }
      const allowed = await wsGuard.canActivate(context)
      callback(allowed ? gateway.handleSessionInit(socket) : { state: 'denied' })
    })
  })
  await new Promise(resolve => server.listen(8090, '127.0.0.1', resolve))
  return { uid: process.getuid(), secretsInEnvironment: Object.keys(process.env).filter(key => /^JWT_SECRETS_|^JWT_.*PRIVATE/.test(key)).length }
}

respond(async (action, data) => {
  if (action === 'boot') return boot(data)
  if (action === 'issue') {
    if (!currentSession) {
      currentSession = await sessions.createSession({ userId, deviceId, IP: '127.0.0.1', fingerprint: 'qa-fixture', location: '',
        sessionDeviceInfo: { browser: { name: 'QA' } }, provider: 'mercurion' }, true)
      await sessions.activateSession(currentSession.sessionId, userId)
    }
    return { sessionId: currentSession.sessionId, http: await jwtTools.generateToken(userId, TokenType.AccessToken, currentSession.sessionId),
      ws: await jwtTools.generateToken(userId, TokenType.ws_AccessToken, currentSession.sessionId),
      cookie: `__device_id=${secureCookie.signCookie(deviceId)}; __node_session_id=${secureCookie.signCookie(currentSession.sessionId)}` }
  }
  if (action === 'expired') {
    const registry = new (get('keys/jwt-key-registry', 'JwtKeyFileRegistry'))(readerPaths, Environment.Staging)
    const manifest = await registry.read(), domain = manifest.domains.find(domain => domain.purpose === TokenType.AccessToken)
    const key = domain.keys.find(entry => entry.kid === domain.activeKid)
    const material = await source.resolve({ environment: Environment.Staging, purpose: domain.purpose, kid: key.kid, algorithm: 'RS256', material: key.material })
    const now = Math.floor(Date.now() / 1000), jti = crypto.randomUUID()
    const token = await new JwtService().signAsync({ iss: 'qa-issuer', aud: 'qa-access', sub: security.encryptUserId(userId), jti,
      sid: data, typ: TokenType.AccessToken, iat: now - 200, exp: now - 100, scp: '' },
    { algorithm: 'RS256', privateKey: Buffer.from(material.privateKey, 'base64'), keyid: key.kid })
    await sessions.registerIssuedToken(data, jti, 600)
    return token
  }
  if (action === 'issue-flow') return jwtTools.generateToken(userId, TokenType.ActivationToken)
  if (action === 'verify-flow') {
    try { await jwtTools.verifyTokenAndGetPayload(data, TokenType.ActivationToken); return true } catch { return false }
  }
  if (action === 'status') {
    return { sessionValid: await sessions.validateSession(data.sessionId, deviceId, userId),
      socketCount: io.sockets.sockets.size, memberPresent: [...io.sockets.adapter.rooms.values()].some(ids => ids.has(data.socketId)),
      privateSockets: [...io.sockets.sockets.values()].filter(socket => socket.data.userId).length }
  }
  if (action === 'permissions') {
    const failures = {}
    for (const [name, path] of [['readonly', '/registry/reader-current/probe'], ['posix', '/registry/writer-current/probe']]) {
      try { await fs.writeFile(path, 'nonsecret probe'); failures[name] = 'WRITE_SUCCEEDED' } catch (error) { failures[name] = error.code }
    }
    return failures
  }
  if (action === 'stop') {
    jwtTools?.onModuleDestroy()
    if (io) await new Promise(resolve => io.close(resolve))
    await gateway?.onApplicationShutdown()
    if (redis?.status !== 'end') await redis?.quit()
    return true
  }
  throw new Error('Unknown reader operation')
})
