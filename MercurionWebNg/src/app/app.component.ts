import {
  AfterViewInit,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  effect,
  signal,
  Signal,
  inject,
  PLATFORM_ID
} from '@angular/core'
import { NavigationEnd, Router, RouterOutlet } from '@angular/router'
import { HeaderComponent } from './components/common/header/header.component'
import { ThemeManagerService } from './services/context/theme-manager.service'
import { SearchOverlayComponent } from './components/search-overlay/search-overlay/search-overlay.component'
import { SearchContextService } from './services/context/search-context.service'
import { FooterComponent } from './components/common/footer/footer.component'
import { filter, Subscription } from 'rxjs'
import { ToastComponent } from './components/common/toast/toast.component'
import { ToastService } from './services/toast.service'
import { UserContextService } from './services/context/user-context.service'
import { PathService } from './services/path.service'
import { SidenavContextService } from './services/context/sidenav-context.service'
import { DesignService } from './services/design.service'
import { SidenavComponent } from './components/common/sidenav/sidenav.component'
import { SessionSyncService } from './services/session-sync.service'
import { ActionOverlayContextService } from './services/context/action-context/action-overlay-context.service'
import { environment } from '../environments/environment'
import { AuthService } from './services/auth.service'
import { ActionOverlayComponent } from './components/action-components/action-overlay/action-overlay.component'
import { AppContextService } from './services/context/app-context.service'
import { AccountService } from './services/account.service'
import { DOCUMENT, isPlatformBrowser } from '@angular/common'

