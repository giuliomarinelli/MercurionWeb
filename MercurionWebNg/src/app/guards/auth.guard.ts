import { inject, Injectable } from '@angular/core'
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
  UrlTree
} from '@angular/router'
import { AuthStateStore } from '../services/auth-state.store'

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  private readonly router = inject(Router)
  private readonly authState = inject(AuthStateStore)

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    if (this.authState.isAuthenticated()) {
      return true
    }

    // evita loop: se stai già su /login o /login/mfa, non riscrivere redirect_to
    const current = (state.url || '').toLowerCase()
    if (current.startsWith('/login')) {
      return this.router.parseUrl('/login')
    }



    // IMPORTANT: usa SEMPRE l’URL richiesto come redirect_to (include anche querystring)
    // state.url è già tipo "/molecules/editor?x=1"
    const redirectTo = state.url.startsWith('/') ? state.url : `/${state.url}`

    return this.router.createUrlTree(['/login'], {
      queryParams: { redirect_to: redirectTo }
    })
  }
}
