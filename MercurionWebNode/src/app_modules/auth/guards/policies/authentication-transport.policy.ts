import { Injectable } from '@nestjs/common'
import type { UUID } from 'node:crypto'
import type { Scope } from 'src/app_modules/user/Models/enums/scope.enum'

import { SecureCookieService } from '../../services/secure-cookie.service'
import type { AuthenticationRequestContext } from './authentication-policy.types'

@Injectable()
export class AuthenticationTransportPolicy {
  constructor(private readonly secureCookieService: SecureCookieService) {}

  setRefreshedAccessToken(
    context: AuthenticationRequestContext,
    token: string
  ): void {
    context.reply.header('X-New-Access-Token', encodeURIComponent(token))
    context.request.headers['x-new-access-token'] = token
  }

  setAuthenticatedUser(
    context: AuthenticationRequestContext,
    userId: UUID
  ): void {
    context.request.headers['x-user-id'] = userId
  }

  setScopes(
    context: AuthenticationRequestContext,
    scopes: Scope[]
  ): void {
    context.request.headers['x-scopes'] = JSON.stringify(scopes)
  }

  clearAuthenticationCookies(context: AuthenticationRequestContext): void {
    this.secureCookieService.clearCookie(context.reply, '__node_session_id')
    this.secureCookieService.clearCookie(context.reply, '__logged_in')
  }
}
