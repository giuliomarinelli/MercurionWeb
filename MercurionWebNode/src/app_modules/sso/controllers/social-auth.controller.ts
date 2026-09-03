import { BadRequestException, Controller, Get, Param, Query, Res } from '@nestjs/common';
import { FastifyReply } from 'fastify/types/reply';
import { Public } from 'src/metadata/metadata';
import { SocialAuthService } from '../services/social-auth.service';
import { AuthProvider } from '../Models/enums/auth-provider.enum';
import { ConfigService } from '@nestjs/config';
import {
  ApplicationErrorCode,
  getApplicationError,
  isApplicationError
} from 'src/exception-handling/application-error';
import { TypeGuards } from 'src/utils/type-guards/type-guards';



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
    @Query('redirect_to') redirectTo: string,
    @Res() reply: FastifyReply
  ): Promise<void> {
    const normalizedProvider = typeof provider === 'string' ? provider.trim() : provider
    if (!TypeGuards.isAuthProvider(normalizedProvider)) {
      throw new BadRequestException('Invalid provider')
    }
    const state = await this.socialAuth.getOauth2TempState(normalizedProvider, redirectTo ?? '')
    const url = this.socialAuth.getAuthorizationUrl(normalizedProvider, state)
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
    const normalizedProvider = typeof provider === 'string' ? provider.trim() : provider
    if (!TypeGuards.isAuthProvider(normalizedProvider)) {
      throw new BadRequestException('SSO_BadRequest::Invalid provider')
    }
    const normalizedCode = typeof code === 'string' ? code.trim() : code
    const normalizedState = typeof state === 'string' ? state.trim() : state
    const onError = (code = '') => {
      let errorRedirectUrl = `${this.base}/login?err=sso_failed&provider=${encodeURIComponent(normalizedProvider)}`
      if (code) {
        errorRedirectUrl += `&code=${encodeURIComponent(code)}`
      }
      reply.redirect(errorRedirectUrl, 302)
      return
    }
    const isValidState = await this.socialAuth.validateCallbackState(normalizedState, normalizedProvider)
    if (!isValidState) {
      onError('SSO_Unauthorized::callback_flow_invalid_state')
    }
    try {
      const sso_pat = await this.socialAuth.loginWithProvider(normalizedProvider, normalizedCode)
      let redirectUrl = `${this.base}/oauth2/callback?provider=${encodeURIComponent(normalizedProvider)}`
      const redirectTo = await this.socialAuth.retrieveRedirectTo(state, provider)
      if (redirectTo) {
        redirectUrl += `&redirect_to=${encodeURIComponent(redirectTo)}`
      }
      redirectUrl += `#t=${encodeURIComponent(sso_pat)}`
      reply.redirect(redirectUrl, 302)
      return
    } catch (e) {
      if (isApplicationError(e, ApplicationErrorCode.SSO_CALLBACK_FAILED)) {
        onError(getApplicationError(e)?.message)
      }
      onError()
    }
  }
}
