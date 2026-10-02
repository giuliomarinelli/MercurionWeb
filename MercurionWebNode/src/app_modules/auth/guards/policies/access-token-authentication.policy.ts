import { Injectable } from '@nestjs/common'
import { SecurityService } from '../../services/security.service'
import { ApplicationErrorCode, isApplicationError } from 'src/exception-handling/application-error'
import { LoggerContext } from 'src/logging/logger.port'
import { LoggerPort } from 'src/logging/logger.port'

import { TokenType } from '../../models/enums/token-type.enum'
import type { AppJwtPayload } from '../../models/interfaces/app-jwt-payload.interface'
import { JwtToolsService } from '../../services/jwt-tools.service'
import { SessionService } from '../../services/session.service'
import type { AccessTokenAuthenticationResult } from './authentication-policy.types'

@Injectable()
export class AccessTokenAuthenticationPolicy {
  private readonly logger: LoggerContext
  private readonly refreshRevocationDelayMs = 1500

  constructor(
    private readonly jwtToolsService: JwtToolsService,
    private readonly sessionService: SessionService,
    private readonly securityService: SecurityService,
    loggerFactory: LoggerPort
  ) {
    this.logger = loggerFactory.forContext(AccessTokenAuthenticationPolicy.name)
  }

  async authenticate(accessToken: string): Promise<AccessTokenAuthenticationResult> {
    try {
      return {
        mode: 'current',
        payload: await this.jwtToolsService.verifyTokenAndGetPayload(
          accessToken,
          TokenType.AccessToken
        )
      }
    } catch (error) {
      if (!isApplicationError(
        error,
        ApplicationErrorCode.ACCESS_TOKEN_INVALID_OR_EXPIRED
      )) {
        throw error
      }

      const payload = await this.jwtToolsService.verifyTokenAndGetPayload(
        accessToken,
        TokenType.AccessToken,
        true
      )
      this.logger.warn(
        `Expired access token, jti=${payload.jti}, trying to refresh`
      )
      return { mode: 'refresh', payload }
    }
  }

  issueRefreshedToken(payload: AppJwtPayload): Promise<string> {
    return this.jwtToolsService.generateToken(
      this.securityService.decryptUserId(payload.sub),
      TokenType.AccessToken,
      payload.sid
    )
  }

  scheduleRevocation(payload: AppJwtPayload): void {
    setTimeout(() => {
      void this.sessionService.revokeToken(payload.jti)
    }, this.refreshRevocationDelayMs).unref?.()
  }
}
