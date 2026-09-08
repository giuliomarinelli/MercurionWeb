import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Socket } from 'socket.io';
import { TokenType } from 'src/app_modules/auth/Models/enums/token-type.enum';
import { JwtToolsService } from 'src/app_modules/auth/services/jwt-tools.service';
import { SecureCookieService } from 'src/app_modules/auth/services/secure-cookie.service';
import { SessionService } from 'src/app_modules/auth/services/session.service';
import { IS_PUBLIC_KEY } from 'src/metadata/metadata';
import { WebSocketUtils } from 'src/utils/web-socket-utils/web-socket-utils';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';
import { MeiliContextLogger } from 'src/app_modules/meilisearch/Models/interfaces/meili-context-logger.interface';
import { ScopeService } from 'src/app_modules/auth/services/scope.service';
import {
  socketEventRegistry,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from '@mercurion/socket-contracts';
import {
  ApplicationErrorCode,
  getApplicationError,
  isApplicationError
} from 'src/exception-handling/application-error';
import {
  getApplicationErrorDefinition,
  sessionInvalidationCauseForApplicationError,
  SessionInvalidationCause,
  SessionState,
  type SessionInvalidationCauseType
} from '@mercurion/rest-contracts';
import {
  createCorrelationId,
  createSocketApplicationError
} from 'src/exception-handling/application-error-envelope';

type ApplicationSocket = Socket<ClientToServerEvents, ServerToClientEvents>

@Injectable()
export class WsGuard implements CanActivate {

  private readonly logger: MeiliContextLogger

  constructor(
    private readonly jwtTools: JwtToolsService,
    private readonly sessionService: SessionService,
    private readonly reflector: Reflector,
    private readonly secureCookieService: SecureCookieService,
    private readonly scopeService: ScopeService,
    loggerFactory: MeiliLoggerService
  ) {
    this.logger = loggerFactory.forContext(WsGuard.name)
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {

    const isPublic = this.reflector.get<boolean>(IS_PUBLIC_KEY, context.getHandler())
    if (isPublic) {
      return true // ✅ Permette l'accesso senza autenticazione
    }

    if (context.getType() === 'ws') {
      return this.validateWebSocketEvent(context)
    }

    return false
  }

  // 🔹 Validazione per EVENTI WebSocket
  private async validateWebSocketEvent(context: ExecutionContext): Promise<boolean> {
    const client: ApplicationSocket = context.switchToWs().getClient()
    const token = client.handshake.auth.token as string
    const rawDeviceId: string | undefined = WebSocketUtils.parseCookie(client.handshake.headers.cookie)['__device_id'] || undefined
    let deviceId: string | undefined
    if (rawDeviceId) {
      try {
        deviceId = this.secureCookieService.verifyAndParseCookie(rawDeviceId)
      } catch {
        this.unauthorized(client, SessionInvalidationCause.InvalidSignature)
        return false
      }
    }
    const rawSessionId: string | undefined = WebSocketUtils.parseCookie(client.handshake.headers.cookie)['__node_session_id'] || undefined
    let sessionId: string | undefined
    if (rawSessionId) {
      try {
        sessionId = this.secureCookieService.verifyAndParseCookie(rawSessionId)
      } catch {
        this.unauthorized(client, SessionInvalidationCause.InvalidSignature)
        return false
      }
    }

    if (!token || !deviceId || !sessionId) {
      this.unauthorized(client, SessionInvalidationCause.InvalidCredentials)
      return false
    }

    try {
            
      const payload = await this.jwtTools.verifyTokenAndGetPayload(token, TokenType.ws_AccessToken)

      await this.scopeService.scopeVerificationLayer(payload.sub, context, this.reflector, payload.scp)

      if (sessionId !== payload.sid) {
        this.unauthorized(client, SessionInvalidationCause.InvalidSession)
        return false
      }

      if (!await this.sessionService.validateSession(payload.sid, deviceId, payload.sub)) {
        this.unauthorized(client, SessionInvalidationCause.InvalidSession)
        return false
      }

      // 🔹 Inietta lo userId e gli scope nei dati della socket
      client.data.userId = payload.sub
      client.data.sessionId = payload.sid
      client.data.scopes = this.scopeService.generateScopesArrayFromJwtClaim(payload.scp)
      this.logger.debug?.(`Socket ${client.id} polling connection state: PRIVATE (Authenticated)`)
      return true
    } catch (e) {
      if (isApplicationError(e, ApplicationErrorCode.PERMISSION_DENIED)) {
        const applicationError = getApplicationError(e)!
        client.emit(socketEventRegistry.applicationError.name, createSocketApplicationError({
          status: getApplicationErrorDefinition(applicationError.code).httpStatus,
          code: applicationError.code,
          message: applicationError.message,
          details: applicationError.details,
          correlationId: createCorrelationId(client.id),
          isProduction: (process.env.APP_ENV ?? 'development') !== 'development'
        }))
        return false
      }
      const applicationError = getApplicationError(e)
      this.unauthorized(
        client,
        applicationError
          ? sessionInvalidationCauseForApplicationError(applicationError.code)
          : SessionInvalidationCause.InvalidCredentials
      )
      return false
    }
  }

  private unauthorized(
    client: ApplicationSocket,
    cause: SessionInvalidationCauseType = SessionInvalidationCause.InvalidSession
  ): void {
    client.emit(socketEventRegistry.sessionExpired.name, {
      detail: 'session expired',
      state: SessionState.Invalid,
      cause
    })
    client.emit(socketEventRegistry.applicationError.name, createSocketApplicationError({
      status: getApplicationErrorDefinition(ApplicationErrorCode.AUTHENTICATION_UNAUTHORIZED).httpStatus,
      code: ApplicationErrorCode.AUTHENTICATION_UNAUTHORIZED,
      message: getApplicationErrorDefinition(ApplicationErrorCode.AUTHENTICATION_UNAUTHORIZED).defaultMessage ?? 'Unauthorized',
      correlationId: createCorrelationId(client.id),
      isProduction: (process.env.APP_ENV ?? 'development') !== 'development'
    }))
    client.disconnect()
  }

}
