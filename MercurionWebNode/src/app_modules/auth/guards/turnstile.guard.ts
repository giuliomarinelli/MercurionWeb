import {
  Injectable, CanActivate, ExecutionContext, UnauthorizedException
} from '@nestjs/common';
import { FastifyRequest } from 'fastify'
import { TurnstileService } from '../services/turnstile.service';



@Injectable()

export class TurnstileGuard implements CanActivate {

  constructor(private readonly turnstile: TurnstileService) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {

    const req = context.switchToHttp().getRequest<FastifyRequest>()

    const token = req.headers['x-challenge-token'] as string
    if (!token) throw new UnauthorizedException('Turnstile::Missing challenge token')

    const remoteIp = req.headers['x-client-ip'] as string
    const valid = await this.turnstile.verifyToken(token, remoteIp)

    if (!valid) throw new UnauthorizedException('Turnstile::Invalid challenge token')
    return true

  }
}
