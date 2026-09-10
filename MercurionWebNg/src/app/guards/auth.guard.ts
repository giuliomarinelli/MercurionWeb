import { inject, Injectable } from '@angular/core'
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
  UrlTree
} from '@angular/router'
import { AuthStateStore } from '../services/auth-state.store'
import { AuthRedirectService } from '../services/auth-redirect.service'
import { routePolicyOf } from '../route-policy'

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  private readonly router = inject(Router)
  private readonly authState = inject(AuthStateStore)
  private readonly redirects = inject(AuthRedirectService)

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    if (routePolicyOf(route).access !== 'authenticated') {
      return true
    }

    if (this.authState.authenticated()) {
      return true
    }

    // evita loop: se stai già su /login o /login/mfa, non riscrivere redirect_to
    const current = (state.url || '').toLowerCase()
    if (current.startsWith('/login')) {
      return this.router.parseUrl('/login')
    }



    const target = this.redirects.capture(state.url)
    return this.router.createUrlTree(['/login'], {
      queryParams: target ? { redirect_to: target } : undefined
    })
  }
}