@Component({
  selector: 'm-root',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    RouterOutlet,
    HeaderComponent,
    SearchOverlayComponent,
    FooterComponent,
    ToastComponent,
    SidenavComponent,
    ActionOverlayComponent
  ],
  template: `
    @if (isSafari) {
      <div class="bg-amber-200/90 text-amber-900 px-3 py-2 text-sm flex items-center justify-center gap-2">
        <span class="font-semibold">Avviso Safari</span>
        <span>Safari mobile può non rispettare gli standard web: se riscontri problemi, prova un browser differente. Allineeremo il supporto a Safari appena possibile.</span>
      </div>
    }
    @if (is_not_404_route() && is_not_403_route() && is_not_welcome_route()) {
      <div class="flex flex-col h-screen">
        <m-header class="sticky top-0 z-30"
          [triggerOpenOffCanvas]="_triggerOpenOffCanvas()"
          (onOffCanvasMenuOpen)="triggerOpenOffCanvas()" />
        <div class="drawer-container relative flex flex-1 overflow-hidden custom-scrollbar">
          @if (userContext.isLoggedIn() && design.minBk('xl')()) {
            <div class="absolute top-4 left-[10px] z-30 group">
              <button class="cursor-pointer hover:transform hover:scale-[1.05] transition-transform duration-300" (click)="sidenavContext.toggle()" aria-label="Sidebar">
                @if (sidenavContext.isVisible()) {
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-auto text-light-on-surface-main hover:text-light-on-surface-secondary dark:text-dark-on-surface-main hover:dark:text-dark-on-surface-secondary transition-colors duration-150">
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <path d="M9 3v18" />
                  </svg>
                } @else {
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-auto text-light-on-surface-main hover:text-light-on-surface-secondary dark:text-dark-on-surface-main hover:dark:text-dark-on-surface-secondary transition-colors duration-150">
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <rect x="3" y="3" width="6" height="18" rx="2" fill="currentColor" stroke="none"/>
                  </svg>
                }
              </button>
              <span
                class="absolute left-20 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded
                       bg-neutral-900/90 dark:bg-neutral-100/90 px-2 py-1 text-xs text-neutral-50
                       dark:text-neutral-900 opacity-0 group-hover:opacity-100
                       transition-opacity duration-150 pointer-events-none z-40 shadow-lg"
                role="tooltip">
                @if (sidenavContext.isVisible()) {
                  Nascondi barra laterale
                } @else {
                  Mostra barra laterale
                }
              </span>
            </div>
          }
          @if (sidenavContext.isMounted() && userContext.isLoggedIn() && design.minBk('xl')()) {
            <aside
              class="drawer absolute inset-y-0 left-0 w-64
                transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
                -translate-x-full"
              [class.translate-x-0]="sidenavContext.isVisible()"
              [class.-translate-x-full]="!sidenavContext.isVisible()">
              <m-sidenav />
            </aside>
          }
          <section #scrollHost
            class="content flex flex-col flex-1 overflow-y-auto transition-[margin] duration-500 m-scroll-thin"
            [class.ml-64]="sidenavContext.isOpen() && userContext.isLoggedIn() && design.minBk('xl')()">
            <main class="flex-1 p-4 block">
              <router-outlet />
            </main>
            <m-footer class="shrink-0" />
          </section>
        </div>
      </div>
      @if (searchContextService.isMounted()) {
        @defer (when searchContextService.isMounted()) {
          <m-search-overlay />
        }
      }
      @if (saveOverlayContext.shouldMount() && userContext.isLoggedIn()) {
        @defer (when saveOverlayContext.shouldMount()) {
          <m-action-overlay />
        }
      }
    } @else {
      <div class="min-h-screen">
        @if (!is_not_welcome_route()) {
          <m-header class="sticky top-0 z-30" />
        }
        <router-outlet />
      </div>
    }
    <m-toast [context]="toastService.context()" />
  `
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {

  protected readonly isSafari: boolean

  private readonly themeManagerService = inject(ThemeManagerService)
  protected readonly searchContextService = inject(SearchContextService)
  private readonly router = inject(Router)
  protected readonly toastService = inject(ToastService)
  protected readonly userContext = inject(UserContextService)
  private readonly pathService = inject(PathService)
  protected readonly sidenavContext = inject(SidenavContextService)
  protected readonly design = inject(DesignService)
  private readonly sessionSync = inject(SessionSyncService)
  protected readonly saveOverlayContext = inject(ActionOverlayContextService)
  private readonly authService = inject(AuthService)
  private readonly appContext = inject(AppContextService)
  private readonly accountService = inject(AccountService)
  private readonly doc = inject(DOCUMENT)
  private readonly platformId = inject(PLATFORM_ID)
  private readonly isBrowser = isPlatformBrowser(this.platformId)

  isDarkTheme: Signal<boolean> = computed(() => this.themeManagerService.theme() === 'dark')
  is_not_404_route = signal<boolean>(true)
  is_not_403_route = signal<boolean>(true)
  is_not_welcome_route = signal<boolean>(true)

  private routeSub?: Subscription
  private emailSub?: Subscription
  private currentPath = signal<string>('')
  private firstNavigationDone = signal<boolean>(false)

  private publicExact = new Set(environment.PUBLIC_EXACT_PATHS)
  private publicPrefixes = environment.PUBLIC_PREFIXES
  private loggedOutOnlyExact = (() => {
    const set = new Set(environment.LOGGED_OUT_ONLY_PATHS ?? environment.PUBLIC_EXACT_PATHS)
    set.delete('/404-not-found')
    set.delete('/403-forbidden')
    return set
  })()

  _triggerOpenOffCanvas = signal<boolean>(false)

  @ViewChild('scrollHost')
  set scrollHost(ref: ElementRef<HTMLElement> | undefined) {
    this.scrollHostRef = ref ?? undefined
    // wait a tick so the view is stable before registering the new root
    queueMicrotask(() => this.ensureScrollRootRef())
  }
  private scrollHostRef?: ElementRef<HTMLElement>

  @ViewChild(HeaderComponent, { read: ElementRef })
  headerRef!: ElementRef<HTMLElement>

  constructor() {
    const isBrowser = this.isBrowser
    this.isSafari = isBrowser && /safari\//i.test(navigator.userAgent) && !/chrome\//i.test(navigator.userAgent)
    if (isBrowser) {
      this.doc.documentElement.classList.add('m-scroll-thin')
    }
    effect(() => {
      const t = this.sessionSync.handshakeTick()
      if (t === 0) return
      void this.sessionSync.syncSession(true)
    })

    const loginCookie =
      this.authService.getCookieValue('__logged_in') ?? this.authService.getCookieValue('__logged_in_')
    if (!this.userContext.isLoggedIn() && loginCookie === 'true') {
      const stored = localStorage.getItem('login') ?? 'U'
      this.userContext.setInitials(stored)
    }

    void this.sessionSync.syncSession()

    // Compatibilità transitoria per redirect_to salvati quando la SPA viveva sotto /m.
    const stripLegacyBasePath = (raw: string): string => {
      if (raw === '/m') return '/'
      if (raw.startsWith('/m/')) return raw.slice(2)
      if (raw.startsWith('/m?') || raw.startsWith('/m#')) return `/${raw.slice(2)}`
      return raw
    }

    const normalize = (raw: string): string => {
      if (!raw) return ''
      const qIdx = raw.indexOf('?')
      if (qIdx >= 0) raw = raw.slice(0, qIdx)
      const hIdx = raw.indexOf('#')
      if (hIdx >= 0) raw = raw.slice(0, hIdx)
      raw = stripLegacyBasePath(raw)
      if (raw.length > 1 && raw.endsWith('/')) raw = raw.slice(0, -1)
      return raw
    }

    const isLoginFamily = (path: string): boolean => path === '/login' || path.startsWith('/login/')

    const extractRedirectTo = (urlWithQuery: string): string | null => {
      if (!urlWithQuery) return null
      try {
        const u = new URL(urlWithQuery, window.location.origin)
        const raw = u.searchParams.get('redirect_to')
        if (!raw) return null
        const trimmed = raw.trim()
        if (!trimmed) return null
        if (!trimmed.startsWith('/')) return null
        if (trimmed.startsWith('//')) return null
        return stripLegacyBasePath(trimmed)
      } catch {
        return null
      }
    }

    const resolveLoginRedirectTarget = (): string | null => {
      const qp = extractRedirectTo(this.router.url)
      if (!qp) return null
      const normalizedTarget = normalize(qp).toLowerCase()
      if (normalizedTarget === '/login' || normalizedTarget.startsWith('/login/')) return null
      return qp
    }

    const buildWelcomeWithRedirectTo = (): string => {

      let full = this.router.url || '/'
      if (!full.startsWith('/')) full = `/${full}`
      full = stripLegacyBasePath(full)

      const clean = normalize(full).toLowerCase()
      if (clean === '/welcome' || clean.startsWith('/welcome/')) return '/welcome'

      return `/welcome?redirect_to=${encodeURIComponent(full)}`
    }

    this.currentPath.set(normalize(this.router.url))
    this.pathService.setPath(this.currentPath())

    this.routeSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: NavigationEnd) => {
        const prevPath = this.currentPath()
        const url = normalize(e.urlAfterRedirects)

        const pathChanged = prevPath !== url
        const shouldAutoSmooth =
          pathChanged && url !== '/settings' && url !== '/terms-and-policies'

        if (shouldAutoSmooth) {
          this.appContext.smoothToTop(this.scrollHostRef, 400)
        }

        this.is_not_404_route.set(url !== '/404-not-found')
        this.is_not_403_route.set(url !== '/403-forbidden')
        this.is_not_welcome_route.set(url !== '/welcome')
        this.currentPath.set(url)
        this.pathService.setPath(url)
        if (!this.firstNavigationDone()) this.firstNavigationDone.set(true)
        queueMicrotask(() => this.ensureScrollRootRef())

        if (this.userContext.isLoggedIn() && isLoginFamily(url)) {
          const target = resolveLoginRedirectTarget() ?? '/dashboard'
          if (target !== this.router.url) this.router.navigateByUrl(target)
        }
      })

    let lastProgrammaticNav: string | undefined
    let firstStableReached = false

    effect(() => {

      if (!this.firstNavigationDone()) {
        return
      }

      const logged = !!this.userContext.initials()
      const status = this.sessionSync.status()
      const url = this.currentPath().toLowerCase()

      if (!firstStableReached) {
        if (status === 'loggedIn' || status === 'anonymous') firstStableReached = true
        else return
      }

      const isLoginFamilyPath = isLoginFamily(url)
      const isPublic =
        isLoginFamilyPath || this.publicExact.has(url) || this.publicPrefixes.some(p => url.startsWith(p))

      const isLoggedOutOnly = this.loggedOutOnlyExact.has(url)

      const safeNavigate = (target: string) => {
        if (!target) return
        if (lastProgrammaticNav === target) return
        lastProgrammaticNav = target
        queueMicrotask(() => {
          const here = normalize(this.router.url).toLowerCase()
          if (here === url) this.router.navigateByUrl(target)
        })
      }

      if (url === '/') {
        safeNavigate('/welcome')
        return
      }

      if (!logged) {
        if (!isPublic) {
          safeNavigate(buildWelcomeWithRedirectTo())
        }
        return
      }

      if (isLoginFamilyPath) {
        const target = resolveLoginRedirectTarget() ?? '/dashboard'
        safeNavigate(target)
        return
      }

      if (isLoggedOutOnly) {
        safeNavigate('/dashboard')
      }
    })

    effect(() => {
      const t = this.appContext.addedGlobalScrollRootRefTick()
      if (t === 0) return
      queueMicrotask(() => this.ensureScrollRootRef())
    })
  }

  triggerOpenOffCanvas(): void {
    this._triggerOpenOffCanvas.set(true)
  }

  async ngOnInit() {
    if (this.userContext.isLoggedIn()) {
      this.emailSub = this.accountService.getProvidedEmail(true).subscribe()
    }
  }

  ngAfterViewInit() {
    queueMicrotask(() => {
      this.ensureScrollRootRef()
      const h = this.headerRef?.nativeElement?.offsetHeight ?? 64
      this.appContext.setHeaderHeight(h)
    })
  }

  ngOnDestroy() {
    this.routeSub?.unsubscribe()
    this.emailSub?.unsubscribe()
    if (this.isBrowser) {
      this.doc.documentElement.classList.remove('m-scroll-thin')
    }
  }

  private ensureScrollRootRef(): void {
    if (!this.isBrowser) return

    const docEl = this.doc?.documentElement as HTMLElement | null
    const shouldUseScrollHost = this.is_not_welcome_route() && !!this.scrollHostRef

    if (shouldUseScrollHost) {
      this.appContext.setGlobalScrollRootRef(this.scrollHostRef!)
      return
    }

    if (docEl) {
      this.appContext.setGlobalScrollRootRef(new ElementRef<HTMLElement>(docEl))
    }
  }
}
