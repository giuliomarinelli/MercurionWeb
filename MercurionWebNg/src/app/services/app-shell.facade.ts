import { ElementRef, Injectable, OnDestroy, effect, inject, signal } from '@angular/core'
import { NavigationEnd, Router } from '@angular/router'
import { filter, Subscription } from 'rxjs'
import { AuthStateStore } from './auth-state.store'
import { AuthRedirectService } from './auth-redirect.service'
import { PathService } from './path.service'
import { SessionSyncService } from './session-sync.service'
import { AppContextService } from './context/app-context.service'
import { activeRoutePolicy, DEFAULT_ROUTE_POLICY, RoutePolicy } from '../route-policy'

/**
 * Application-lifetime orchestration for the root shell.
 *
 * The component owns view composition; this facade owns the session/navigation
 * boundary that must not be duplicated in a view component.
 */
@Injectable({ providedIn: 'root' })
export class AppShellFacade implements OnDestroy {
  private readonly router = inject(Router)
  private readonly authState = inject(AuthStateStore)
  private readonly sessionSync = inject(SessionSyncService)
  private readonly redirects = inject(AuthRedirectService)
  private readonly pathService = inject(PathService)
  private readonly appContext = inject(AppContextService)

  readonly routePolicy = signal<RoutePolicy>(DEFAULT_ROUTE_POLICY)
  private readonly currentPath = signal('')
  private readonly firstNavigationDone = signal(false)
  private readonly routeSub: Subscription
  private scrollHostRef?: ElementRef<HTMLElement>
  private lastProgrammaticNav?: string
  private firstStableReached = false

  constructor() {
    this.authState.bootstrap()
    void this.sessionSync.syncSession()

    effect(() => {
      const tick = this.sessionSync.handshakeTick()
      if (tick !== 0) void this.sessionSync.syncSession(true)
    })

    this.currentPath.set(this.normalize(this.router.url))
    this.pathService.setPath(this.currentPath())
    this.routeSub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => this.onNavigation(event))

    effect(() => {
      if (!this.firstNavigationDone()) return

      const logged = this.authState.authenticated()
      const status = this.sessionSync.status()
      const url = this.currentPath().toLowerCase()

      if (!this.firstStableReached) {
        if (status === 'loggedIn' || status === 'anonymous') this.firstStableReached = true
        else return
      }

      const policy = this.routePolicy()
      const isPublic = policy.access !== 'authenticated'
      const isLoggedOutOnly = policy.access === 'logged-out-only'
      const safeNavigate = (target: string) => {
        if (!target || this.lastProgrammaticNav === target) return
        this.lastProgrammaticNav = target
        queueMicrotask(() => {
          if (this.normalize(this.router.url).toLowerCase() === url) {
            void this.router.navigateByUrl(target)
          }
        })
      }

      if (url === '/') {
        safeNavigate('/welcome')
      } else if (!logged) {
        if (!isPublic) {
          this.redirects.capture(this.router.url)
          safeNavigate('/welcome')
        }
      } else if (isLoggedOutOnly) {
        safeNavigate('/dashboard')
      }
    })
  }

  registerScrollHost(host?: ElementRef<HTMLElement>): void {
    this.scrollHostRef = host
  }

  ngOnDestroy(): void {
    this.routeSub.unsubscribe()
  }

  private onNavigation(event: NavigationEnd): void {
    const previousPath = this.currentPath()
    const url = this.normalize(event.urlAfterRedirects)
    if (previousPath !== url && url !== '/settings' && url !== '/terms-and-policies') {
      this.appContext.smoothToTop(this.scrollHostRef, 400)
    }

    this.routePolicy.set(activeRoutePolicy(this.router.routerState.snapshot.root))
    this.currentPath.set(url)
    this.pathService.setPath(url)
    this.firstNavigationDone.set(true)
  }

  private normalize(raw: string): string {
    if (!raw) return ''
    const queryIndex = raw.indexOf('?')
    if (queryIndex >= 0) raw = raw.slice(0, queryIndex)
    const hashIndex = raw.indexOf('#')
    if (hashIndex >= 0) raw = raw.slice(0, hashIndex)
    if (raw === '/m') raw = '/'
    else if (raw.startsWith('/m/')) raw = raw.slice(2)
    if (raw.length > 1 && raw.endsWith('/')) raw = raw.slice(0, -1)
    return raw
  }
}
