import { Injectable, UnauthorizedException } from '@nestjs/common'
import { timingSafeEqual } from 'node:crypto'
import { SecurityService } from '../../services/security.service'
import { LoggerContext } from 'src/logging/logger.port'
import { LoggerPort } from 'src/logging/logger.port'
import type { AppJwtPayload } from '../../models/interfaces/app-jwt-payload.interface'
import { SessionService } from '../../services/session.service'
import type {
  AccessTokenAuthenticationMode,
  AuthenticationRequestContext
} from './authentication-policy.types'

@Injectable()
export class SessionValidationPolicy {
  private readonly logger: LoggerContext

  constructor(
    private readonly sessionService: SessionService,
    private readonly securityService: SecurityService,
    loggerFactory: LoggerPort
  ) {
    this.logger = loggerFactory.forContext(SessionValidationPolicy.name)
  }

  async validate(
    context: AuthenticationRequestContext,
    payload: AppJwtPayload,
    mode: AccessTokenAuthenticationMode
  ): Promise<void> {
    const prefix = mode === 'refresh' ? '[Refreshing]' : '[Normal flow]'
    if (!context.deviceId) {
      this.logger.warn(`${prefix} No provided deviceId`)
      throw new UnauthorizedException()
    }

    const userId = this.securityService.decryptUserId(payload.sub)

    const sessionMatches = mode === 'refresh'
      ? this.matchesRefreshSession(context.sessionId, payload.sid)
      : context.sessionId === payload.sid

    if (!sessionMatches) {
      this.logger.warn(
        mode === 'refresh'
          ? '[Refreshing] Cookie sessionId and old token claim sid mismatch'
          : '[Normal flow] Cookie sessionId and accessToken claim sid mismatch'
      )
      throw new UnauthorizedException()
    }

    if (!(await this.sessionService.validateSession(
      payload.sid,
      context.deviceId,
      userId
    ))) {
      this.logger.warn(
        mode === 'refresh'
          ? '[Refreshing] Invalid session or expired session'
          : '[Normal flow] Invalid or expired session'
      )
      throw new UnauthorizedException()
    }
  }

  touch(payload: AppJwtPayload): Promise<void> {
    const userId = this.securityService.decryptUserId(payload.sub)
    return this.sessionService.updateLastAccessed(payload.sid, userId)
  }

  private matchesRefreshSession(
    headerSessionId: string | undefined,
    tokenSessionId: string | undefined
  ): boolean {
    return !!headerSessionId
      && !!tokenSessionId
      && headerSessionId.length === tokenSessionId.length
      && timingSafeEqual(Buffer.from(headerSessionId), Buffer.from(tokenSessionId))
  }
}
