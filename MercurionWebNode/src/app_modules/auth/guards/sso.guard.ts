import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { GqlContextType } from '@nestjs/graphql';
import { JwtToolsService } from '../services/jwt-tools.service';
import { SessionService } from '../services/session.service';
import { FastifyRequest } from 'fastify';
import { UUID } from 'crypto';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';
import { MeiliContextLogger } from 'src/app_modules/meilisearch/Models/interfaces/meili-context-logger.interface';
import { TokenType } from '../Models/enums/token-type.enum';
import { SecureCookieService } from '../services/secure-cookie.service';


@Injectable()
export class SsoGuard implements CanActivate {

  private readonly logger: MeiliContextLogger

  constructor(
    private readonly jwtTools: JwtToolsService,
    private readonly sessionService: SessionService,
    private readonly secureCookieService: SecureCookieService,
    loggerFactory: MeiliLoggerService
  ) {
    this.logger = loggerFactory.forContext(MeiliLoggerService.name)
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      if (context.getType<GqlContextType>() !== 'http') {
        throw new UnauthorizedException()
      }

      const req = context.switchToHttp().getRequest<FastifyRequest>()

      const sso_pat = this.jwtTools.extractAccessTokenFromReq(req)

      let jti: UUID

      try {
        ({ jti } = await this.jwtTools.verifyTokenAndGetPayload(sso_pat, TokenType.SSO_PreAuthorizationToken))
      } catch (e) {
        this.logger.debug(' > canActivate => Error: ', (e.stack ?? e) as object)
        throw new UnauthorizedException()
      }
      await this.sessionService.revokeToken(jti)
      return true
    } catch (e) {
      this.logger.debug(' > canActivate => Global Catch Error: ', (e.stack ?? e) as object)
      throw new UnauthorizedException()
    }
  }

}
