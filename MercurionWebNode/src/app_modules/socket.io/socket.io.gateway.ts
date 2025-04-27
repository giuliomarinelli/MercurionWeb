import { WebSocketGateway, SubscribeMessage, MessageBody, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UUID } from 'crypto';
import { nullish } from 'src/Models/nullish.type';
import { Public } from 'src/metadata/metadata';
import { MoleculeSyncService } from '../meilisearch/services/molecule-sync.service';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: '*'
  }
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {

  private readonly logger = new Logger(SocketGateway.name)

  @WebSocketServer()
  private server: Server

  private connectedClients = new Map<string, string>(); // userId -> socketId

  constructor(
    private readonly moleculeSyncService: MoleculeSyncService,
    private readonly configService: ConfigService
  ) { }

  afterInit(server: Server) {
    const port = this.configService.get<number>('App.port') ?? 8099
    const addressInfo = server?.httpServer?.address();
    if (addressInfo && typeof addressInfo === 'object') {
      const internalport = addressInfo.port;
      this.logger.log(`SocketGateway started on port ${port + ':' + internalport}`)
    } else {
      this.logger.log(`SocketGateway started on port ${port}`)
    }
  }

  // 🔹 Connessione WebSocket (l'utente è già validato dalla `GlobalGuard`)
  async handleConnection(client: Socket) {
    const userId = client.data.userId as UUID | nullish;
    if (!userId) {
      client.disconnect()
      return;
    }

    this.connectedClients.set(userId, client.id);
    client.join(userId); // 🔹 Unisce il client a una stanza con il suo userId
    console.log(`🔗 Client connected: ${userId} (socketId: ${client.id})`);
  }

  // 🔹 Disconnessione WebSocket
  handleDisconnect(client: Socket) {
    const userId = [...this.connectedClients.entries()].find(([, socketId]) => socketId === client.id)?.[0];

    if (userId) {
      this.connectedClients.delete(userId);
      console.log(`🔌 Client disconnected: ${userId} (socketId: ${client.id})`);
    }
  }

  // 🔹 Evento pubblico senza autenticazione
  @Public()
  @SubscribeMessage('publicEvent')
  handlePublicEvent(@MessageBody() data: any) {
    console.log('Evento pubblico ricevuto:', data);
  }

  // 🔒 Evento protetto con autenticazione (gestito automaticamente dalla `GlobalGuard`)
  @SubscribeMessage('protectedEvent')
  async handleProtectedEvent(@MessageBody() message: { to: string; content: string }, client: Socket) {
    if (!client.data.userId) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    console.log(`📩 Messaggio ricevuto: ${JSON.stringify(message)}`);
    this.server.to(message.to).emit('message', message);
  }


  // Molecule Melisearch Sync TODO: gestione scopes
  @Public()
  @SubscribeMessage('molecule_sync_start_mol_prev_sync')
  async handleSync() {
    // Inizia sync senza bloccare
    this.syncInBackground()
  }

  private async syncInBackground() {
    await this.moleculeSyncService.syncAllMoleculesWithProgress((progress) => {
      this.server.emit('molecule_sync_sync_progress', progress)
    });

    this.server.emit('molecule_sync_sync_done', { message: 'Sync completed!' })
  }
}


