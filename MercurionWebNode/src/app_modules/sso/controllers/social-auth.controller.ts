import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { FastifyReply } from 'fastify/types/reply';
import { ClientIp, Public } from 'src/metadata/metadata';
import { SocialAuthService } from '../services/social-auth.service';
import { AuthProvider } from '../Models/enums/auth-provider.enum';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';


@Controller('oauth2/sso')
export class SocialAuthController {

  private readonly base: string

  constructor(
    private readonly socialAuth: SocialAuthService,
    private readonly configService: ConfigService,
  ) {
    this.base = this.configService.get<string>('App.activationOrigin')!
  }

  @Public()
  @Get(':provider/login')
  login(
    @Param('provider') provider: AuthProvider,
    @Query('state') state: string,
    @Res() res: FastifyReply,
  ) {
    const url = this.socialAuth.getAuthorizationUrl(provider, state)
    res.raw.writeHead(302, { Location: url })
    res.raw.end()
  }

  @Public()
  @Get(':provider/callback')
  async callback(
    @Param('provider') provider: AuthProvider,
    @Query('code') code: string,
    @ClientIp() ip: string,
    @Res() reply: FastifyReply
  ): Promise<void> {
    const deviceId = randomUUID()
    const sso_pat = await this.socialAuth.loginWithProvider(provider, code, ip, deviceId)
    const redirectUrl = `${this.base}/oauth2/callback?t=${sso_pat}`
    reply.redirect(redirectUrl, 302)
  }
}
