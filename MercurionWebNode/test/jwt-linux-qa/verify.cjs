const fs = require('node:fs/promises')
const crypto = require('node:crypto')
const { fork } = require('node:child_process')
const path = require('node:path')
const { io: clientIo } = require('socket.io-client')
const { socketEventRegistry } = require('@mercurion/socket-contracts')
const { TokenType, deviceId, writerPaths } = require('./common.cjs')
const results = [], children = new Set(), clients = []
let writer, reader, sequence = 0
const secrets = { aes: crypto.randomBytes(32).toString('base64'), signature: crypto.randomBytes(64).toString('hex') }
const check = (condition, name, detail) => { if (!condition) throw new Error(name); results.push({ check: name, passed: true, ...(detail || {}) }) }
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))
function child(name, uid) {
  const processChild = fork(path.join(__dirname, `${name}.cjs`), [], { uid, gid: 10001, stdio: ['ignore', 'ignore', 'ignore', 'ipc'] })
  children.add(processChild)
  processChild.once('exit', () => children.delete(processChild))
  processChild.on('message', async message => {
    if (!message.materialId) return
    try { processChild.send({ materialResponse: message.materialId, value: await rpc(writer, 'material', message.request) }) }
    catch { if (processChild.connected) processChild.send({ materialResponse: message.materialId, error: 'UNAVAILABLE' }) }
  })
  return processChild
}
function rpc(processChild, action, data, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const requestId = ++sequence
    const cleanup = () => { clearTimeout(timer); processChild.off('message', message); processChild.off('exit', exited) }
    const message = value => {
      if (value.responseId !== requestId) return
      cleanup()
      if (value.error) { const error = new Error(`${action}: ${value.error}`); error.frames = value.frames; reject(error) } else resolve(value.value)
    }
    const exited = () => { cleanup(); reject(new Error(`${action}: CHILD_EXIT`)) }
    const timer = setTimeout(() => { cleanup(); reject(new Error(`${action}: TIMEOUT`)) }, timeoutMs)
    processChild.on('message', message); processChild.once('exit', exited)
    processChild.send({ requestId, action, data })
  })
}
async function stop(processChild) {
  if (!processChild || processChild.exitCode !== null || processChild.signalCode !== null) return
  if (processChild === reader) await rpc(processChild, 'stop').catch(() => undefined)
  const exited = new Promise(resolve => processChild.once('exit', resolve))
  processChild.kill('SIGTERM'); await exited
}
async function connect(token, cookie) {
  const socket = clientIo('http://127.0.0.1:8090', { transports: ['websocket'], reconnection: false, autoConnect: false,
    auth: { contractMajor: 1, clientInstanceId: crypto.randomUUID(), ...(token ? { token } : {}) }, extraHeaders: cookie ? { cookie } : {} })
  clients.push(socket)
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.disconnect(); reject(new Error('Socket readiness timeout')) }, 5000)
    socket.once('qa-ready', state => { clearTimeout(timer); resolve({ socket, private: state.private }) })
    socket.once('connect_error', () => { clearTimeout(timer); reject(new Error('Socket connection rejected')) })
    socket.connect()
  })
}
async function httpRequest(token, sessionId) {
  const response = await fetch('http://127.0.0.1:8090/protected', { headers: { authorization: `Bearer ${token}`, 'x-session-id': sessionId, 'x-device-id': deviceId } })
  await response.text()
  return response
}
async function main() {
  for (const dir of Object.values(writerPaths)) { await fs.chown(dir, 10002, 10001); await fs.chmod(dir, 0o750) }
  writer = child('writer', 10002); await rpc(writer, 'boot')
  reader = child('reader', 10001)
  const identity = await rpc(reader, 'boot', secrets)
  check(identity.uid === 10001 && identity.secretsInEnvironment === 0, 'Reader is unprivileged; JWT secrets absent from environment')
  const permissions = await rpc(reader, 'permissions')
  check(permissions.readonly === 'EROFS', 'Readonly directory mount rejects writes')
  check(permissions.posix === 'EACCES', 'POSIX permissions independently reject reader writes')
  const original = await rpc(reader, 'issue'), expired = await rpc(reader, 'expired', original.sessionId)
  check((await httpRequest(original.http, original.sessionId)).status === 200, 'HTTP authenticates using real Redis-backed session')
  await rpc(writer, 'rotate', TokenType.AccessToken)
  const renewed = await httpRequest(expired, original.sessionId)
  const replacement = decodeURIComponent(renewed.headers.get('x-new-access-token') || '')
  const header = replacement ? JSON.parse(Buffer.from(replacement.split('.')[0], 'base64url')) : {}
  check(renewed.status === 200 && header.kid === 'AccessToken-v2', 'Expired old HTTP signature renews onto new kid')
  check(!renewed.headers.has('set-cookie'), 'Ordinary renewal does not clear authentication cookies')
  check((await rpc(reader, 'status', { sessionId: original.sessionId })).sessionValid, 'Redis session survives HTTP rotation and renewal')
  const old = await connect(original.ws, original.cookie), publicConnection = await connect()
  check(old.private && !publicConnection.private, 'Real Socket.IO separates private and public connections')
  const initState = await new Promise(resolve => old.socket.timeout(3000).emit(socketEventRegistry.sessionInit.name, (_error, reply) => resolve(reply)))
  check(initState?.state === 'authenticated', 'Real WS guard validates device and Redis session')
  await rpc(writer, 'rotate', TokenType.ws_AccessToken)
  await delay(1500)
  check(old.socket.connected && publicConnection.socket.connected, 'Ordinary WS key rotation preserves existing connections')
  const newest = await rpc(reader, 'issue'), fresh = await connect(newest.ws, newest.cookie)
  check(fresh.private, 'New WS connection uses new signing key')
  const oldId = old.socket.id
  const oldFlow = await rpc(reader, 'issue-flow')
  await rpc(writer, 'rotate', TokenType.ActivationToken)
  const newFlow = await rpc(reader, 'issue-flow')
  check(await rpc(reader, 'verify-flow', oldFlow) && await rpc(reader, 'verify-flow', newFlow), 'HS512 old and new versions coexist during rotation')
  const beforeOutage = await rpc(writer, 'outage', true)
  const started = performance.now()
  const disconnected = new Promise(resolve => old.socket.once('disconnect', resolve))
  await rpc(writer, 'revoke', TokenType.ws_AccessToken)
  let timeout
  try { await Promise.race([disconnected, new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('WS five-second deadline exceeded')), 4900) })]) }
  finally { clearTimeout(timeout) }
  const elapsed = Math.round(performance.now() - started)
  check(elapsed < 5000, 'Idle private WS disconnects within five seconds during provider outage', { elapsedMs: elapsed })
  const state = await rpc(reader, 'status', { sessionId: original.sessionId, socketId: oldId })
  check(!state.memberPresent && state.sessionValid, 'Revoked socket removed from real Redis-adapter rooms; Redis session retained')
  check(fresh.socket.connected && publicConnection.socket.connected, 'Unrelated new-key and public sockets remain connected')
  check(await rpc(writer, 'calls') === beforeOutage, 'Revocation and reconciliation perform no provider requests')
  await rpc(writer, 'revoke', TokenType.ActivationToken)
  check(!await rpc(reader, 'verify-flow', oldFlow) && await rpc(reader, 'verify-flow', newFlow), 'HS512 revocation excludes only the old key during provider outage')
  check((await httpRequest(replacement, original.sessionId)).status === 200, 'Warm admitted HTTP key works during provider outage')
  const head = await rpc(writer, 'head')
  await rpc(writer, 'restore-old-current')
  const stale = await httpRequest(replacement, original.sessionId)
  check(stale.status === 500 && !stale.headers.has('set-cookie'), 'Current-only rollback fails closed without clearing cookies')
  check((await rpc(reader, 'status', { sessionId: original.sessionId })).sessionValid, 'Metadata fault does not destroy Redis session')
  await rpc(writer, 'recover', head)
  await stop(reader); reader = child('reader', 10001)
  let failedBoot = false
  try { await rpc(reader, 'boot', secrets) } catch (error) { failedBoot = error.message.includes('MATERIAL_UNAVAILABLE') }
  check(failedBoot, 'Cold reader cannot bootstrap during provider outage')
  await stop(reader)
  await rpc(writer, 'outage', false)
  reader = child('reader', 10001); await rpc(reader, 'boot', secrets)
  const rejected = await connect(original.ws, original.cookie)
  check(!rejected.private, 'Restarted reader retains key revocation from durable history')
  rejected.socket.disconnect()
  const fixture = await rpc(writer, 'export-fixture')
  const checkpoint = new Promise(resolve => writer.once('message', function listener(message) {
    if (message.checkpoint) resolve(); else writer.once('message', listener)
  }))
  const interrupted = rpc(writer, 'interrupt').catch(() => undefined)
  await checkpoint
  const writerExited = new Promise(resolve => writer.once('exit', resolve))
  writer.kill('SIGKILL'); await writerExited; await interrupted
  check((await httpRequest(replacement, original.sessionId)).status === 500, 'Actual SIGKILL between fsync audit and current replacement fails closed')
  // Explicit stale-lock recovery, only after the owning process has exited. No recursive deletion.
  await fs.rmdir(`${writerPaths.historyDirectory}/.writer-lock`)
  writer = child('writer', 10002); await rpc(writer, 'boot', { resume: fixture })
  await rpc(writer, 'recover', head + 1)
  await stop(reader); reader = child('reader', 10001); await rpc(reader, 'boot', secrets)
  check((await httpRequest(replacement, original.sessionId)).status === 200, 'Forward recovery and cold reader retain current valid key')
  check((await rpc(reader, 'status', { sessionId: original.sessionId })).sessionValid, 'Redis session survives writer crash and reader restart')
  const storage = await rpc(writer, 'inspect-public-storage')
  check(!storage.containsSecrets, 'Persistent files contain metadata/public keys only and retain mode 0640', { documents: storage.documents })
  check(await rpc(writer, 'local-adapter'), 'Local development adapter migrates legacy bytes and hot-activates RSA/HMAC versions on Linux tmpfs')
  const versions = {}
  for (const name of ['@nestjs/common', '@nestjs/core', '@nestjs/jwt', 'socket.io', 'socket.io-client', 'ioredis']) {
    versions[name] = JSON.parse(await fs.readFile(`/usr/src/app/node_modules/${name}/package.json`, 'utf8')).version
  }
  console.log(JSON.stringify({ passed: true, checks: results.length, platform: process.platform, node: process.version, versions, results }))
}
main().catch(error => { console.error(JSON.stringify({ passed: false, check: error.message, frames: error.frames, results })); process.exitCode = 1 })
  .finally(async () => { for (const socket of clients) socket.disconnect(); for (const processChild of [...children]) await stop(processChild) })
