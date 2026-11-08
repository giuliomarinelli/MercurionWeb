// Isolated Nest transports with synthetic credentials; no application bootstrap.
require('reflect-metadata')
const assert = require('node:assert/strict')
const { Logger } = require('@nestjs/common')
const { ClientProxyFactory, ServerNats } = require('@nestjs/microservices')
const { firstValueFrom, timeout } = require('rxjs')
const { createNatsTransportOptions } = require('/qa/nats-transport.js')
Logger.overrideLogger(false)

let phase = 'readiness'
let replies = 0
let denials = 0

function credentials(environment) {
  return { username: `nest_${environment}`, password: `synthetic-${environment}-password` }
}

function options(environment, auth) {
  const values = { 'App.natsUrl': `nats://nats-${environment}:4222`, 'App.natsCredentials': auth }
  const transport = createNatsTransportOptions({ getOrThrow: key => {
    assert(Object.hasOwn(values, key))
    return values[key]
  } })
  // Bounded retries belong only to the test, not to application policy.
  Object.assign(transport.options, { reconnect: false, timeout: 2000 })
  return transport
}

async function listen(server) {
  await new Promise((resolve, reject) => server.listen(error => error ? reject(error) : resolve()))
}

async function echo(environment, auth) {
  const transport = options(environment, auth)
  const server = new ServerNats(transport.options)
  const client = ClientProxyFactory.create(transport)
  server.addHandler('qa.auth.echo', async payload => ({ ...payload, via: 'nest-server' }))
  try {
    await listen(server)
    await server.unwrap().flush()
    await client.connect()
    const result = await firstValueFrom(client.send('qa.auth.echo', { environment, marker: 'synthetic-only' }).pipe(timeout(5000)))
    assert.deepEqual(result, { environment, marker: 'synthetic-only', via: 'nest-server' })
    replies++
  } finally {
    await client.close()
    await server.close()
  }
}

async function denied(environment, auth, kind) {
  const transport = options(environment, auth)
  const consumer = kind === 'client' ? ClientProxyFactory.create(transport) : new ServerNats(transport.options)
  try {
    // Only an explicit broker authentication error counts; DNS/refusal/timeout fail.
    await assert.rejects(() => kind === 'client' ? consumer.connect() : listen(consumer),
      error => error.code === 'AUTHORIZATION_VIOLATION')
    denials++
  } finally {
    await consumer.close()
  }
}

async function main() {
  // Resolve readiness with a bounded authenticated connection, not sleeps alone.
  for (const environment of ['staging', 'production', 'legacy']) {
    let ready = false
    for (let attempt = 0; attempt < 30; attempt++) {
      const client = ClientProxyFactory.create(options(environment, environment === 'legacy' ? {} : credentials(environment)))
      try { await client.connect(); ready = true; break }
      catch { await new Promise(resolve => setTimeout(resolve, 200)) }
      finally { await client.close() }
    }
    assert(ready, 'owned-broker-not-ready')
  }
  for (const [environment, other] of [['staging', 'production'], ['production', 'staging']]) {
    phase = `authenticated-${environment}`
    await echo(environment, credentials(environment))
    phase = `negative-${environment}`
    for (const auth of [{}, { ...credentials(environment), password: 'synthetic-wrong-password' },
      { ...credentials(environment), username: 'synthetic-unknown-user' }, credentials(other)]) {
      for (const kind of ['client', 'server']) await denied(environment, auth, kind)
    }
  }
  phase = 'legacy-unauthenticated'
  await echo('legacy', {})
  console.log(JSON.stringify({ status: 'passed', scope: 'isolated Nest NATS transport integration',
    authenticatedReplies: replies - 1, legacyReplies: 1, explicitAuthDenials: denials,
    fullApplication: false, tox21Runtime: false, vmDeployment: false }))
}

main().catch(error => {
  console.error(JSON.stringify({ status: 'failed', phase, replies, denials, errorType: error.name, code: error.code }))
  process.exitCode = 1
})
