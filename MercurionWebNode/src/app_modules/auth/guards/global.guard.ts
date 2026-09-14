import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'

import { IS_PUBLIC_KEY, IS_SOFT_AUTHORIZATION } from 'src/metadata/metadata'

import { AccessTokenAuthenticationPolicy } from './policies/access-token-authentication.policy'
import { AuthenticationFailurePolicy } from './policies/authentication-failure.policy'
import type { AuthenticationAttemptState } from './policies/authentication-policy.types'
import { AuthenticationRequestContextFactory } from './policies/authentication-request-context.factory'
import { AuthenticationTransportPolicy } from './policies/authentication-transport.policy'
import { CredentialExtractionPolicy } from './policies/credential-extraction.policy'
import { ScopeAuthorizationPolicy } from './policies/scope-authorization.policy'
import { SessionValidationPolicy } from './policies/session-validation.policy'

@Injectable()
export class GlobalGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly contextFactory: AuthenticationRequestContextFactory,
    private readonly credentialPolicy: CredentialExtractionPolicy,
    private readonly authenticationPolicy: AccessTokenAuthenticationPolicy,
    private readonly scopePolicy: ScopeAuthorizationPolicy,
    private readonly sessionPolicy: SessionValidationPolicy,
    private readonly transportPolicy: AuthenticationTransportPolicy,
    private readonly failurePolicy: AuthenticationFailurePolicy
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.get<boolean>(IS_PUBLIC_KEY, context.getHandler())) {
      return true
    }

    if (!this.contextFactory.supports(context)) {
      return false
    }

    const requestContext = this.contextFactory.create(
      context,
      !!this.reflector.get<boolean>(
        IS_SOFT_AUTHORIZATION,
        context.getHandler()
      )
    )
    const attempt: AuthenticationAttemptState = { stage: 'credential' }

    try {
      attempt.accessToken = this.credentialPolicy.extractAccessToken(requestContext)

      attempt.stage = 'authentication'
      const authentication = await this.authenticationPolicy.authenticate(
        attempt.accessToken
      )
      attempt.payload = authentication.payload
      attempt.userId = authentication.payload.sub

      attempt.stage = 'authorization'
      await this.scopePolicy.authorize(requestContext, authentication.payload)

      attempt.stage = 'session'
      await this.sessionPolicy.validate(
        requestContext,
        authentication.payload,
        authentication.mode
      )

      if (authentication.mode === 'refresh') {
        attempt.stage = 'refresh'
        attempt.refreshedToken = await this.authenticationPolicy.issueRefreshedToken(
          authentication.payload
        )
        await this.sessionPolicy.touch(authentication.payload)
        this.transportPolicy.setRefreshedAccessToken(
          requestContext,
          attempt.refreshedToken
        )
        this.authenticationPolicy.scheduleRevocation(authentication.payload)
      } else {
        await this.sessionPolicy.touch(authentication.payload)
      }

      attempt.stage = 'principal'
      this.transportPolicy.setAuthenticatedUser(
        requestContext,
        authentication.payload.sub
      )
      this.transportPolicy.setScopes(
        requestContext,
        await this.scopePolicy.resolveGrantedScopes(authentication.payload)
      )
      return true
    } catch (error) {
      return this.failurePolicy.deny(requestContext, attempt, error)
    }
  }
}
