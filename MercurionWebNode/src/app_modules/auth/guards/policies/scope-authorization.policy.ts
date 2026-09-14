import { Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Scope } from 'src/app_modules/user/Models/enums/scope.enum'

import type { AppJwtPayload } from '../../Models/interfaces/app-jwt-payload.interface'
import { ScopeService } from '../../services/scope.service'
import type { AuthenticationRequestContext } from './authentication-policy.types'

@Injectable()
export class ScopeAuthorizationPolicy {
  constructor(
    private readonly scopeService: ScopeService,
    private readonly reflector: Reflector
  ) {}

  authorize(
    context: AuthenticationRequestContext,
    payload: AppJwtPayload
  ): Promise<void> {
    return this.scopeService.scopeVerificationLayer(
      payload.sub,
      context.executionContext,
      this.reflector,
      payload.scp
    )
  }

  resolveGrantedScopes(payload: AppJwtPayload): Promise<Scope[]> {
    return this.scopeService.verifyUserClaimScopesConsistencyThenGetScopes(
      payload.sub,
      payload.scp
    )
  }
}
