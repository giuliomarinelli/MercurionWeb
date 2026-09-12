import type { ConfigService } from '@nestjs/config'
import type { FastifyInstance } from 'fastify'
import type { NestFastifyApplication } from '@nestjs/platform-fastify'
import type { SecureCookieService } from '../app_modules/auth/services/secure-cookie.service'
import type { RedisService } from '../app_modules/redis/services/redis.service'
import type { MeiliLoggerService } from '../app_modules/meilisearch/services/meili-logger.service'
import type { Environment } from '../config/config.schema'

export interface BootstrapDependencies {
  app: NestFastifyApplication
  fastify: FastifyInstance
  config: ConfigService
  env: Environment
  secureCookie: SecureCookieService
  redis: RedisService
  loggerFactory: MeiliLoggerService
  logger: {
    log(message: string): void
    warn(message: string): void
    setLogLevels(levels: string[]): void
  }
}

export type BootstrapConfigurator = (
  dependencies: BootstrapDependencies
) => void | Promise<void>
