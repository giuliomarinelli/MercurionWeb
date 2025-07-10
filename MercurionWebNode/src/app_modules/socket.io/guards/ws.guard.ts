import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Socket } from 'socket.io';
import { TokenType } from 'src/app_modules/auth/Models/enums/token-type.enum';
import { JwtToolsService } from 'src/app_modules/auth/services/jwt-tools.service';
import { SessionService } from 'src/app_modules/auth/services/session.service';
import { IS_PUBLIC_KEY } from 'src/metadata/metadata';

@Injectable()
export class WsGuard implements CanActivate {

  private readonly logger = new Logger(WsGuard.name)

  constructor(
    private readonly jwtTools: JwtToolsService,
    private readonly sessionService: SessionService,
    private readonly reflector: Reflector
  ) { }

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {

    const isPublic = this.reflector.get<boolean>(IS_PUBLIC_KEY, context.getHandler())
    if (isPublic) {
      return true // ✅ Permette l'accesso senza autenticazione
    }

    if (context.getType() === 'ws') {
      return this.validateWebSocketEvent(context)
    }

    return false
  }

  // 🔹 Validazione per EVENTI WebSocket
  private async validateWebSocketEvent(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient()
    const token = client.handshake.query.token as string
    const deviceId = client.handshake.query.deviceId as string

    if (!token || !deviceId) {
      this.unauthorized(client)
      return false
    }

    try {

      const payload = await this.jwtTools.verifyTokenAndGetPayload(token, TokenType.ws_AccessToken)

      if (!await this.sessionService.validateSession(payload.sid, deviceId)) {
        this.unauthorized(client)
        return false
      }

      // 🔹 Inietta lo userId e gli scope nei dati della socket
      client.data.userId = payload.sub
      client.data.scopes = payload.scp?.split(' ') ?? []
      return true
    } catch {
      this.unauthorized(client)
      return false
    }
  }

  private unauthorized(client: Socket): void {
    client.emit('sv.pub.err', { detail: 'Unauthorized' })
  }

}
