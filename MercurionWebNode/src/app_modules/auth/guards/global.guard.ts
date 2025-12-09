import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtToolsService } from '../services/jwt-tools.service';
import { SessionService } from '../services/session.service';
import { IS_PUBLIC_KEY } from 'src/metadata/metadata';
import { TokenType } from '../Models/enums/token-type.enum';
import { FastifyReply, FastifyRequest } from 'fastify';
import { Reflector } from '@nestjs/core';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';
import { AppJwtPayload } from '../Models/interfaces/app-jwt-payload.interface';
import { RpcException } from '@nestjs/microservices';
import { timingSafeEqual } from 'node:crypto';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';
import { MeiliContextLogger } from 'src/app_modules/meilisearch/Models/interfaces/meili-context-logger.interface';
import { ScopeService } from '../services/scope.service';
import { TypeGuards } from 'src/utils/type-guards/type-guards';




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
      loggerFactory: MeiliLoggerService
   ) {
      this.logger = loggerFactory.forContext(GlobalGuard.name)
   }

   async canActivate(context: ExecutionContext): Promise<boolean> | never {

      // 🔹 Controlla se la route o l'evento WS ha il decoratore `@Public()`
      const isPublic = this.reflector.get<boolean>(IS_PUBLIC_KEY, context.getHandler())
      if (isPublic) {
         return true // ✅ Permette l'accesso senza autenticazione
      }

      if (context.getType() === 'http' || context.getType<GqlContextType>() === 'graphql') {
         return this.validateHttpRequest(context)
      }

      return false
   }

   // 🔹 Validazione per richieste HTTP
   private async validateHttpRequest(context: ExecutionContext): Promise<boolean> | never {

      let req = context.switchToHttp().getRequest<FastifyRequest>()
      let reply = context.switchToHttp().getResponse<FastifyReply>()

      if (context.getType<GqlContextType>() === 'graphql') {
         req = (GqlExecutionContext.create(context).getContext().request as FastifyRequest)
         reply = (GqlExecutionContext.create(context).getContext().reply as FastifyReply)
      }

      let accessToken: string = ''
      let newToken: string = ''
      let payload: AppJwtPayload


      try {

         accessToken = this.jwtToolsService.extractAccessTokenFromReq(req)


         try {            
            payload = await this.jwtToolsService.verifyTokenAndGetPayload(accessToken, TokenType.AccessToken)
            await this.scopeService.scopeVerificationLayer(payload.sub, context, this.reflector, payload.scp)
         } catch (e) {
            
            if (e instanceof RpcException && e.message === 'InvalidOrExpiredAccessToken') {

               if (this.tokenType !== TokenType.AccessToken) {
                  throw e
               }

               payload = await this.jwtToolsService.verifyTokenAndGetPayload(accessToken, TokenType.AccessToken, true)
               
               this.logger.debug(`Expired access token, jti=${payload.jti}, trying to refresh`)

               await this.scopeService.scopeVerificationLayer(payload.sub, context, this.reflector, payload.scp)

               const deviceId = req.headers['x-device-id'] as string | null | undefined

               if (!deviceId) {
                  this.logger.warn('[Refreshing] No provided deviceId')
                  throw new UnauthorizedException()
               }

               if (!timingSafeEqual(Buffer.from((req.headers['x-session-id'] ?? '') as string), Buffer.from(payload.sid))) {
                  this.logger.warn('[Refreshing] Cookie sessionId and old token claim sid mismatch')
                  throw new UnauthorizedException()
               }

               if (!await this.sessionService.validateSession(payload.sid, deviceId, payload.sub)) {
                  this.logger.warn('[Refreshing] Invalid session or expired session')
                  throw new UnauthorizedException()
               }


               newToken = await this.jwtToolsService.generateToken(payload.sub, TokenType.AccessToken, payload.sid)

               await this.sessionService.updateLastAccessed(payload.sid, payload.sub)

               reply.header('X-New-Access-Token', encodeURIComponent(newToken))
               setTimeout(() => {
                  void this.sessionService.revokeToken(payload.jti)
               }, this.refreshRevocationDelayMs).unref?.()
               req.headers['x-user-id'] = payload.sub
               req.headers['x-scopes'] = JSON.stringify(await this.scopeService.verifyUserClaimScopesConsistencyThenGetScopes(payload.sub, newToken))
               return true
            } else {
               throw e
            }
         }

         const deviceId = req.headers['x-device-id'] as string | null | undefined

         if (!deviceId) {
            this.logger.warn('[Normal flow] No provided deviceId')
            throw new UnauthorizedException()
         }

         if (req.headers['x-session-id'] !== payload.sid) {
            this.logger.warn('[Normal flow] Cookie sessionId and accessToken claim sid mismatch')
            throw new UnauthorizedException()
         }

         if (!await this.sessionService.validateSession(payload.sid, deviceId, payload.sub)) {
            this.logger.warn('[Normal flow] Invalid or expired session')
            throw new UnauthorizedException()
         }

         await this.sessionService.updateLastAccessed(payload.sid, payload.sub)

         req.headers['x-user-id'] = payload.sub
         req.headers['x-scopes'] = JSON.stringify(await this.scopeService.verifyUserClaimScopesConsistencyThenGetScopes(payload.sub, accessToken))

         return true

      } catch (e) {
         const newTokenPayload = (newToken ? this.jwtToolsService.decodeUnsafe(newToken) : null)
         const oldTokenPayload = (accessToken ? this.jwtToolsService.decodeUnsafe(accessToken) : null)
         let newJti: string = ''
         let oldJti: string = ''
         const cookieSid = req.headers['x-session-id'] as string ?? ''
         const deviceId = req.headers['x-device-id'] as string ?? ''
         let newTokenSid: string = ''
         let oldTokenSid: string = ''
         if (newTokenPayload) {
            if (TypeGuards.isThruthyString(newTokenPayload.jti)) {
               newJti = newTokenPayload.jti
            }
            if (TypeGuards.isThruthyString(newTokenPayload.sid)) {
               newTokenSid = newTokenPayload.sid
            }
         }
         if (oldTokenPayload) {
            if (TypeGuards.isThruthyString(oldTokenPayload.jti)) {
               oldJti = oldTokenPayload.jti
            }
            if (TypeGuards.isThruthyString(oldTokenPayload.sid)) {
               oldTokenSid = oldTokenPayload.sid
            }
         }
         const arr = [oldJti, oldTokenSid, newJti, cookieSid, newTokenSid, deviceId]
         const errorInfo = arr.filter((val) => !!val).map((val, i) => {
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
         }).join(', ')
         this.logger.debug(`Authentication/Authorization error${errorInfo ? ', ' + errorInfo : ''}`, (e?.stack ?? e) as object)
         if (e instanceof RpcException && e.message === 'Forbidden::missing permissions') {
            throw new ForbiddenException(e.message)
         }
         const fatal = new UnauthorizedException('Fatal: unauthenticated')
         if (e instanceof RpcException && e.message === 'Unauthorized') {
            throw fatal
         }
         if (e instanceof UnauthorizedException) {
            this.logger.warn(`Thrown generic UnauthorizedException${errorInfo ? ', ' + errorInfo : ''}`)
            throw fatal
         }
         if (e instanceof RpcException) {
            this.logger.warn(`GlobalGuard internal unknown error as RpcException${errorInfo ? ', ' + errorInfo : ''}`, e.stack ?? e)
            throw fatal
         }
         this.logger.warn(`GlobalGuard internal unknown error${errorInfo ? ', ' + errorInfo : ''}`, (e.stack ?? e) as object)
         throw fatal
      }
   }



}
