import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtToolsService } from '../services/jwt-tools.service';
import { SessionService } from '../services/session.service';
import { FastifyRequest } from 'fastify';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from 'src/metadata/metadata';
import { TokenType } from '../Models/enums/token-type.enum';


@Injectable()
export class GlobalGuard implements CanActivate {

  constructor(
    private readonly jwtToolsService: JwtToolsService,
    private readonly sessionService: SessionService,
    private readonly reflector: Reflector
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 🔹 Controlla se la route ha il decorator `@Public()`
    const isPublic = this.reflector.get<boolean>(IS_PUBLIC_KEY, context.getHandler())
    if (isPublic) {
      return true // Permetti l'accesso senza autenticazione
    }

    const req = context.switchToHttp().getRequest<FastifyRequest>()

    try {
      // 🔹 Estrarre il token JWT dalla richiesta
      const token = this.jwtToolsService.extractAccessTokenFromReq(req)

      // 🔹 Verifica il token e ottieni il payload
      const payload = await this.jwtToolsService.verifyTokenAndGetPayload(token, TokenType.AccessToken)

      // 🔹 Estrai il `deviceId` dalla richiesta (iniettato dal `DeviceIdInterceptor`)
      const deviceId = req.headers['x-device-id'] as string
      if (!deviceId) {
        throw new UnauthorizedException('Device ID missing')
      }

      // 🔹 Validare la sessione associata al token
      const isSessionValid = await this.sessionService.validateSession(payload.sid, deviceId)
      if (!isSessionValid) {
        throw new UnauthorizedException('Invalid or expired session')
      }

      // 🔹 Inietta solo lo userId negli header della richiesta
      req.headers['x-user-id'] = payload.sub

      return true;
    } catch (error) {
      throw new UnauthorizedException(error.message || 'Unauthorized')
    }
  }
}
