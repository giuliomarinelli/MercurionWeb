import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { OnApplicationShutdown } from '@nestjs/common'
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import Redis from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';
import { WsGuard } from './guards/ws.guard';
import { PubSubService } from '../redis/services/pub-sub.service';
import { Public } from 'src/metadata/metadata';
import { UUID } from 'crypto';
import { LoggerPort } from 'src/logging/logger.port';
import { LoggerContext } from 'src/logging/logger.port';
import { ConfigService } from '@nestjs/config';
import { RedisConfiguration } from 'src/config/config.types';
import { JwtToolsService } from '../auth/services/jwt-tools.service';
import { TokenType } from '../auth/models/enums/token-type.enum';
import {
  socketEventRegistry,
  type ClientToServerEvents,
  type ServerToClientEvents,
  type SocketHandshakeAuth,
  type SocketEventPayload,
  type SocketSessionInitAcknowledgement,
} from '@mercurion/socket-contracts';
import {
  contractVersionDetails,
  contractVersionWarning,
  negotiateContractMajor
} from '@mercurion/rest-contracts';
import {
  createSocketApplicationError,
  createCorrelationId,
  presentApplicationError
} from 'src/exception-handling/application-error-envelope';

type ApplicationServer = Server<ClientToServerEvents, ServerToClientEvents>
type ApplicationSocket = Socket<ClientToServerEvents, ServerToClientEvents>
type ApplicationSocketMiddleware = Parameters<ApplicationServer['use']>[0]

export function createSocketContractVersionMiddleware(
  logger: Pick<LoggerContext, 'warn'>
): ApplicationSocketMiddleware {
  return (client, next) => {
    const handshakeAuth = client.handshake.auth as SocketHandshakeAuth
    const selection = negotiateContractMajor(handshakeAuth.contractMajor)
    if (selection.kind === 'invalid' || selection.kind === 'unsupported') {
      const error = new Error(selection.code === 'CONTRACT_VERSION_INVALID'
        ? 'Invalid contract major version'
        : 'Unsupported contract major version') as Error & { data?: unknown }
      const presentation = presentApplicationError({
        code: selection.code,
        message: error.message,
        details: contractVersionDetails(selection)
      }, {
        correlationId: createCorrelationId(client.id),
        isProduction: false,
        statusHint: 400
      })
      error.data = createSocketApplicationError(presentation)
      next(error)
      return
    }

    const warning = contractVersionWarning(selection)
    if (warning) logger.warn(`Socket ${client.id}: ${warning}`)
    client.data.contractMajor = selection.selectedMajor
    next()
  }
}


@WebSocketGateway()
@UseGuards(WsGuard)
export class SocketIOGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, OnApplicationShutdown {

  private readonly logger: LoggerContext
  private readonly redisConf: RedisConfiguration
  private initialized = false
  private pubClient: Redis | undefined
  private subClient: Redis | undefined

  @WebSocketServer()
  private readonly server!: ApplicationServer

  constructor(
    private readonly configService: ConfigService,
    private readonly pubSubService: PubSubService,
    private readonly jwtTools: JwtToolsService,
    loggerFactory: LoggerPort
  ) {
    this.logger = loggerFactory.forContext(SocketIOGateway.name)
    this.redisConf = this.configService.get<RedisConfiguration>('Redis')!
  }

  afterInit(server: ApplicationServer) {
    if (this.initialized) return

    server.use(createSocketContractVersionMiddleware(this.logger))
    const pubClient = new Redis({
      host: this.redisConf.host,
      port: this.redisConf.port,
      password: this.redisConf.password
    })
    const subClient = pubClient.duplicate()
    this.pubClient = pubClient
    this.subClient = subClient
    server.adapter(createAdapter(pubClient, subClient))
    this.pubSubService.setSocketServer(server)
    this.initialized = true
    this.logger.log('Socket.IO Redis Adapter e PubSubService pronti! 🚀')
  }

  async onApplicationShutdown(): Promise<void> {
    await Promise.all([
      this.pubClient?.status !== 'end' ? this.pubClient?.quit() : undefined,
      this.subClient?.status !== 'end' ? this.subClient?.quit() : undefined
    ])
  }


  async handleConnection(client: ApplicationSocket) {
    this.logger.log(`🔗 Connected socket ${client.id}`);

    const token = client.handshake.auth?.token as string | undefined;

    if (!token) {
      // connessione PUBLIC, nessun binding alle room utente
      this.logger.log(`Socket ${client.id} connesso in PUBLIC mode`);
      return;
    }

    try {

      const { sub: userId, sid: sessionId } = await this.jwtTools.verifyTokenAndGetPayload(token, TokenType.ws_AccessToken);

      client.data.userId = userId;
      client.data.sessionId = sessionId;

      this.joinUserRooms(client);  // idempotente, usa già .rooms.has(...)
      this.logger.log(
        `Socket ${client.id} autenticato onConnect, bind ws_session:${sessionId}, ws_user:${userId}`
      );
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e)
      this.logger.warn(`WS auth fallita su handleConnection per ${client.id}: ${message}`);
      // se questo gateway è solo privato puoi anche fare:
      // client.disconnect(true);
    }
  }

  handleDisconnect(client: ApplicationSocket): void {
    this.logger.log(`🔗 Disconnected socket ${client.id}`)
  }

  private getUserId(client: ApplicationSocket): UUID | undefined {
    return client.data?.userId as (UUID | undefined)
  }

  private joinUserRooms(client: ApplicationSocket): void {

    const sessionId = client.data?.sessionId as string | undefined
    const userId = client.data?.userId?.toString() as string | undefined

    if (sessionId && userId) {
      if (!client.rooms.has(`ws_session:${sessionId}`)) {
        void client.join(`ws_session:${sessionId}`)
        this.logger.debug(`Socket ${client.id} joinato a ws_session:${sessionId}`)
      }
      if (!client.rooms.has(`ws_user:${userId}`)) {
        void client.join(`ws_user:${userId}`);
        this.logger.debug(`Socket ${client.id} joinato a ws_user:${userId}`)
      }

    } else {
      this.logger.warn(`Nessun sessionId o userId trovato per il client ${client.id} (socketId: ${client.id})`)
    }
  }


  @Public()
  @SubscribeMessage(socketEventRegistry.publicTestRequest.name)
  handlePublicTest(
    @MessageBody() data: SocketEventPayload<typeof socketEventRegistry.publicTestRequest.name>,
    @ConnectedSocket() client: ApplicationSocket
  ): void {
    client.emit(socketEventRegistry.publicTestResponse.name, (data ?? '') + ' RESP')
  }

  @SubscribeMessage(socketEventRegistry.privateTestRequest.name)
  handlePrivateTest(
    @MessageBody() data: SocketEventPayload<typeof socketEventRegistry.privateTestRequest.name>,
    @ConnectedSocket() client: ApplicationSocket
  ): void {
    this.joinUserRooms(client)
    this.server
      .to(`ws_user:${this.getUserId(client)!}`)
      .emit(socketEventRegistry.privateTestResponse.name, (data ?? '') + ' PRIVATE RESP')
  }

  @SubscribeMessage(socketEventRegistry.sessionInit.name)
  handleSessionInit(
    @ConnectedSocket() client: ApplicationSocket
  ): SocketSessionInitAcknowledgement {
    this.joinUserRooms(client)
    return { detail: 'websocket session init successful', state: 'authenticated' }
  }

}
