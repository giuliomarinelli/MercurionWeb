import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import Redis from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';
import { WsGuard } from './guards/ws.guard';
import { PubSubService } from '../redis/services/pub-sub.service';
import { Public } from 'src/metadata/metadata';
import { UUID } from 'crypto';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';
import { MeiliContextLogger } from 'src/app_modules/meilisearch/Models/interfaces/meili-context-logger.interface';
import { ConfigService } from '@nestjs/config';
import { RedisConfiguration } from 'src/config/config.types';
import { JwtToolsService } from '../auth/services/jwt-tools.service';
import { TokenType } from '../auth/Models/enums/token-type.enum';
import {
  socketEventRegistry,
  type ClientToServerEvents,
  type ServerToClientEvents,
  type SocketEventPayload,
  type SocketSessionInitAcknowledgement,
} from '@mercurion/socket-contracts';

type ApplicationServer = Server<ClientToServerEvents, ServerToClientEvents>
type ApplicationSocket = Socket<ClientToServerEvents, ServerToClientEvents>


@WebSocketGateway()
@UseGuards(WsGuard)
export class SocketIOGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {

  private readonly logger: MeiliContextLogger
  private readonly redisConf: RedisConfiguration

  @WebSocketServer()
  private readonly server: ApplicationServer

  constructor(
    private readonly configService: ConfigService,
    private readonly pubSubService: PubSubService,
    private readonly jwtTools: JwtToolsService,
    loggerFactory: MeiliLoggerService
  ) {
    this.logger = loggerFactory.forContext(SocketIOGateway.name)
    this.redisConf = this.configService.get<RedisConfiguration>('Redis')!
  }

  afterInit(server: ApplicationServer) {
    const pubClient = new Redis({
      host: this.redisConf.host,
      port: this.redisConf.port,
      password: this.redisConf.password
    })
    const subClient = pubClient.duplicate()
    server.adapter(createAdapter(pubClient, subClient))
    this.pubSubService.setSocketServer(server)
    this.logger.log('Socket.IO Redis Adapter e PubSubService pronti! 🚀')
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
    } catch (e: any) {
      this.logger.warn(`WS auth fallita su handleConnection per ${client.id}: ${e?.message || e}`);
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
        client.join(`ws_session:${sessionId}`)
        this.logger.debug(`Socket ${client.id} joinato a ws_session:${sessionId}`)
      }
      if (!client.rooms.has(`ws_user:${userId}`)) {
        client.join(`ws_user:${userId}`);
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
    return { detail: 'websocket session init successful' }
  }

}
