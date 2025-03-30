import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtToolsService } from '../services/jwt-tools.service';
import { TokenType } from '../Models/enums/token-type.enum';
import { FastifyRequest } from 'fastify';

@Injectable()
export class JwtByTypeGuard implements CanActivate {

  constructor(
    private readonly reflector: Reflector,
    private readonly jwtTools: JwtToolsService
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    
    const tokenType = this.reflector.get<TokenType>('tokenType', context.getHandler())

    if (!tokenType || tokenType === TokenType.AccessToken) return false

    const request: FastifyRequest = context.switchToHttp().getRequest()

    const token = this.jwtTools.extractAccessTokenFromReq(request)
    const payload = await this.jwtTools.verifyTokenAndGetPayload(token, tokenType)

    // Inietta lo userId in un header custom accessibile nel controller
    request.headers['x-user-id'] = payload.sub

    return true
    
  }

  

}
