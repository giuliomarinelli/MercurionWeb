import type { AppConfiguration } from '../../config/config.types'
import { Environment } from '../../config/config.schema'
import { createTransportSecurityPolicy } from '../../config/transport-security.policy'
import { configureRateLimiting } from './rate-limit.configurator'

const register = jest.fn()
const redisClient = {}

jest.mock('@fastify/rate-limit', () => ({ __esModule: true, default: Symbol('rate-limit') }))

describe('rate-limit bootstrap policy', () => {
  beforeEach(() => register.mockReset())

  it.each([
    [Environment.Development, true],
    [Environment.Test, true],
    [Environment.Staging, false],
    [Environment.Production, false]
  ])('uses the explicit %s storage failure policy', async (env, expected) => {
    const configuration = {
      transportSecurity: createTransportSecurityPolicy(env, ['127.0.0.1/32'])
    } as AppConfiguration
    await configureRateLimiting({
      app: { register } as never,
      config: { getOrThrow: () => configuration } as never,
      redis: { getClient: () => redisClient } as never
    })

    expect(register).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      skipOnError: expected,
      redis: redisClient
    }))
  })
})
