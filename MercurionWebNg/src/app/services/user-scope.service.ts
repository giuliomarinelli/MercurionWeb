import { inject, Injectable } from '@angular/core';
import { JwtHelperService } from './jwt-helper.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class UserScopeService {

  private readonly jwtHelper = inject(JwtHelperService)
  private readonly authService = inject(AuthService)


  getUserScopes(context: 'access_token' | 'ws_accessToken' = 'access_token'): string[] {
    let token: string | null = null
    switch (context) {
      case 'access_token':
        token = this.authService.getAccessToken()
        break
      case 'ws_accessToken':
        token = this.authService.getWs_accessToken()
        break
      default:
        token = null
    }
    if (!token) {
      return []
    }
    const scp = this.jwtHelper.getClaim<string>(token, 'scp')
    if (!scp) {
      return []
    }
    return scp.split(/\s+/)
  }


}
