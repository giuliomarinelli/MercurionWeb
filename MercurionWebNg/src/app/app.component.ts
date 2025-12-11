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
  inject
} from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { HeaderComponent } from './components/common/header/header.component';
import { ThemeManagerService } from './services/context/theme-manager.service';
import { SearchOverlayComponent } from './components/search-overlay/search-overlay/search-overlay.component';
import { SearchContextService } from './services/context/search-context.service';
import { FooterComponent } from './components/common/footer/footer.component';
import { filter, Subscription } from 'rxjs';
import { ToastComponent } from './components/common/toast/toast.component';
import { ToastService } from './services/toast.service';
import { UserContextService } from './services/context/user-context.service';
import { PathService } from './services/path.service';
import { SidenavContextService } from './services/context/sidenav-context.service';
import { DesignService } from './services/design.service';
import { SidenavComponent } from './components/common/sidenav/sidenav.component';
import { SessionSyncService } from './services/session-sync.service';
import { ActionOverlayContextService } from './services/context/action-context/action-overlay-context.service';
import { environment } from '../environments/environment.development';
import { AuthService } from './services/auth.service';
import { ActionOverlayComponent } from './components/action-components/action-overlay/action-overlay.component';
import { AppContextService } from './services/context/app-context.service';

@Component({
  selector: 'm-root',
  standalone: true,
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
    @if (is_not_404_route() && is_not_403_route()) {
      <div class="flex flex-col h-screen">
        <m-header class="sticky top-0 z-30"
          [triggerOpenOffCanvas]="_triggerOpenOffCanvas()"
          (onOffCanvasMenuOpen)="triggerOpenOffCanvas()" />
        <div class="drawer-container relative flex flex-1 overflow-hidden custom-scrollbar">
          @if (userContext.isLoggedIn() && design.minBk('xl')()) {
            <div class="absolute top-4 left-[10px] z-30 group">
              <button class="cursor-pointer hover:transform hover:scale-[1.05] transition-transform duration-300" (click)="sidenavContext.toggle()" aria-label="Sidebar">
                @if (sidenavContext.isVisible()) {
                  <!-- icona open -->
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-auto text-light-on-surface-main hover:text-light-on-surface-secondary dark:text-dark-on-surface-main hover:dark:text-dark-on-surface-secondary transition-colors duration-150">
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <path d="M9 3v18" />
                  </svg>
                } @else {
                  <!-- icona closed -->
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
            class="content flex flex-col flex-1 overflow-y-auto
            transition-[margin] duration-500"
            [class.ml-64]="sidenavContext.isOpen() && userContext.isLoggedIn() && design.minBk('xl')()">
            <main class="flex-1 p-4 block">
              <router-outlet />
            </main>
            <m-footer class="shrink-0" />
          </section>
        </div>
      </div>
      @if (searchContextService.isMounted()) {
        <m-search-overlay />
      }
      @if (saveOverlayContext.isMounted() && userContext.isLoggedIn()) {
        <m-action-overlay />
      }
      <m-toast [context]="toastService.context()" />
    } @else {
      <router-outlet />
    }
  `,
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {

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


  title = 'MercurionWebNg';

  isDarkTheme: Signal<boolean> = computed(() => this.themeManagerService.theme() === 'dark');
  headerHeight = signal(64);
  is_not_404_route = signal<boolean>(true)
  is_not_403_route = signal<boolean>(true)

  private routeSub?: Subscription;

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
  private scrollHostRef!: ElementRef<HTMLElement>

  @ViewChild(HeaderComponent, { read: ElementRef })
  headerRef!: ElementRef<HTMLElement>


  constructor() {

    effect(() => {
      const t = this.appContext.addedGlobalScrollRootRefTick()
      if (t === 0) {
        return
      }
      if (!this.appContext.globalScollRootRef()) {
        this.appContext.setGlobalScrollRootRef(this.scrollHostRef)
      }
    })

    effect(() => {
      const t = this.appContext.addedScrollTick()
      if (t === 0) {
        return
      }
      queueMicrotask(() => this.appContext.smoothToTop(this.scrollHostRef, 400))
    })

    effect(() => {
      // Scudo anti race condition per la connessione ws dopo il login e l'emissione dell'evento di handshake
      const t = this.sessionSync.handshakeTick()
      if (t === 0) {
        return
      }
      void this.sessionSync.syncSession(true)
    })

    effect(() => {
      const t = this.appContext.addedTick()
      if (t === 0) {
        return
      }
      this.is_not_404_route.set(true)
    })

    if (this.userContext.isLoggedIn() && this.authService.getCookieValue('__logged_in') !== 'true') {
      this.userContext.clearInitials()
      this.authService.setAccessToken(null)
      this.authService.setWs_accessToken(null)
      localStorage.removeItem('ws_accessToken_ts')
    }
    // Mantieni la tua sync
    this.sessionSync.syncSession();

    // Utils
    const normalize = (raw: string): string => {
      if (!raw) return '';
      const qIdx = raw.indexOf('?');
      if (qIdx >= 0) raw = raw.slice(0, qIdx);
      const hIdx = raw.indexOf('#');
      if (hIdx >= 0) raw = raw.slice(0, hIdx);
      if (raw.startsWith('/m/')) raw = raw.slice(4);
      else if (raw === '/m') raw = '/';
      if (raw.length > 1 && raw.endsWith('/')) raw = raw.slice(0, -1);
      return raw;
    };

    // Path iniziale
    this.currentPath.set(normalize(this.router.url))
    this.pathService.setPath(this.currentPath())

    // Scroll to top su ogni NavigationEnd (animazione sul container)
    this.routeSub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e: NavigationEnd) => {
        const url = normalize(e.urlAfterRedirects)
        if (url !== '/settings') {
          this.appContext.smoothToTop(this.scrollHostRef, 400)
        }
        // Toggle layout wrapper based on 404 route
        this.is_not_404_route.set(url !== '/404-not-found')
        this.is_not_403_route.set(url !== '/403-forbidden')
        this.currentPath.set(url);
        this.pathService.setPath(url);
        if (!this.firstNavigationDone()) this.firstNavigationDone.set(true);
        if (this.userContext.isLoggedIn()) {
          sessionStorage.setItem(
            'redirectAfterLogin',
            window.location.pathname.slice(2) + window.location.search
          );
        }
        if (url === '/login') {
          this.router.navigateByUrl('/dashboard')
        }
      });

    // ---- Logica di sicurezza di navigazione (immutata) ----
    let lastProgrammaticNav: string | undefined;
    let firstStableReached = false;

    effect(() => {
      if (!this.firstNavigationDone()) return;

      const initials = this.userContext.initials();
      const logged = !!initials;
      const status = this.sessionSync.status();
      const rawUrl = this.currentPath();
      const url = rawUrl.toLowerCase();

      if (!firstStableReached) {
        if (status === 'loggedIn' || status === 'anonymous') {
          firstStableReached = true
        } else {
          return
        }
      }

      const isPublic =
        this.publicExact.has(url) || this.publicPrefixes.some((p) => url.startsWith(p));
      const isLoggedOutOnly = this.loggedOutOnlyExact.has(url);

      const safeNavigate = (target: string) => {
        if (target === url) return
        if (lastProgrammaticNav === target) return
        lastProgrammaticNav = target
        queueMicrotask(() => {
          if (this.router.url.toLowerCase() === url) {
            this.router.navigateByUrl(target);
          }
        })
      }

      if (url === '/') safeNavigate('/login')

      if (!logged) {
        if (!isPublic) safeNavigate('/login')
        return;
      }

      if (isLoggedOutOnly) safeNavigate('/dashboard')
    })
  }

  triggerOpenOffCanvas(): void {
    this._triggerOpenOffCanvas.set(true)
  }

  async ngOnInit() {

  }

  ngAfterViewInit() {
    queueMicrotask(() => {
      const h = this.headerRef?.nativeElement?.offsetHeight ?? 64
      this.appContext.setHeaderHeight(h)
    })
  }

  ngOnDestroy() {
    this.routeSub?.unsubscribe()
  }
}
