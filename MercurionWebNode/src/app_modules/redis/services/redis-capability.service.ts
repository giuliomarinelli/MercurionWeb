import { Injectable, OnModuleInit } from '@nestjs/common'
import {
  RedisCapabilityError,
  redisCapabilityPolicy,
  validateRedisCapabilities
} from '../contracts/redis-contracts'
import { RedisService } from './redis.service'

@Injectable()
export class RedisCapabilityService implements OnModuleInit {
  constructor(private readonly redisService: RedisService) {}

  async onModuleInit(): Promise<void> {
    await this.assertRequiredCapabilities()
  }

  async assertRequiredCapabilities(): Promise<void> {
    let configuredFlags = ''
    try {
      configuredFlags = await this.redisService.getNotifyKeyspaceEvents()
    } catch {
      throw new RedisCapabilityError({
        setting: redisCapabilityPolicy.setting,
        configuredFlags,
        missingFlags: redisCapabilityPolicy.requiredFlags,
        missingCapabilities: redisCapabilityPolicy.capabilities
      })
    }
    const diagnostic = validateRedisCapabilities(configuredFlags)
    if (diagnostic) throw new RedisCapabilityError(diagnostic)
  }
}
