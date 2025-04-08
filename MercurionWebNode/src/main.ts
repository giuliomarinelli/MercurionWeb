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


(async () => {
  copyBootstrapFiles()
  const logger = new Logger('Bootstrap')
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter())
  const configService = app.get<ConfigService>(ConfigService)
  const natsPort = configService.get<number>('App.natsPort') ?? 4223
  app.useWebSocketAdapter(new IoAdapter())
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.NATS,
    options: {
      servers: [`nats://localhost:${natsPort}`],  
    },
  })
  app.useGlobalFilters(new HttpExceptionFilter())
  app.enableCors({
    credentials: true,
    allowedHeaders: '*',
    origin: configService.get<string[]>('App.corsOrigins'),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTION']
  })
  const port = configService.get<number>('App.port')
  await app.register(fastifyCookie)
  await app.listen(port ?? 8099)
  await app.startAllMicroservices()
  logger.log(`Fastify listening on port ${port}`)
  logger.log(`NATS client connected to NATS server on port ${natsPort}`)
})()

