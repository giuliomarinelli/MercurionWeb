import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Socket } from 'socket.io';
import { TokenType } from 'src/app_modules/auth/Models/enums/token-type.enum';
import { JwtToolsService } from 'src/app_modules/auth/services/jwt-tools.service';
import { SecureCookieService } from 'src/app_modules/auth/services/secure-cookie.service';
import { SessionService } from 'src/app_modules/auth/services/session.service';
import { IS_PUBLIC_KEY } from 'src/metadata/metadata';
import { WebSocketUtils } from 'src/web-socket-utils/web-socket-utils';

@Injectable()
export class WsGuard implements CanActivate {

  private readonly logger = new Logger(WsGuard.name)

  constructor(
    private readonly jwtTools: JwtToolsService,
    private readonly sessionService: SessionService,
    private readonly reflector: Reflector,
    private readonly secureCookieService: SecureCookieService
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
    const token = client.handshake.auth.token as string
    const rawDeviceId: string | undefined = WebSocketUtils.parseCookie(client.handshake.headers.cookie)['__device_id'] || undefined
    let deviceId: string | undefined  
    if (rawDeviceId) {
      try {
        deviceId = this.secureCookieService.verifyAndParseCookie(rawDeviceId)
      } catch {
        this.unauthorized(client)
        return false
      }
    }
    const rawSessionId: string | undefined = WebSocketUtils.parseCookie(client.handshake.headers.cookie)['__node_session_id'] || undefined
    let sessionId: string | undefined
    if (rawSessionId) {
      try {
        sessionId = this.secureCookieService.verifyAndParseCookie(rawSessionId)
      } catch {
        this.unauthorized(client)
        return false
      }
    }

    if (!token || !deviceId || !sessionId) {
      this.unauthorized(client)
      return false
    }

    try {

      const payload = await this.jwtTools.verifyTokenAndGetPayload(token, TokenType.ws_AccessToken)

      if (sessionId !== payload.sid) {
        this.unauthorized(client)
        return false
      }

      if (!await this.sessionService.validateSession(payload.sid, deviceId)) {
        this.unauthorized(client)
        return false
      }

      // 🔹 Inietta lo userId e gli scope nei dati della socket
      client.data.userId = payload.sub
      client.data.sessionId = payload.sid
      client.data.scopes = payload.scp?.split(' ') ?? []
      this.logger.debug(`Socket ${client.id} polling connection state: PRIVATE (Authenticated)`)
      return true
    } catch {
      this.unauthorized(client)
      return false
    }
  }
  
  private unauthorized(client: Socket): void {
    client.emit('sv.pub.err', { detail: 'Unauthorized' })
    this.logger.debug(`Socket ${client.id} polling connection state: PUBLIC`)

  }

}
