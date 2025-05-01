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
import { randomUUID } from 'crypto'
import { SecureCookieService } from './app_modules/auth/services/secure-cookie.service'


(async () => {
  copyBootstrapFiles()
  const logger = new Logger('Bootstrap')
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter())
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
  app.enableCors({
    credentials: true,
    allowedHeaders: '*',
    origin: configService.get<string[]>('App.corsOrigins'),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']
  })
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  await app.register(fastifyCookie)
  const fastify = app.getHttpAdapter().getInstance()   // istanza Fastify reale

  fastify.addHook('onRequest', (req, reply, done) => {

    let deviceId: string | null = null

    try {
      deviceId = secureCookieService.getSignedCookie(req, '__device_id')
    } catch {
      deviceId = randomUUID()
      secureCookieService.setSignedCookie(reply, '__device_id', deviceId, { maxAge: 31556952000 })
    }

    // 🔥 Inietta deviceId nella richiesta PRIMA della guard
    req.headers['x-device-id'] = deviceId
    done()
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

})()

