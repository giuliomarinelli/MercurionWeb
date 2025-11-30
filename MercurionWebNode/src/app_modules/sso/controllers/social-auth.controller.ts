import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { FastifyReply } from 'fastify/types/reply';
import { Public } from 'src/metadata/metadata';
import { SocialAuthService } from '../services/social-auth.service';
import { AuthProvider } from '../Models/enums/auth-provider.enum';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';



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
  async login(
    @Param('provider') provider: AuthProvider,
    @Res() reply: FastifyReply
  ): Promise<void> {
    const state = await this.socialAuth.getOauth2TempState(provider)
    const url = this.socialAuth.getAuthorizationUrl(provider, state)
    reply.redirect(url, 302)
  }

  @Public()
  @Get(':provider/callback')
  async callback(
    @Param('provider') provider: AuthProvider,
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() reply: FastifyReply
  ): Promise<void> {
    const onError = (code = '') => {
      let errorRedirectUrl = `${this.base}/login?err=sso_failed&provider=${provider}`
      if (code) {
        errorRedirectUrl += `&code=${encodeURIComponent(code)}`
      }
      reply.redirect(errorRedirectUrl, 302)
      return
    }
    const isValidState = await this.socialAuth.validateCallbackState(state, provider)
    if (!isValidState) {
      onError('SSO_Unauthorized::callback_flow_invalid_state')
    }
    try {
      const sso_pat = await this.socialAuth.loginWithProvider(provider, code)
      const redirectUrl = `${this.base}/oauth2/callback?t=${sso_pat}&provider=${provider}`
      reply.redirect(redirectUrl, 302)
      return
    } catch (e) {
      if (e instanceof RpcException && e.message === 'SSO_Unauthorized::failed_callback_flow') {
        onError(e.message)
      }
      onError()
    }
  }
}
