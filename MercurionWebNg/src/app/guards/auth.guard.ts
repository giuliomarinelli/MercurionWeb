import { inject, Injectable } from '@angular/core'
import { toObservable } from '@angular/core/rxjs-interop'
import { filter, from, map, Observable, switchMap, take } from 'rxjs'
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
  UrlTree
} from '@angular/router'
import { AuthStateStore } from '../services/auth-state.store'
import { AuthRedirectService } from '../services/auth-redirect.service'
import { SessionSyncService } from '../services/session-sync.service'
import { routePolicyOf } from '../route-policy'
import { routeManifest } from '../route-manifest'

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  private readonly router = inject(Router)
  private readonly authState = inject(AuthStateStore)
  private readonly redirects = inject(AuthRedirectService)
  private readonly sessionSync = inject(SessionSyncService)
  private readonly authStateChanges = toObservable(this.authState.state)

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree | Observable<boolean | UrlTree> {
    if (routePolicyOf(route).access !== 'authenticated') {
      return true
    }

    if (this.authState.authenticated()) {
      return true
    }

    const auth = this.authState.state()
    if (auth.kind === 'authenticating' && auth.flow === 'restore') {
      return this.waitForSessionRestore(state)
    }

    return this.loginRedirect(state)
  }

  private waitForSessionRestore(state: RouterStateSnapshot): Observable<boolean | UrlTree> {
    return from(this.sessionSync.checkSession()).pipe(
      // A completed transport attempt may still leave restoration pending.
      // Wait for a definitive auth state; Router unsubscribes if navigation
      // is cancelled, so a late ACK cannot redirect a different navigation.
      switchMap(() => this.authStateChanges),
      filter(() => !this.authState.isAuthenticating()),
      take(1),
      map(() => this.authState.authenticated() ? true : this.loginRedirect(state))
    )
  }

  private loginRedirect(state: RouterStateSnapshot): UrlTree {

    // evita loop: se stai già su /login o /login/mfa, non riscrivere redirect_to
    const current = (state.url || '').toLowerCase()
    if (current.startsWith(routeManifest.login.build({}))) {
      return this.router.parseUrl(routeManifest.login.build({}))
    }



    const target = this.redirects.capture(state.url)
    return this.router.createUrlTree([routeManifest.login.build({})], {
      queryParams: target ? { redirect_to: target } : undefined
    })
  }
}
