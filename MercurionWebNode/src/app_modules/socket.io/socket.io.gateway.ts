import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { randomUUID, UUID } from 'crypto';
import { nullish } from 'src/Models/nullish.type';
// import { MoleculeSyncService } from '../meilisearch/services/molecule-sync.service';
import { Logger, OnModuleInit, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// import { MoleculeDetailSyncService } from '../meilisearch/services/molecule-detail-sync.service';
import Redis from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';


@WebSocketGateway()
@UseGuards()
export class SocketIOGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, OnModuleInit {

  private readonly logger = new Logger(SocketIOGateway.name)

  @WebSocketServer()
  private readonly server: Server

  private connectedClients = new Map<string, string>(); // userId -> socketId

  constructor(
    // private readonly moleculeSyncService: MoleculeSyncService,
    // private readonly moleculeDetailSyncService: MoleculeDetailSyncService,
    private readonly configService: ConfigService
  ) { }

  onModuleInit() {
    // this.handleDetailSync()
  }

  afterInit(server: Server) {
    const pubClient = new Redis({ host: 'localhost', port: 6378 })
    const subClient = pubClient.duplicate()
    server.adapter(createAdapter(pubClient, subClient))
  }


  async handleConnection(client: Socket) {
    const userId = client.data.userId as UUID | nullish;
    if (!userId) {
      this.connectedClients.set(`UNLOGGED-${randomUUID()}`, client.id)
      this.logger.log(`🔗 Client connected: UNLOGGED (socketId: ${client.id})`);
      return
    }

    this.connectedClients.set(userId, client.id);
    client.join(userId); // 🔹 Unisce il client a una stanza con il suo userId
    this.logger.log(`🔗 Client connected: ${userId} (socketId: ${client.id})`);
  }


  handleDisconnect(client: Socket) {

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


