import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtToolsService } from '../services/jwt-tools.service';
import { SessionService } from '../services/session.service';
import { IS_PUBLIC_KEY } from 'src/metadata/metadata';
import { TokenType } from '../Models/enums/token-type.enum';
import { FastifyReply, FastifyRequest } from 'fastify';
import { Socket } from 'socket.io';
import { Reflector } from '@nestjs/core';
import { SecureCookieService } from '../services/secure-cookie.service';
import { randomUUID } from 'crypto';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';


@Injectable()
export class GlobalGuard implements CanActivate {
  constructor(
    private readonly jwtToolsService: JwtToolsService,
    private readonly sessionService: SessionService,
    private readonly secureCookieService: SecureCookieService,
    private readonly reflector: Reflector
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {

    const handleDeviceId = (context: ExecutionContext): void => {

      let req = context.switchToHttp().getRequest<FastifyRequest>()
      let res = context.switchToHttp().getResponse<FastifyReply>()

      if (context.getType() === 'http') {
        req = context.switchToHttp().getRequest<FastifyRequest>();
        res = context.switchToHttp().getResponse<FastifyReply>();
      } else if (context.getType<GqlContextType>() === 'graphql') {
        const graphqlContext = GqlExecutionContext.create(context);
        req = graphqlContext.getContext().req as FastifyRequest
        res = graphqlContext.getContext().res as FastifyReply
      }

      let deviceId: string | null = null;

      try {
        deviceId = this.secureCookieService.getSignedCookie(req, '__device_id');
      } catch {
        deviceId = randomUUID();
        this.secureCookieService.setSignedCookie(res, '__device_id', deviceId, { maxAge: 31556952000 });
      }

      req.headers['x-device-id'] = deviceId;
    }



    handleDeviceId(context)

    // 🔹 Controlla se la route o l'evento WS ha il decoratore `@Public()`
    const isPublic = this.reflector.get<boolean>(IS_PUBLIC_KEY, context.getHandler())
    if (isPublic) {
      return true // ✅ Permetti l'accesso senza autenticazione
    }

    if (context.getType() === 'http' || context.getType<GqlContextType>() === 'graphql') {
      return this.validateHttpRequest(context)
    }

    if (context.getType() === 'ws') {
      return this.validateWebSocketEvent(context)
    }

    throw new UnauthorizedException()
  }

  // 🔹 Validazione per richieste HTTP
  private async validateHttpRequest(context: ExecutionContext): Promise<boolean> {

    const req = context.getType() === 'http' ?
      context.switchToHttp().getRequest<FastifyRequest>()
      : GqlExecutionContext.create(context).getContext().req as FastifyRequest

    try {
      const token = this.jwtToolsService.extractAccessTokenFromReq(req)
      const payload = await this.jwtToolsService.verifyTokenAndGetPayload(token, TokenType.AccessToken)
      const deviceId = req.headers['x-device-id'] as string

      if (!deviceId) {
        throw new UnauthorizedException()
      }

      if (!await this.sessionService.validateSession(payload.sid, deviceId)) {
        throw new UnauthorizedException()
      }

      // 🔹 Inietta lo userId e la sessionId negli headers per il backend HTTP
      req.headers['x-user-id'] = payload.sub
      req.headers['x-session-id'] = payload.sid
      return true;
    } catch (e) {
      throw new UnauthorizedException(e.message || undefined)
    }
  }

  // 🔹 Validazione per EVENTI WebSocket
  private async validateWebSocketEvent(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient()
    const token = client.handshake.query.token as string
    const deviceId = client.handshake.query.deviceId as string

    if (!token || !deviceId) {
      return false
    }

    try {

      const payload = await this.jwtToolsService.verifyTokenAndGetPayload(token, TokenType.AccessToken)

      if (!await this.sessionService.validateSession(payload.sid, deviceId)) {
        return false
      }

      // 🔹 Inietta lo userId nei dati della socket
      client.data.userId = payload.sub
      return true
    } catch {
      client.emit('s_pub_err_event_emitter', { message: 'Unauthorized' })
      return false
    }
  }
}
