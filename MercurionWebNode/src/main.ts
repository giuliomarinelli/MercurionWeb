import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { Logger } from '@nestjs/common'
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
import { SecureCookieConfiguration } from './config/@types-config'
import { routeAwareMax } from './config/rate-limit.config'


export async function bootstrap() {
  copyBootstrapFiles()
  const logger = new Logger('Bootstrap')
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    {
      logger: ["error", "warn", "log", "debug", "verbose"],
    }
  )
  const configService = app.get<ConfigService>(ConfigService)
  const secureCookieService = app.get<SecureCookieService>(SecureCookieService)
  const natsPort = configService.get<number>('App.natsPort') ?? 4223
  const natsHost = configService.get<string>('App.natsHost')
  const natsUrl: string = `${natsHost}:${natsPort}`
  app.useWebSocketAdapter(new IoAdapter(app))
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.NATS,
    options: {
      servers: [natsUrl],
    },
  })
  app.useGlobalFilters(new HttpExceptionFilter())
  app.setGlobalPrefix('api')
  await app.register(helmet, {
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'", "'strict-dynamic'"],
        "object-src": ["'none'"],
        "base-uri": ["'none'"],
        "frame-ancestors": ["'none'"],
        // aggiungere connect-src/img-src/font-src se servono CDN interni
      }
    },
    referrerPolicy: {
      policy:
        'no-referrer'
    },
    crossOriginResourcePolicy: {
      policy: 'same-origin'
    }
  })
  await app.register(fastifyCookie)
  const fastify = app.getHttpAdapter().getInstance()   // istanza Fastify reale
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { secret, ...cookieConf } = configService.get<SecureCookieConfiguration>('SecureCookie')!
  fastify.addHook('onRequest', (req, reply, done) => {

    let deviceId: string | null = null

    try {
      deviceId = secureCookieService.getSignedCookie(req, '__device_id')
    } catch {
      deviceId = randomUUID()
      secureCookieService.setSignedCookie(reply, '__device_id', deviceId, {
        maxAge: 31556952000,
        ...cookieConf
      })
    }

    // 🔥 Inietta deviceId nella richiesta PRIMA della guard
    req.headers['x-device-id'] = deviceId
    try {
      req.headers['x-session-id'] = secureCookieService.getSignedCookie(req, '__node_session_id')
    } catch {
      req.headers['x-session-id'] = undefined
    }

    const isDev = configService.get<Environment>('App.env') === Environment.Development

    const mockIp = req.headers['x-mock-ip']?.toString().trim()

    const cfIp = req.headers['cf-connecting-ip']?.toString().trim()
    req.headers['x-client-ip'] = isDev && mockIp ? mockIp : (cfIp || req.ip)

    done()
  })
  await app.register(rateLimit, {
    hook: 'preHandler',
    timeWindow: '5 minute',
    // Chiave: da preferire deviceId, altrimenti IP reale
    keyGenerator: (req) => {
      const dev = (req.headers['x-device-id'] as string) || '';
      const ip = (req.headers['x-client-ip'] as string) || req.ip || '';
      return `${dev}|${ip}`;
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    max: (req, key) => routeAwareMax(req),
    skipOnError: true,                    // non bloccare in caso di errore interno del plugin
    errorResponseBuilder: (req, ctx) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Retry in ${ctx.after}.`,
      timestamp: new Date().toISOString(),
      requestId: req.id,
      path: req.url
    })
  })
  fastify.addContentTypeParser('multipart/form-data', (req, payload, done) => {
    done(null, req);
  })
  const port = configService.get<number>('App.port')
  const host = configService.get<string>('App.host') as string
  const appUrl = `${host}:${port ?? 8099}`

  await app.listen(port ?? 8099, host.replace('http://', ''))
  await app.startAllMicroservices()

  const lastColonIndex = appUrl.lastIndexOf(':')
  const coloredUrl =
    '\x1b[36m' + appUrl.slice(0, lastColonIndex) +
    '\x1b[34m:\x1b[31m' + // blu + magenta
    appUrl.slice(lastColonIndex + 1) +
    '\x1b[0m';

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

