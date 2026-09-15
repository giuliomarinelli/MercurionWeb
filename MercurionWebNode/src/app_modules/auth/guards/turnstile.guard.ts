import {
  Injectable, CanActivate, ExecutionContext, UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FastifyRequest } from 'fastify'
import { TurnstileService } from '../services/turnstile.service';
import { Environment } from 'src/config/config.schema';
import type { AppConfiguration } from 'src/config/config.types';


@Injectable()

export class TurnstileGuard implements CanActivate {

  constructor(
    private readonly turnstile: TurnstileService,
    private readonly configService: ConfigService
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {

    const appConfiguration =
      this.configService.getOrThrow<AppConfiguration>('App')
    const turnstileDisabled =
      appConfiguration.env === Environment.Development &&
      appConfiguration.disableTurnstile
    if (turnstileDisabled) return true

    const req = context.switchToHttp().getRequest<FastifyRequest>()

    const token = req.headers['x-challenge-token'] as string
    if (!token) throw new UnauthorizedException('Turnstile::Missing challenge token')

    const remoteIp = req.headers['x-client-ip'] as string
    const valid = await this.turnstile.verifyToken(token, remoteIp)

    if (!valid) throw new UnauthorizedException('Turnstile::Invalid challenge token')
    return true

  }
}
