import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
// import { randomUUID, UUID } from 'crypto';
// import { nullish } from 'src/Models/nullish.type';
// import { MoleculeSyncService } from '../meilisearch/services/molecule-sync.service';
import { LoggerService, OnModuleInit, UseGuards } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import { MoleculeDetailSyncService } from '../meilisearch/services/molecule-detail-sync.service';
import Redis from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';
import { WsGuard } from './guards/ws.guard';
import { PubSubService } from '../redis/services/pub-sub.service';
import { Public } from 'src/metadata/metadata';
import { UUID } from 'crypto';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';



@WebSocketGateway()
@UseGuards(WsGuard)
export class SocketIOGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, OnModuleInit {

  private readonly logger: LoggerService

  @WebSocketServer()
  private readonly server: Server

  private connectedClients = new Map<string, string>(); // userId -> socketId

  constructor(
    // private readonly moleculeSyncService: MoleculeSyncService,
    // private readonly moleculeDetailSyncService: MoleculeDetailSyncService,
    // private readonly configService: ConfigService,
    private readonly pubSubService: PubSubService,
    meiliLogger: MeiliLoggerService
  ) {
    this.logger = meiliLogger.forContext(SocketIOGateway.name)
  }

  onModuleInit() {
    // this.handleDetailSync()
  }

  afterInit(server: Server) {
    const pubClient = new Redis({ host: 'localhost', port: 6378 })
    const subClient = pubClient.duplicate()
    server.adapter(createAdapter(pubClient, subClient))
    this.pubSubService.setSocketServer(server)
    this.logger.log('Socket.IO Redis Adapter e PubSubService pronti! 🚀')
  }


  async handleConnection(client: Socket) {
    this.logger.log(`🔗 Connected socket ${client.id}`)
  }


  handleDisconnect(client: Socket): void {
    this.logger.log(`🔗 Disconnected socket ${client.id}`)
  }

  private getSessionId(client: Socket): string | undefined {
    return client.data?.sessionId as (string | undefined)
  }

  private getUserId(client: Socket): UUID | undefined {
    return client.data?.userId as (UUID | undefined)
  }

  private joinUserRooms(client: Socket): void {

    const sessionId = client.data?.sessionId as string | undefined
    const userId = client.data?.userId?.toString() as string | undefined

    if (sessionId && userId) {
      if (!client.rooms.has(`ws_session:${sessionId}`)) {
        client.join(`ws_session:${sessionId}`)
        this.logger.log(`Socket ${client.id} joinato a ws_session:${sessionId}`)
      }
      if (!client.rooms.has(`ws_user:${userId}`)) {
        client.join(`ws_user:${userId}`);
        this.logger.log(`Socket ${client.id} joinato a ws_user:${userId}`)
      }

    } else {
      this.logger.warn(`Nessun sessionId o userId trovato per il client ${client.id} (socketId: ${client.id})`)
    }
  }


  @Public()
  @SubscribeMessage('so.pub.public_test')
  handlePublicTest(@MessageBody() data: string, @ConnectedSocket() client: Socket): void {
    client.emit('sv.pub.public_test', (data ?? '') + ' RESP')
  }

  @SubscribeMessage('so.pub.private_test')
  handlePrivateTest(@MessageBody() data: string, @ConnectedSocket() client: Socket): void {
    this.joinUserRooms(client)
    this.server.to(`ws_user:${this.getUserId(client)!}`).emit('sv.pub.private_test', (data ?? '') + ' PRIVATE RESP')
  }

  @SubscribeMessage('so.pub.session_init')
  handleSessionInit(@ConnectedSocket() client: Socket): { detail: string } {
    this.joinUserRooms(client)
    return { detail: 'websocket session init successful' }
  }




  // TODO: Da spostare in nuova applicazione che in locale gestisce la sincronizzazione ChEMBL SQL => Meilisearch 
  // // 🔹 Evento pubblico senza autenticazione
  // @Public()
  // @SubscribeMessage('publicEvent')
  // handlePublicEvent(@MessageBody() data: any) {
  //   this.logger.log('Evento pubblico ricevuto:', data);
  // }

  // // 🔒 Evento protetto con autenticazione (gestito automaticamente dalla `GlobalGuard`)
  // @SubscribeMessage('protectedEvent')
  // async handleProtectedEvent(@MessageBody() message: { to: string; content: string }, client: Socket) {
  //   if (!client.data.userId) {
  //     client.emit('error', { message: 'Unauthorized' });
  //     return;
  //   }

  //   this.logger.log(`📩 Messaggio ricevuto: ${JSON.stringify(message)}`);
  //   this.server.to(message.to).emit('message', message);
  // }


  // // Molecule Melisearch Sync TODO: gestione scopes
  // @Public()
  // @SubscribeMessage('molecule_sync_start_mol_prev_sync')
  // async handleSync(@MessageBody() _data: any, client: Socket) {
  //   const scopes: string[] = client.data.scopes ?? []
  //   if (!scopes.includes(Scope.SystemSettings)) {
  //     client.emit('error', { message: 'Forbidden' })
  //     return
  //   }
  //   this.syncInBackground()
  // }

  // private async syncInBackground() {
  //   await this.moleculeSyncService.syncAllMoleculesWithProgress((progress) => {
  //     this.server.emit('molecule_sync_sync_progress', progress)
  //   })

  //   this.server.emit('molecule_sync_sync_done', { message: 'Sync completed!' })
  // }

  // @SubscribeMessage('molecule_sync_start_mol_detail_sync')
  // async handleDetailSync(@MessageBody() _data: any, client: Socket) {
  //   const scopes: string[] = client.data.scopes ?? []
  //   if (!scopes.includes(Scope.SystemSettings)) {
  //     client.emit('error', { message: 'Forbidden' })
  //     return
  //   }
  //   this.logger.log('Handling detail sync...')
  //   this.syncDetailInBackground()
  // }

  // private async syncDetailInBackground() {
  //   await this.moleculeDetailSyncService.syncAllMoleculesWithProgress((progress) => {
  //     this.server.emit('molecule_detail_sync_progress', progress);
  //   })

  //   this.server.emit('molecule_detail_sync_done', { message: 'Detail sync completed!' })
  // }

}


