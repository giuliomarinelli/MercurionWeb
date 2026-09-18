import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import fastifyCookie from '@fastify/cookie'
import { Test } from '@nestjs/testing'
import { MercurionGraphQLModule } from '../src/mercurion-graphql.module'
import { createTestConfigurationModule } from '../src/test-utils/configuration'
import { TestController } from '../src/test.controller'
import { HealthController } from '../src/health.controller'
import { AuthenticationController } from '../src/app_modules/auth/controllers/authentication.controller'
import {
  CredentialLoginHandler,
  VerifyEmailHandler
} from '../src/app_modules/auth/application/credential-authentication.handlers'
import {
  StartMfaChallengeHandler,
  CompleteMfaLoginHandler
} from '../src/app_modules/auth/application/mfa-authentication.handlers'
import {
  LogoutHandler,
  RevokeSessionHandler,
  RevokeAllSessionsHandler,
  RefreshWsAccessTokenHandler
} from '../src/app_modules/auth/application/session-authentication.handlers'
import { CompleteSsoAuthenticationHandler } from '../src/app_modules/auth/application/sso-authentication.handler'
import { LocalDummyLoginHandler } from '../src/app_modules/auth/application/local-dummy-login.handler'
import { SecureCookieService } from '../src/app_modules/auth/services/secure-cookie.service'
import { TurnstileGuard } from '../src/app_modules/auth/guards/turnstile.guard'
import { TurnstileService } from '../src/app_modules/auth/services/turnstile.service'
import { ResponseService } from '../src/services/response.service'
import { ReadinessService } from '../src/shutdown/readiness.service'
import { RedisCapabilityService } from '../src/app_modules/redis/services/redis-capability.service'
import { HelpResolver } from '../src/app_modules/help/resolvers/help.resolver'
import { HelpService } from '../src/app_modules/help/services/help.service'
import { HttpExceptionFilter } from '../src/exception-handling/http-exception-filter'
import { createGlobalValidationPipe } from '../src/config/validation-pipe'
import { LoggerPort, type LoggerContext } from '../src/logging/logger.port'

export interface E2eApplicationFixture {
  readonly app: NestFastifyApplication
  readonly verifyEmail: { execute: jest.Mock }
  readonly logout: { execute: jest.Mock }
  readonly listTickets: jest.Mock
  close(): Promise<void>
}

function loggerFactory(): LoggerPort {
  const context: LoggerContext = {
    log: () => undefined,
    warn: () => undefined,
    error: () => undefined,
    debug: () => undefined,
    verbose: () => undefined,
    fatal: () => undefined,
    setLogLevels: () => undefined
  }
  return new class extends LoggerPort {
    forContext(): LoggerContext {
      return context
    }
  }()
}

export async function createE2eApplicationFixture(): Promise<E2eApplicationFixture> {
  const configuration = await createTestConfigurationModule({
    SQL_DATABASE_HOST: '127.0.0.1',
    SQL_DATABASE_PORT: '55432',
    SQL_DATABASE_USERNAME: 'app',
    SQL_DATABASE_PASSWORD: 'integration-test',
    SQL_DATABASE: 'mercurion_e2e',
    SQL_DATABASE_LOGGING: 'false',
    SQL_DATABASE_LOGGER: 'advanced-console',
    REDIS_HOST: '127.0.0.1',
    REDIS_PORT: '56379',
    REDIS_PASSWORD: 'e2e-test-password'
  })

  const verifyEmail = { execute: jest.fn(async () => ({ verified: true })) }
  const logout = { execute: jest.fn(async () => undefined) }
  const listTickets = jest.fn(async () => ({
    items: [],
    meta: {
      itemCount: 0,
      totalItems: 0,
      itemsPerPage: 20,
      totalPages: 0,
      currentPage: 1
    }
  }))
  const secureCookie = {
    setSignedCookie: jest.fn(),
    clearCookie: jest.fn()
  }

  const moduleRef = await Test.createTestingModule({
    imports: [configuration, MercurionGraphQLModule],
    controllers: [TestController, HealthController, AuthenticationController],
    providers: [
      HelpResolver,
      { provide: HelpService, useValue: { listTickets } },
      { provide: ResponseService, useClass: ResponseService },
      { provide: VerifyEmailHandler, useValue: verifyEmail },
      { provide: CredentialLoginHandler, useValue: { execute: jest.fn() } },
      { provide: StartMfaChallengeHandler, useValue: { execute: jest.fn() } },
      { provide: CompleteMfaLoginHandler, useValue: { execute: jest.fn() } },
      { provide: LogoutHandler, useValue: logout },
      { provide: RevokeSessionHandler, useValue: { execute: jest.fn() } },
      { provide: RevokeAllSessionsHandler, useValue: { execute: jest.fn() } },
      { provide: RefreshWsAccessTokenHandler, useValue: { execute: jest.fn() } },
      { provide: CompleteSsoAuthenticationHandler, useValue: { execute: jest.fn() } },
      { provide: LocalDummyLoginHandler, useValue: { execute: jest.fn() } },
      { provide: SecureCookieService, useValue: secureCookie },
      {
        provide: TurnstileGuard,
        useValue: { canActivate: jest.fn(() => true) }
      },
      {
        provide: TurnstileService,
        useValue: { verify: jest.fn(async () => true) }
      },
      { provide: ReadinessService, useValue: { isReady: true } },
      {
        provide: RedisCapabilityService,
        useValue: { assertRequiredCapabilities: jest.fn(async () => undefined) }
      },
    ]
  }).compile()

  const app = moduleRef.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter()
  )
  await app.register(fastifyCookie)
  app.useGlobalPipes(createGlobalValidationPipe())
  app.useGlobalFilters(new HttpExceptionFilter(loggerFactory(), true))
  await app.init()

  return {
    app,
    verifyEmail,
    logout,
    listTickets,
    async close(): Promise<void> {
      await app.close()
    }
  }
}
