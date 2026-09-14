import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { ConfigService } from '@nestjs/config'
import { createApplicationModule } from './app.module'
import { ConfigurationError } from './config/env-validation'
import { Environment } from './config/config.schema'
import { MeiliLoggerService } from './app_modules/meilisearch/services/meili-logger.service'
import { RedisService } from './app_modules/redis/services/redis.service'
import { SecureCookieService } from './app_modules/auth/services/secure-cookie.service'
import { applyBootstrapConfiguration } from './bootstrap/bootstrap.configurator'
import { getBootstrapLogLevels, prepareDevelopmentBootstrap } from './bootstrap/configurators/logging.configurator'
import { resolveAppEnv } from './utils/env-helpers'
import { ReadinessService } from './shutdown/readiness.service'
import { ShutdownCoordinator } from './shutdown/shutdown.coordinator'

export async function bootstrap(): Promise<void> {
  prepareDevelopmentBootstrap()
  const app = await NestFactory.create<NestFastifyApplication>(
    createApplicationModule(),
    new FastifyAdapter({ trustProxy: true }),
    {
      logger: getBootstrapLogLevels(
        resolveAppEnv()
      ),
      abortOnError: false
    }
  )
  const config = app.get(ConfigService)
  const env = config.getOrThrow<Environment>('App.env')
  const loggerFactory = app.get(MeiliLoggerService)
  const readiness = app.get(ReadinessService)
  const shutdown = new ShutdownCoordinator(
    [
      { name: 'readiness', close: () => readiness.markDraining() },
      { name: 'nest-application', close: () => app.close() }
    ],
    config.get<number>('App.shutdownTimeoutMs') ?? 10000,
    loggerFactory.forContext('Shutdown')
  )
  const handleSignal = (signal: 'SIGTERM' | 'SIGINT') => {
    void shutdown.shutdown({ kind: 'signal', signal }).then(result => {
      if (result.timedOut || result.failures.length > 0) process.exitCode = 1
    })
  }
  process.on('SIGTERM', handleSignal)
  process.on('SIGINT', handleSignal)
  const handleFatal = (error: unknown) => {
    void shutdown.shutdown({ kind: 'fatal', error }).then(() => {
      process.exitCode = 1
    })
  }
  process.on('unhandledRejection', handleFatal)
  process.on('uncaughtException', handleFatal)
  const dependencies = {
    app,
    fastify: app.getHttpAdapter().getInstance(),
    config,
    env,
    secureCookie: app.get(SecureCookieService),
    redis: app.get(RedisService),
    loggerFactory,
    logger: loggerFactory.forContext('Bootstrap')
  }
  await applyBootstrapConfiguration(dependencies)
}

export type BootstrapFailureReporter = (error: unknown) => void

export const reportBootstrapFailure: BootstrapFailureReporter = error => {
  if (error instanceof ConfigurationError) {
    console.error('[CONFIGURATION_ERROR]', {
      code: error.code,
      diagnostics: error.diagnostics
    })
    return
  }
  console.error('[BOOTSTRAP_ERROR]', {
    name: error instanceof Error ? error.name : 'UnknownError',
    message: error instanceof Error ? error.message : 'Unknown bootstrap failure'
  })
}

export async function runBootstrap(
  start: () => Promise<void> = bootstrap,
  report: BootstrapFailureReporter = reportBootstrapFailure
): Promise<void> {
  try {
    await start()
  } catch (error) {
    report(error)
    process.exitCode = 1
  }
}

if (require.main === module) {
  void runBootstrap()
}
