import {
   CanActivate,
   ExecutionContext,
   ForbiddenException,
   Injectable,
   UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql'
import { RpcException } from '@nestjs/microservices'
import { FastifyReply, FastifyRequest } from 'fastify'
import { timingSafeEqual, UUID } from 'node:crypto'

import { IS_PUBLIC_KEY, IS_SOFT_AUTHORIZATION } from 'src/metadata/metadata'
import { TypeGuards } from 'src/utils/type-guards/type-guards'

import { JwtToolsService } from '../services/jwt-tools.service'
import { SessionService } from '../services/session.service'
import { ScopeService } from '../services/scope.service'

import { TokenType } from '../Models/enums/token-type.enum'
import { AppJwtPayload } from '../Models/interfaces/app-jwt-payload.interface'

import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service'
import { MeiliContextLogger } from 'src/app_modules/meilisearch/Models/interfaces/meili-context-logger.interface'

@Injectable()
export class GlobalGuard implements CanActivate {
   private readonly logger: MeiliContextLogger

   private tokenType: TokenType = TokenType.AccessToken
   // Small grace window before revoking an expired token to avoid race conditions on concurrent refreshes
   private readonly refreshRevocationDelayMs = 1500

   constructor(
      private readonly jwtToolsService: JwtToolsService,
      private readonly sessionService: SessionService,
      private readonly reflector: Reflector,
      private readonly scopeService: ScopeService,
      loggerFactory: MeiliLoggerService,
   ) {
      this.logger = loggerFactory.forContext(GlobalGuard.name)
   }

   async canActivate(context: ExecutionContext): Promise<boolean> | never {

      const isPublic = this.reflector.get<boolean>(IS_PUBLIC_KEY, context.getHandler())
      if (isPublic) return true

      const isSoftAuth = !!this.reflector.get<boolean>(
         IS_SOFT_AUTHORIZATION,
         context.getHandler(),
      )

      if (context.getType() === 'http' || context.getType<GqlContextType>() === 'graphql') {
         return this.validateHttpRequest(context, isSoftAuth)
      }

      return false
   }

   private async validateHttpRequest(
      context: ExecutionContext,
      isSoftAuth: boolean,
   ): Promise<boolean> | never {

      let req = context.switchToHttp().getRequest<FastifyRequest>()
      let reply = context.switchToHttp().getResponse<FastifyReply>()

      if (context.getType<GqlContextType>() === 'graphql') {
         req = (GqlExecutionContext.create(context).getContext().request as FastifyRequest)
         reply = (GqlExecutionContext.create(context).getContext().reply as FastifyReply)
      }

      // request-scoped locals
      const sessionId = (req.headers['x-session-id'] as UUID | undefined) ?? undefined

      let accessToken = ''
      let newToken = ''
      let payload: AppJwtPayload | undefined
      let userId: UUID | undefined

      try {
         accessToken = this.jwtToolsService.extractAccessTokenFromReq(req)

         try {

            payload = await this.jwtToolsService.verifyTokenAndGetPayload(
               accessToken,
               TokenType.AccessToken,
            )

            userId = payload.sub

            await this.scopeService.scopeVerificationLayer(
               payload.sub,
               context,
               this.reflector,
               payload.scp,
            )

         } catch (e) {
            // refresh flow: only for expired/invalid access token
            if (e instanceof RpcException && e.message === 'InvalidOrExpiredAccessToken') {
               if (this.tokenType !== TokenType.AccessToken) throw e

               payload = await this.jwtToolsService.verifyTokenAndGetPayload(
                  accessToken,
                  TokenType.AccessToken,
                  true, // ignore expiration (but still verify signature)
               )

               userId = payload.sub

               this.logger.debug(`Expired access token, jti=${payload.jti}, trying to refresh`)

               await this.scopeService.scopeVerificationLayer(
                  payload.sub,
                  context,
                  this.reflector,
                  payload.scp,
               )

               const deviceId = req.headers['x-device-id'] as string | null | undefined
               if (!deviceId) {
                  this.logger.warn('[Refreshing] No provided deviceId')
                  throw new UnauthorizedException()
               }

               // session id must exist and match token sid (timing-safe)
               const headerSid = (req.headers['x-session-id'] ?? '') as string
               if (
                  !headerSid ||
                  !payload.sid ||
                  headerSid.length !== payload.sid.length ||
                  !timingSafeEqual(Buffer.from(headerSid), Buffer.from(payload.sid))
               ) {
                  this.logger.warn('[Refreshing] Cookie sessionId and old token claim sid mismatch')
                  throw new UnauthorizedException()
               }

               if (!(await this.sessionService.validateSession(payload.sid, deviceId, payload.sub))) {
                  this.logger.warn('[Refreshing] Invalid session or expired session')
                  throw new UnauthorizedException()
               }

               newToken = await this.jwtToolsService.generateToken(
                  payload.sub,
                  TokenType.AccessToken,
                  payload.sid,
               )

               await this.sessionService.updateLastAccessed(payload.sid, payload.sub)

               reply.header('X-New-Access-Token', encodeURIComponent(newToken))
               req.headers['x-new-access-token'] = newToken

               // revoke old jti after a small delay (race-safe)
               setTimeout(() => {
                  void this.sessionService.revokeToken(payload!.jti)
               }, this.refreshRevocationDelayMs).unref?.()

               req.headers['x-user-id'] = payload.sub

               req.headers['x-scopes'] = JSON.stringify(
                  await this.scopeService.verifyUserClaimScopesConsistencyThenGetScopes(
                     payload.sub,
                     newToken,
                  ),
               )

               return true
            }

            // otherwise bubble up
            throw e
         }

         // normal flow (token valid)
         const deviceId = req.headers['x-device-id'] as string | undefined ?? undefined
         if (!deviceId) {
            this.logger.warn('[Normal flow] No provided deviceId')
            throw new UnauthorizedException()
         }

         if ((req.headers['x-session-id'] as string | undefined) !== payload.sid) {
            this.logger.warn('[Normal flow] Cookie sessionId and accessToken claim sid mismatch')
            throw new UnauthorizedException()
         }

         if (!(await this.sessionService.validateSession(payload.sid, deviceId, payload.sub))) {
            this.logger.warn('[Normal flow] Invalid or expired session')
            throw new UnauthorizedException()
         }

         await this.sessionService.updateLastAccessed(payload.sid, payload.sub)

         req.headers['x-user-id'] = payload.sub

         req.headers['x-scopes'] = JSON.stringify(
            await this.scopeService.verifyUserClaimScopesConsistencyThenGetScopes(
               payload.sub,
               accessToken,
            ),
         )

         return true

      } catch (e) {

         // Build debug info (non-fatal)
         const newTokenPayload = newToken ? this.jwtToolsService.decodeUnsafe(newToken) : null
         const oldTokenPayload = accessToken ? this.jwtToolsService.decodeUnsafe(accessToken) : null

         let newJti = ''
         let oldJti = ''
         let newTokenSid = ''
         let oldTokenSid = ''

         if (newTokenPayload) {
            if (TypeGuards.isThruthyString(newTokenPayload.jti)) newJti = newTokenPayload.jti
            if (TypeGuards.isThruthyString(newTokenPayload.sid)) newTokenSid = newTokenPayload.sid
         }

         if (oldTokenPayload) {
            if (TypeGuards.isThruthyString(oldTokenPayload.jti)) oldJti = oldTokenPayload.jti
            if (TypeGuards.isThruthyString(oldTokenPayload.sid)) oldTokenSid = oldTokenPayload.sid
         }

         const cookieSid = (req.headers['x-session-id'] as string) ?? ''
         const deviceId = (req.headers['x-device-id'] as string) ?? ''

         const arr = [oldJti, oldTokenSid, newJti, cookieSid, newTokenSid, deviceId]
         const errorInfo = arr
            .filter((val) => !!val)
            .map((val, i) => {
               let key = ''
               switch (i) {
                  case 0:
                     key = 'current_access_token_jti'
                     break
                  case 1:
                     key = 'current_access_token_session_id'
                     break
                  case 2:
                     key = 'refreshed_access_token_jti'
                     break
                  case 3:
                     key = 'cookie_session_id'
                     break
                  case 4:
                     key = 'refreshed_token_session_id'
                     break
                  case 5:
                     key = 'device_id'
                     break
               }
               return `${key}=${val}`
            })
            .join(', ')

         this.logger.debug(
            `Authentication/Authorization error${errorInfo ? ', ' + errorInfo : ''}`,
            (e?.stack ?? e) as object,
         )

         if (e instanceof RpcException && e.message === 'Forbidden::missing permissions') {
            throw new ForbiddenException(e.message)
         }

         const unauthorizedException = isSoftAuth
            ? new UnauthorizedException('Unauthenticated')
            : new UnauthorizedException('Fatal: unauthenticated')

         // SOFT AUTH => never revoke anything
         if (isSoftAuth) {
            throw unauthorizedException
         }

         // 🔹 Fallback userId from unsafe decode (solo se il sid combacia col cookie)
         let fallbackUserId: UUID | undefined

         if (!userId && oldTokenPayload) {
            const tokenSid = TypeGuards.isThruthyString(oldTokenPayload.sid)
               ? oldTokenPayload.sid
               : ''
            const tokenSub = oldTokenPayload.sub as UUID | undefined

            if (
               tokenSub &&
               tokenSid &&
               cookieSid &&
               tokenSid.length === cookieSid.length &&
               timingSafeEqual(Buffer.from(tokenSid), Buffer.from(cookieSid))
            ) {
               fallbackUserId = tokenSub
            }
         }

         const effectiveUserId: UUID | undefined = userId ?? fallbackUserId

         // Decide if we should revoke (hard auth only)
         const shouldRevoke = this.shouldRevokeOnError(e)

         if (shouldRevoke && sessionId && effectiveUserId) {
            await this.revokeSessionAndTokensPlain(sessionId, effectiveUserId)
         }

         // normalize any auth error into our unauthorizedException
         if (e instanceof RpcException && e.message === 'Unauthorized') {
            throw unauthorizedException
         }
         if (e instanceof UnauthorizedException) {
            this.logger.warn(`Thrown generic UnauthorizedException${errorInfo ? ', ' + errorInfo : ''}`)
            throw unauthorizedException
         }
         if (e instanceof RpcException) {
            this.logger.warn(
               `GlobalGuard internal unknown error as RpcException${errorInfo ? ', ' + errorInfo : ''}`,
               e.stack ?? e,
            )
            throw unauthorizedException
         }

         this.logger.warn(
            `GlobalGuard internal unknown error${errorInfo ? ', ' + errorInfo : ''}`,
            (e?.stack ?? e) as object,
         )
         throw unauthorizedException
      }
   }

   /**
    * Revoke ONLY for auth-relevant failures (avoid nuking sessions on infra glitches).
    */
   private shouldRevokeOnError(e: unknown): boolean {
      // Explicit unauthorized coming from auth/session layers
      if (e instanceof RpcException && e.message === 'Unauthorized') return true
      if (e instanceof RpcException && typeof e.message === 'string') {
         const m = e.message

         // Add here the codes you *know* mean compromised/invalid auth context
         if (m === 'InvalidSessionSignature') return true
         if (m === 'InvalidSession') return true
         if (m === 'UnauthorizedNoSuchSession') return true
         if (m === 'InvalidOrExpiredAccessToken') return true
         // If you have "TokenRevoked"/"InvalidToken"/"InvalidJwtSignature", include them too
      }

      // Plain UnauthorizedException thrown inside guard for mismatches
      if (e instanceof UnauthorizedException) return true

      // For unknown/internal errors: do NOT revoke (avoid collateral damage)
      return false
   }

   private async revokeSessionAndTokensPlain(sessionId: UUID, userId: UUID): Promise<void> {
      try {
         await this.sessionService.destroySessionAndRevokeAllTokensByPlainSessionId(sessionId, userId)
      } catch (e: any) {
         this.logger.warn(` > revokeSessionAndTokensPlain: an ERROR occurred: `, e?.message as string)
         this.logger.verbose(
            ` > revokeSessionAndTokensPlain: an ERROR occurred: `,
            (e?.stack ?? e) as object,
         )
      }
   }
}
