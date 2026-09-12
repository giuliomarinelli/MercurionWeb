import { Injectable, UnauthorizedException } from '@nestjs/common'
import { RpcException } from '@nestjs/microservices'
import { timingSafeEqual, UUID } from 'node:crypto'

import { MeiliContextLogger } from 'src/app_modules/meilisearch/Models/interfaces/meili-context-logger.interface'
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service'
import {
  ApplicationErrorCode,
  applicationHttpException,
  getApplicationError,
  isApplicationError
} from 'src/exception-handling/application-error'
import { TypeGuards } from 'src/utils/type-guards/type-guards'

import type { AppJwtPayload } from '../../Models/interfaces/app-jwt-payload.interface'
import { JwtToolsService } from '../../services/jwt-tools.service'
import { SessionService } from '../../services/session.service'
import { AuthenticationTransportPolicy } from './authentication-transport.policy'
import type {
  AuthenticationAttemptState,
  AuthenticationRequestContext
} from './authentication-policy.types'

@Injectable()
export class AuthenticationFailurePolicy {
  private readonly logger: MeiliContextLogger

  constructor(
    private readonly jwtToolsService: JwtToolsService,
    private readonly sessionService: SessionService,
    private readonly transportPolicy: AuthenticationTransportPolicy,
    loggerFactory: MeiliLoggerService
  ) {
    this.logger = loggerFactory.forContext(AuthenticationFailurePolicy.name)
  }

  async deny(
    context: AuthenticationRequestContext,
    attempt: AuthenticationAttemptState,
    error: unknown
  ): Promise<never> {
    const oldTokenPayload = this.decode(attempt.accessToken)
    const refreshedTokenPayload = this.decode(attempt.refreshedToken)
    const errorInfo = this.buildDiagnostic(
      context,
      oldTokenPayload,
      refreshedTokenPayload
    )

    this.logger.warn(
      `Authentication/Authorization error, stage=${attempt.stage}${errorInfo ? ', ' + errorInfo : ''}`,
      this.stackOrValue(error)
    )

    if (isApplicationError(error, ApplicationErrorCode.PERMISSION_DENIED)) {
      throw applicationHttpException(ApplicationErrorCode.PERMISSION_DENIED)
    }

    const unauthorizedException = context.isSoftAuth
      ? applicationHttpException(
        ApplicationErrorCode.AUTHENTICATION_UNAUTHENTICATED_SOFT
      )
      : applicationHttpException(
        ApplicationErrorCode.AUTHENTICATION_UNAUTHENTICATED_FATAL
      )

    if (context.isSoftAuth) {
      throw unauthorizedException
    }

    const effectiveUserId = attempt.userId
      ?? this.resolveFallbackUserId(context.sessionId, oldTokenPayload)

    if (
      this.shouldRevokeOnError(error)
      && context.sessionId
      && effectiveUserId
    ) {
      await this.revokeSessionAndTokens(context.sessionId, effectiveUserId)
    }

    this.transportPolicy.clearAuthenticationCookies(context)

    if (error instanceof UnauthorizedException) {
      this.logger.warn(
        `Thrown generic UnauthorizedException${errorInfo ? ', ' + errorInfo : ''}`
      )
    } else if (error instanceof RpcException && !getApplicationError(error)) {
      this.logger.warn(
        `GlobalGuard internal unknown error as RpcException${errorInfo ? ', ' + errorInfo : ''}`,
        this.stackOrValue(error)
      )
    } else if (
      !isApplicationError(error, ApplicationErrorCode.AUTHENTICATION_UNAUTHORIZED)
    ) {
      this.logger.warn(
        `GlobalGuard internal unknown error${errorInfo ? ', ' + errorInfo : ''}`,
        this.stackOrValue(error)
      )
    }

    throw unauthorizedException
  }

  private decode(token: string | undefined): AppJwtPayload | null {
    if (!token) {
      return null
    }
    try {
      return this.jwtToolsService.decodeUnsafe(token)
    } catch {
      return null
    }
  }

  private buildDiagnostic(
    context: AuthenticationRequestContext,
    oldPayload: AppJwtPayload | null,
    refreshedPayload: AppJwtPayload | null
  ): string {
    const values: Array<[string, unknown]> = [
      ['current_access_token_jti', oldPayload?.jti],
      ['current_access_token_session_id', oldPayload?.sid],
      ['refreshed_access_token_jti', refreshedPayload?.jti],
      ['cookie_session_id', context.sessionId],
      ['refreshed_token_session_id', refreshedPayload?.sid],
      ['device_id', context.deviceId]
    ]

    return values
      .filter((entry): entry is [string, string] =>
        TypeGuards.isThruthyString(entry[1])
      )
      .map(([key, value]) => `${key}=${value}`)
      .join(', ')
  }

  private resolveFallbackUserId(
    sessionId: string | undefined,
    payload: AppJwtPayload | null
  ): UUID | undefined {
    const tokenSessionId = TypeGuards.isThruthyString(payload?.sid)
      ? payload.sid
      : ''
    const tokenUserId = payload?.sub

    if (
      !tokenUserId
      || !tokenSessionId
      || !sessionId
      || tokenSessionId.length !== sessionId.length
      || !timingSafeEqual(Buffer.from(tokenSessionId), Buffer.from(sessionId))
    ) {
      return undefined
    }

    return tokenUserId
  }

  private shouldRevokeOnError(error: unknown): boolean {
    const applicationError = getApplicationError(error)
    if (applicationError) {
      switch (applicationError.code) {
        case ApplicationErrorCode.AUTHENTICATION_UNAUTHORIZED:
        case ApplicationErrorCode.SESSION_SIGNATURE_INVALID:
        case ApplicationErrorCode.SESSION_INVALID:
        case ApplicationErrorCode.SESSION_NOT_FOUND:
        case ApplicationErrorCode.ACCESS_TOKEN_INVALID_OR_EXPIRED:
          return true
        default:
          return false
      }
    }

    return error instanceof UnauthorizedException
  }

  private async revokeSessionAndTokens(
    sessionId: UUID,
    userId: UUID
  ): Promise<void> {
    try {
      await this.sessionService.destroySessionAndRevokeAllTokensByPlainSessionId(
        sessionId,
        userId
      )
    } catch (error) {
      this.logger.warn(
        ' > revokeSessionAndTokens: an ERROR occurred: ',
        this.messageOrValue(error)
      )
      this.logger.verbose(
        ' > revokeSessionAndTokens: an ERROR occurred: ',
        this.stackOrValue(error)
      )
    }
  }

  private messageOrValue(error: unknown): string | object {
    if (error && typeof error === 'object' && 'message' in error) {
      const message = (error as { message?: unknown }).message
      if (typeof message === 'string') {
        return message
      }
    }
    return this.stackOrValue(error)
  }

  private stackOrValue(error: unknown): string | object {
    if (error && typeof error === 'object') {
      const stack = (error as { stack?: unknown }).stack
      return typeof stack === 'string' ? stack : error
    }
    return String(error)
  }
}
