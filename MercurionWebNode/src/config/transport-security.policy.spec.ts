import Fastify from 'fastify'

import { Environment } from './config.schema'
import {
  createProxyTrustController,
  createTransportSecurityPolicy
} from './transport-security.policy'

describe('transport security policy', () => {
  it.each([
    [Environment.Development, true],
    [Environment.Test, true],
    [Environment.Staging, false],
    [Environment.Production, false]
  ])('makes rate-limit storage failure explicit for %s', (env, skipOnError) => {
    expect(createTransportSecurityPolicy(env, ['127.0.0.1/32'])).toEqual({
      corsEnabled: false,
      rateLimitSkipOnError: skipOnError,
      trustedProxyCidrs: ['127.0.0.1/32']
    })
  })

  it('ignores forwarding data from an untrusted peer', async () => {
    const controller = createProxyTrustController()
    controller.configure(['127.0.0.1/32'])
    const app = Fastify({ trustProxy: controller.trust })
    app.get('/', request => ({ ip: request.ip }))

    const response = await app.inject({
      url: '/',
      remoteAddress: '203.0.113.7',
      headers: { 'x-forwarded-for': '198.51.100.9' }
    })

    expect(response.json()).toEqual({ ip: '203.0.113.7' })
    await app.close()
  })

  it('accepts the normalized client identity from the configured nginx peer', async () => {
    const controller = createProxyTrustController()
    controller.configure(['10.20.30.0/24'])
    const app = Fastify({ trustProxy: controller.trust })
    app.get('/', request => ({ ip: request.ip }))

    const response = await app.inject({
      url: '/',
      remoteAddress: '10.20.30.8',
      headers: { 'x-forwarded-for': '198.51.100.9' }
    })

    expect(response.json()).toEqual({ ip: '198.51.100.9' })
    await app.close()
  })
})
