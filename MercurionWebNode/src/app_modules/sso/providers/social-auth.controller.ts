import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { FastifyReply } from 'fastify/types/reply';
import { ClientIp, Public } from 'src/metadata/metadata';
import { SocialAuthService } from '../services/social-auth.service';
import { AuthProvider } from '../Models/enums/auth-provider.enum';
import { CookieConfiguration, SecureCookieConfiguration } from 'src/config/config.types';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { SecureCookieService } from 'src/app_modules/auth/services/secure-cookie.service';
import { ResponseService } from 'src/services/response.service';
import { SSO_LoginDTO } from '../Models/DTO/sso-login.dto';



@Controller('oauth2/sso')
export class SocialAuthController {

  private readonly LONG_SESSION_TTL: number
  private readonly cookieConf: CookieConfiguration

  constructor(
    private readonly socialAuth: SocialAuthService,
    private readonly configService: ConfigService,
    private readonly secureCookieService: SecureCookieService,
    private readonly _r: ResponseService
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { secret: _omit, ...cookieConf } = this.configService.get<SecureCookieConfiguration>('SecureCookie')!
    this.cookieConf = cookieConf
    this.LONG_SESSION_TTL = this.configService.get<number>('Session.persistentSessionLasting')!
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
    @Res({ passthrough: true }) reply: FastifyReply
  ): Promise<SSO_LoginDTO> {
    const deviceId = randomUUID()
    const { sessionId, ...tokenPair } = await this.socialAuth.loginWithProvider(provider, code, ip, deviceId)
    this.secureCookieService.setSignedCookie(reply, '__device_id', deviceId, {
      ...this.cookieConf,
      maxAge: 31_556_952
    })
    this.secureCookieService.setSignedCookie(reply, '__node_session_id', sessionId, {
      ...this.cookieConf,
      maxAge: this.LONG_SESSION_TTL
    })
    return {
      ...this._r.ok('Authenticated successfully'),
      ...tokenPair,
      sso_flow: true,
      sso_provider: provider,
      needs_browser_info: true
    }
  }
}
