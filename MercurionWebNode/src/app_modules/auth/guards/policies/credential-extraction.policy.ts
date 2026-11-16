import { Injectable } from '@nestjs/common'

import { JwtToolsService } from '../../services/jwt-tools.service'
import type { AuthenticationRequestContext } from './authentication-policy.types'

@Injectable()
export class CredentialExtractionPolicy {
  constructor(private readonly jwtToolsService: JwtToolsService) {}

  extractAccessToken(context: AuthenticationRequestContext): string {
    return this.jwtToolsService.extractAccessTokenFromReq(context.request)
  }
}
