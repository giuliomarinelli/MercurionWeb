import { RedisCapabilityError } from '../contracts/redis-contracts'
import { RedisCapabilityService } from './redis-capability.service'
import { RedisService } from './redis.service'

describe('RedisCapabilityService', () => {
  it.each<[string, boolean]>([
    ['Exg', true],
    ['AExg$l', true],
    ['Eg', false]
  ])('accepts only configurations containing the required capabilities (%s)', async (flags, supported) => {
    const service = new RedisCapabilityService({
      getNotifyKeyspaceEvents: jest.fn().mockResolvedValue(flags)
    } as unknown as RedisService)

    if (supported) {
      await expect(service.assertRequiredCapabilities()).resolves.toBeUndefined()
    } else {
      try {
        await service.assertRequiredCapabilities()
        throw new Error('expected Redis capability validation to fail')
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(RedisCapabilityError)
        if (error instanceof RedisCapabilityError) {
          expect(error.code).toBe('REDIS_REQUIRED_CAPABILITY_MISSING')
          expect(error.diagnostic.configuredFlags).toBe(flags)
          expect(error.diagnostic.missingFlags).toEqual(['x'])
        }
      }
    }
  })

  it('preserves the typed diagnostic when Redis configuration cannot be read', async () => {
    const service = new RedisCapabilityService({
      getNotifyKeyspaceEvents: jest.fn().mockRejectedValue(new Error('CONFIG is disabled'))
    } as unknown as RedisService)

    await expect(service.assertRequiredCapabilities()).rejects.toBeInstanceOf(RedisCapabilityError)
  })
})
