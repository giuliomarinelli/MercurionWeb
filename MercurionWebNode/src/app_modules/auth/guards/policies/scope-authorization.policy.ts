import { Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Scope } from 'src/app_modules/user/models/enums/scope.enum'

import type { AppJwtPayload } from '../../models/interfaces/app-jwt-payload.interface'
import { ScopeService } from '../../services/scope.service'
import type { AuthenticationRequestContext } from './authentication-policy.types'
import { SecurityService } from '../../services/security.service'

@Injectable()
export class ScopeAuthorizationPolicy {
  constructor(
    private readonly scopeService: ScopeService,
    private readonly securityService: SecurityService,
    private readonly reflector: Reflector
  ) {}

  authorize(
    context: AuthenticationRequestContext,
    payload: AppJwtPayload
  ): Promise<void> {
    const userId = this.securityService.decryptUserId(payload.sub)
    return this.scopeService.scopeVerificationLayer(
      userId,
      context.executionContext,
      this.reflector,
      payload.scp
    )
  }

  resolveGrantedScopes(payload: AppJwtPayload): Promise<Scope[]> {
    const userId = this.securityService.decryptUserId(payload.sub)
    return this.scopeService.verifyUserClaimScopesConsistencyThenGetScopes(
      userId,
      payload.scp
    )
  }
}
