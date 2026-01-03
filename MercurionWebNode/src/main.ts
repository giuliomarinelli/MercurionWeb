import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { LogLevel, ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { MicroserviceOptions, Transport } from '@nestjs/microservices'
import { HttpExceptionFilter } from './exception-handling/http-exception-filter'
import { IoAdapter } from '@nestjs/platform-socket.io'
import { copyBootstrapFiles } from './copy-bootstrap-files'
import fastifyCookie from '@fastify/cookie'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { randomBytes, randomUUID } from 'crypto'
import { SecureCookieService } from './app_modules/auth/services/secure-cookie.service'
import { Environment } from './config/config'
import { SecureCookieConfiguration } from './config/config.types'
import { buildRateLimitKey, isValidIp, routeAwareMax } from './config/rate-limit.config'
import { RedisService } from './app_modules/redis/services/redis.service'
import { MeiliLoggerService } from './app_modules/meilisearch/services/meili-logger.service'
import { resolveAppEnv } from './utils/env-helpers'



export async function bootstrap() {

  process.on('unhandledRejection', (reason) => {
    console.error('[UNHANDLED_REJECTION]', reason)
    console.log('Logged unhandled rejection event')
  })
  console.log('Registered unhandledRejection handler')

  process.on('uncaughtException', (err) => {
    console.error('[UNCAUGHT_EXCEPTION]', err)
    console.log('Logged uncaught exception event')
  })
  console.log('Registered uncaughtException handler')

  const logLevels = new Set<LogLevel>(['error', 'warn', 'log', 'debug', 'verbose', 'fatal'])
  console.log('Initialized log levels set')

  if (resolveAppEnv() !== Environment.Development) {
    logLevels.delete('debug')
    console.log('Removed debug log level outside development')
    logLevels.delete('verbose')
    console.log('Removed verbose log level outside development')
  } else {
    copyBootstrapFiles()
    console.log('Copied bootstrap files in development environment')
  }
  console.log('Completed environment-based log level configuration')

  // 🔒 trustProxy per IP reali dietro CF/NGINX
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ trustProxy: true }),
    { logger: Array.from(logLevels) }
  )
  console.log('Created NestFastify application with trust proxy')

  const configService = app.get<ConfigService>(ConfigService)
  console.log('Retrieved ConfigService instance')
  const secureCookieService = app.get<SecureCookieService>(SecureCookieService)
  console.log('Retrieved SecureCookieService instance')
  const redisService = app.get<RedisService>(RedisService)
  console.log('Retrieved RedisService instance')
  const loggerFactory = app.get<MeiliLoggerService>(MeiliLoggerService)
  console.log('Retrieved MeiliLoggerService factory')
  const logger = loggerFactory.forContext('Bootstrap')
  console.log('Created bootstrap logger')

  logger.setLogLevels(Array.from(logLevels))
  console.log('Applied log levels to logger')

  const env = configService.get<Environment>('App.env')
  console.log('Loaded application environment')

  const natsPort = configService.get<number>('App.natsPort') ?? 4223
  console.log('Resolved NATS port configuration')
  const natsHost = configService.get<string>('App.natsHost')
  console.log('Resolved NATS host configuration')
  const natsUrl: string = `${natsHost}:${natsPort}`
  console.log('Composed NATS connection URL')

  app.useWebSocketAdapter(new IoAdapter(app))
  console.log('Registered WebSocket adapter')
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.NATS,
    options: { servers: [natsUrl] },
  })
  console.log('Connected NATS microservice')

  app.useGlobalFilters(new HttpExceptionFilter(loggerFactory))
  console.log('Registered global HTTP exception filter')
  app.setGlobalPrefix('api', { exclude: ['/health'] })
  console.log('Set API global prefix')

  /**
  *  NOTE (HTTPS-bound security headers):
  *  In staging/production these MUST be set at the reverse proxy (nginx / Cloudflare) — not here —
  *  to avoid conflicts and to keep localhost (HTTP) from breaking.
   
  *  This helmet config only keeps HTTP-safe headers that are useful in every environment.
   
  *  Move to nginx (staging/prod):
  *  - Strict-Transport-Security (HSTS)
  *  - Content-Security-Policy (CSP)
  *  - HTTP -> HTTPS redirects (and any TLS enforcement)
  */
  await app.register(helmet, {
    // ✅ CSP spostata su nginx (in locale HTTP spesso rompe e/o crea policy incoerenti)
    contentSecurityPolicy: false,

    // niente referrer
    referrerPolicy: {
      policy: 'no-referrer',
    },

    // niente embedding di risorse da altri origin
    crossOriginResourcePolicy: {
      policy: 'same-origin',
    },

    // isolamento finestra (anti XS-Leaks)
    crossOriginOpenerPolicy: {
      policy: 'same-origin',
    },

    // COEP spesso rompe con librerie che non mettono gli header giusti:
    // lo teniamo off finché non facciamo la combo COEP+COOP+CORP.
    crossOriginEmbedderPolicy: false,

    // vieta qualsiasi iframe
    frameguard: { action: 'deny' },

    // togliere X-Powered-By se dovesse spuntare da qualche parte
    hidePoweredBy: true,

    // ❌ HSTS spostato su nginx (HTTPS-bound)
    hsts: false
  })
  console.log('Registered helmet plugin with baseline headers')



  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,             // rimuove campi extra
    forbidNonWhitelisted: true,  // 400 se arrivano campi sconosciuti
    forbidUnknownValues: true,
    transformOptions: { enableImplicitConversion: true }
  }))
  console.log('Configured global validation pipe')

  await app.register(fastifyCookie)
  console.log('Registered fastify cookie plugin')

  const fastify = app.getHttpAdapter().getInstance()
  console.log('Obtained Fastify instance')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { secret, ...cookieConf } = configService.get<SecureCookieConfiguration>('SecureCookie')!
  console.log('Loaded secure cookie configuration')

  // 🔒 Hook precoce: genera/sovrascrive header interni (anti-spoof)
  fastify.addHook('onRequest', (req, reply, done) => {

    // ========== SCUDO ANTI-SPOOFING ==========

    req.headers['x-device-id'] = undefined
    console.log('Cleared x-device-id header')
    req.headers['x-session-id'] = undefined
    console.log('Cleared x-session-id header')
    req.headers['x-client-ip'] = undefined
    console.log('Cleared x-client-ip header')
    req.headers['x-user-id'] = undefined
    console.log('Cleared x-user-id header')
    req.headers['x-scopes'] = undefined
    console.log('Cleared x-scopes header')
    req.headers['x-new-access-token'] = undefined
    console.log('Cleared x-new-access-token header')

    let deviceId: string | null = null
    console.log('Initialized deviceId placeholder')

    try {
      deviceId = secureCookieService.getSignedCookie(req, '__device_id')
      console.log('Retrieved signed deviceId cookie')
    } catch {
      deviceId = randomUUID()
      console.log('Generated new deviceId value')
      secureCookieService.setSignedCookie(reply, '__device_id', deviceId, {
        maxAge: 31_556_952, // ~1 anno in secondi
        ...cookieConf
      })
      console.log('Stored signed deviceId cookie')
    }

    req.headers['x-device-id'] = deviceId
    console.log('Injected x-device-id header')

    try {
      req.headers['x-session-id'] = secureCookieService.getSignedCookie(req, '__node_session_id')
      console.log('Retrieved session id cookie')
    } catch {
      req.headers['x-session-id'] = undefined
      console.log('Session id cookie missing, cleared header')
    }

    const isDevOrTest = env === Environment.Development || env === Environment.Test
    console.log('Computed dev/test environment flag')
    const mockIp = req.headers['x-mock-ip']?.toString().trim()
    console.log('Read potential mock IP header')

    const cfIpRaw = req.headers['cf-connecting-ip']?.toString().trim()
    console.log('Read cf-connecting-ip header')
    const cfIp = isValidIp(cfIpRaw) ? cfIpRaw : undefined
    console.log('Validated Cloudflare IP header')

    req.headers['x-client-ip'] = isDevOrTest && mockIp ? mockIp : (cfIp || req.ip)
    console.log('Resolved client IP for request')
    done()
    console.log('Completed onRequest hook')
  })
  console.log('Registered onRequest anti-spoof hook')

  // Parser multipart passthrough
  fastify.addContentTypeParser('multipart/form-data', (req, payload, done) => {
    done(null, req)
    console.log('Passthrough multipart content type parser executed')
  })
  console.log('Registered multipart/form-data content type parser')

  fastify.addHook('onSend', (req, reply, payload, done) => {
    reply.header('Cache-Control', 'no-store')
    console.log('Applied Cache-Control header')
    const DISABLE_ALL = '()'
    console.log('Initialized Permissions-Policy disable value')
    reply.header(
      'Permissions-Policy',
      [
        `geolocation=${DISABLE_ALL}`,
        `microphone=${DISABLE_ALL}`,
        `camera=${DISABLE_ALL}`,
        `payment=${DISABLE_ALL}`,
        `usb=${DISABLE_ALL}`,
        `bluetooth=${DISABLE_ALL}`,
        `interest-cohort=${DISABLE_ALL}`,
        `fullscreen=(self)`
      ].join(', '))
    console.log('Applied Permissions-Policy header')
    done()
    console.log('Completed onSend hook')
  })
  console.log('Registered onSend hook')

  const reqIdSuffix = randomBytes(16).toString('hex')
  console.log('Generated request ID suffix for rate limit responses')
  // 🔒 Rate limit distribuito (Redis), finestra 5 minuti chiara (ms)
  await app.register(rateLimit, {
    hook: 'preHandler',
    timeWindow: 5 * 60 * 1000, // 5 minutes
    keyGenerator: buildRateLimitKey,
    max: (req) => routeAwareMax(req),
    skipOnError: true,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    errorResponseBuilder: (req, ctx) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded.`,
      timestamp: new Date().toISOString(),
      requestId: `${req.id}-${reqIdSuffix}`,
      path: req.url?.split('?')[0] || req.url
    }),
    redis: redisService.getClient(),
    nameSpace: 'ratelimit:'
  })
  console.log('Registered distributed rate limiting')


  const port = configService.get<number>('App.port')
  console.log('Resolved application port')
  const host = configService.get<string>('App.host') as string
  console.log('Resolved application host')
  const appUrl = `${host}:${port ?? 8098}`
  console.log('Built application URL')

  await app.startAllMicroservices()
  console.log('Started all microservices')
  await app.listen(port ?? 8098, host.replace('http://', ''))
  console.log('Application listening')

  const lastColonIndex = appUrl.lastIndexOf(':')
  console.log('Calculated last colon index for app URL')
  const coloredUrl =
    '\x1b[36m' + appUrl.slice(0, lastColonIndex) +
    '\x1b[34m:\x1b[31m' +
    appUrl.slice(lastColonIndex + 1) +
    '\x1b[0m'
  console.log('Prepared colored application URL')

  const envUc = env?.toUpperCase() ?? 'DEVELOPMENT'
  console.log('Normalized environment label for logging')

  logger.log(`MercurionWebNode started in \x1b[36m${envUc} \x1b[32menvironment`)
  console.log('Logged startup environment')

  logger.log(`Fastify listening on ${coloredUrl}`)
  console.log('Logged Fastify listening URL')

  const lastColonIndexNats = natsUrl.lastIndexOf(':')
  console.log('Calculated last colon index for NATS URL')
  const coloredNatsUrl =
    '\x1b[36m' + natsUrl.slice(0, lastColonIndexNats) +
    '\x1b[34m:\x1b[31m' +
    natsUrl.slice(lastColonIndexNats + 1) +
    '\x1b[0m'
  console.log('Prepared colored NATS URL')

  logger.log(`NATS client connected to NATS server on ${coloredNatsUrl}`)
  console.log('Logged NATS connection')

}

bootstrap()
console.log('Invoked bootstrap function')
