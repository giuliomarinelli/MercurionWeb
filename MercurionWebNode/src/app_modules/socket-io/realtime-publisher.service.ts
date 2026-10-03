import { Injectable } from '@nestjs/common'
import { Server } from 'socket.io'
import type {
  ClientToServerEvents,
  ServerToClientEventName,
  ServerToClientEvents
} from '@mercurion/socket-contracts'

type ApplicationServer = Server<ClientToServerEvents, ServerToClientEvents>

@Injectable()
export class RealtimePublisherService {
  private server: ApplicationServer | undefined

  setServer(server: ApplicationServer): void {
    this.server = server
  }

  emitToUser<EventName extends ServerToClientEventName>(
    userId: string,
    eventName: EventName,
    ...args: Parameters<ServerToClientEvents[EventName]>
  ): void {
    this.requireServer()
      .to(`ws_user:${userId}`)
      .emit(eventName, ...args)
  }

  emitToUserExceptClient<EventName extends ServerToClientEventName>(
    userId: string,
    clientInstanceId: string | undefined,
    eventName: EventName,
    ...args: Parameters<ServerToClientEvents[EventName]>
  ): void {
    const target = this.requireServer().to(`ws_user:${userId}`)
    const scoped = clientInstanceId
      ? target.except(`ws_client:${clientInstanceId}`)
      : target
    scoped.emit(eventName, ...args)
  }

  emitToSession<EventName extends ServerToClientEventName>(
    sessionId: string,
    eventName: EventName,
    ...args: Parameters<ServerToClientEvents[EventName]>
  ): void {
    this.requireServer()
      .to(`ws_session:${sessionId}`)
      .emit(eventName, ...args)
  }

  private requireServer(): ApplicationServer {
    if (!this.server) {
      throw new Error('Realtime Socket.IO server is not initialized')
    }
    return this.server
  }
}
