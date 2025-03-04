import { WebSocketGateway, SubscribeMessage, MessageBody, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UUID } from 'crypto';
import { nullish } from 'src/Models/nullish.type';
import { Public } from 'src/metadata/metadata';

@WebSocketGateway({ cors: { origin: '*' } }) 
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {

  @WebSocketServer()
  server: Server

  private connectedClients = new Map<string, string>(); // userId -> socketId

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
}
