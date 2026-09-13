import { Injectable, UnauthorizedException } from '@nestjs/common'
import { timingSafeEqual } from 'node:crypto'

import { MeiliContextLogger } from 'src/app_modules/meilisearch/Models/interfaces/meili-context-logger.interface'
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service'

import type { AppJwtPayload } from '../../Models/interfaces/app-jwt-payload.interface'
import { SessionService } from '../../services/session.service'
import type {
  AccessTokenAuthenticationMode,
  AuthenticationRequestContext
} from './authentication-policy.types'

@Injectable()
export class SessionValidationPolicy {
  private readonly logger: MeiliContextLogger

  constructor(
    private readonly sessionService: SessionService,
    loggerFactory: MeiliLoggerService
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
      payload.sub
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
    return this.sessionService.updateLastAccessed(payload.sid, payload.sub)
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
