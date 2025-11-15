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
import { randomUUID } from 'crypto'
import { SecureCookieService } from './app_modules/auth/services/secure-cookie.service'
import { Environment } from './config/config'
import { SecureCookieConfiguration } from './config/config.types'
import { routeAwareMax } from './config/rate-limit.config'
import { RedisService } from './app_modules/redis/services/redis.service'
import { isIP } from 'net' // 🔒 valida IP
import { MeiliLoggerService } from './app_modules/meilisearch/services/meili-logger.service'

function isValidIp(ip?: string): boolean {
  return !!ip && isIP(ip) !== 0
}

export async function bootstrap() {

  copyBootstrapFiles()

  const logLevels = new Set<LogLevel>(['error', 'warn', 'log', 'debug', 'verbose', 'fatal'])

  if ((process.env.NODE_ENV ?? 'development') !== 'development') {
    logLevels.delete('debug')
    logLevels.delete('verbose')
  }

  // 🔒 trustProxy per IP reali dietro CF/NGINX
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ trustProxy: true }),
    { logger: Array.from(logLevels) }
  )

  const configService = app.get<ConfigService>(ConfigService)
  const secureCookieService = app.get<SecureCookieService>(SecureCookieService)
  const redisService = app.get<RedisService>(RedisService)
  const loggerFactory = app.get<MeiliLoggerService>(MeiliLoggerService)
  const logger = loggerFactory.forContext('Bootstrap')
  
  logger.setLogLevels(Array.from(logLevels))
  
  const env = configService.get<Environment>('App.env')

  const natsPort = configService.get<number>('App.natsPort') ?? 4223
  const natsHost = configService.get<string>('App.natsHost')
  const natsUrl: string = `${natsHost}:${natsPort}`

  app.useWebSocketAdapter(new IoAdapter(app))
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.NATS,
    options: { servers: [natsUrl] },
  })

  app.useGlobalFilters(new HttpExceptionFilter())
  app.setGlobalPrefix('api')

  await app.register(helmet, {
    // CSP: in dev spesso rompe (Playground, HMR, ecc.),
    // quindi la teniamo solo in produzione.
    contentSecurityPolicy:
      configService.get<Environment>('App.env') === Environment.Production
        ? {
          useDefaults: true,
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:'],
            fontSrc: ["'self'", 'data:'],
            connectSrc: [
              "'self'",
              'https:',
              'wss:',
            ],
            objectSrc: ["'none'"],
            baseUri: ["'none'"],
            frameAncestors: ["'none'"],
            formAction: ["'self'"],
          },
        }
        : false,

    // niente referrer
    referrerPolicy: {
      policy: 'no-referrer'
    },

    // niente embedding di risorse da altri origin
    crossOriginResourcePolicy: {
      policy: 'same-origin'
    },

    // isolamento finestra (anti XS-Leaks)
    crossOriginOpenerPolicy: {
      policy: 'same-origin'
    },

    // COEP spesso rompe con librerie che non mettono i header giusti:
    // lo tieni off finché non decidi di fare la combo COEP+COOP+CORP.
    crossOriginEmbedderPolicy: false,

    // vieta qualsiasi iframe
    frameguard: { action: 'deny' },

    // togliere X-Powered-By se dovesse spuntare da qualche parte
    hidePoweredBy: true,

    // HSTS solo in produzione e solo se stai servendo via HTTPS dietro
    // Cloudflare/Nginx in modo coerente.
    hsts:
      configService.get<Environment>('App.env') === Environment.Production
        ? {
          maxAge: 31536000, // 1 anno
          includeSubDomains: true,
          preload: true,
        }
        : false,
  })


  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,             // rimuove campi extra
    forbidNonWhitelisted: true,  // 400 se arrivano campi sconosciuti
    forbidUnknownValues: true,
    transformOptions: { enableImplicitConversion: true }
  }))

  await app.register(fastifyCookie)

  const fastify = app.getHttpAdapter().getInstance()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { secret, ...cookieConf } = configService.get<SecureCookieConfiguration>('SecureCookie')!

  // 🔒 Hook precoce: genera/sovrascrive header interni (anti-spoof)
  fastify.addHook('onRequest', (req, reply, done) => {

    req.headers['x-device-id'] = undefined
    req.headers['x-session-id'] = undefined
    req.headers['x-client-ip'] = undefined

    let deviceId: string | null = null

    try {
      deviceId = secureCookieService.getSignedCookie(req, '__device_id')
    } catch {
      deviceId = randomUUID()
      secureCookieService.setSignedCookie(reply, '__device_id', deviceId, {
        maxAge: 31_556_952, // ~1 anno in secondi
        ...cookieConf
      })
    }

    req.headers['x-device-id'] = deviceId

    try {
      req.headers['x-session-id'] = secureCookieService.getSignedCookie(req, '__node_session_id')
    } catch {
      req.headers['x-session-id'] = undefined
    }

    const isDev = configService.get<Environment>('App.env') === Environment.Development
    const mockIp = req.headers['x-mock-ip']?.toString().trim()

    const cfIpRaw = req.headers['cf-connecting-ip']?.toString().trim()
    const cfIp = isValidIp(cfIpRaw) ? cfIpRaw : undefined

    req.headers['x-client-ip'] = isDev && mockIp ? mockIp : (cfIp || req.ip)
    done()
  })

  // Parser multipart passthrough
  fastify.addContentTypeParser('multipart/form-data', (req, payload, done) => {
    done(null, req)
  })

  fastify.addHook('onSend', (req, reply, payload, done) => {
    reply.header('Cache-Control', 'no-store')
    const DISABLE_ALL = '()'
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
    done()
  })

  // 🔒 Rate limit distribuito (Redis), finestra 5 minuti chiara (ms)
  await app.register(rateLimit, {
    hook: 'preHandler',
    timeWindow: 5 * 60 * 1000, // 5 minutes
    keyGenerator: (req) => {
      const dev = (req.headers['x-device-id'] as string) || ''
      const ip = (req.headers['x-client-ip'] as string) || req.ip || ''
      return `${dev}|${ip}`
    },
    max: (req) => routeAwareMax(req),
    skipOnError: true,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    errorResponseBuilder: (req, ctx) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded.`,
      timestamp: new Date().toISOString(),
      requestId: req.id,
      path: req.url?.split('?')[0] || req.url
    }),
    redis: redisService.getClient(),
    nameSpace: 'ratelimit:'
  })


  const port = configService.get<number>('App.port')
  const host = configService.get<string>('App.host') as string
  const appUrl = `${host}:${port ?? 8099}`

  await app.listen(port ?? 8099, host.replace('http://', ''))
  await app.startAllMicroservices()

  const lastColonIndex = appUrl.lastIndexOf(':')
  const coloredUrl =
    '\x1b[36m' + appUrl.slice(0, lastColonIndex) +
    '\x1b[34m:\x1b[31m' +
    appUrl.slice(lastColonIndex + 1) +
    '\x1b[0m'

  logger.log(`MercurionWebNode started in \x1b[36m${env} \x1b[32menvironment`)

  logger.log(`Fastify listening on ${coloredUrl}`)

  const lastColonIndexNats = natsUrl.lastIndexOf(':')
  const coloredNatsUrl =
    '\x1b[36m' + natsUrl.slice(0, lastColonIndexNats) +
    '\x1b[34m:\x1b[31m' +
    natsUrl.slice(lastColonIndexNats + 1) +
    '\x1b[0m'

  logger.log(`NATS client connected to NATS server on ${coloredNatsUrl}`)

}

bootstrap()
