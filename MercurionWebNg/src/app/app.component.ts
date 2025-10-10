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
  NgZone,
} from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { HeaderComponent } from './components/common/header/header.component';
import { ThemeManagerService } from './services/context/theme-manager.service';
import { SearchOverlayComponent } from './components/search-overlay/search-overlay/search-overlay.component';
import { SearchContextService } from './services/context/search-context.service';
import { FooterComponent } from './components/common/footer/footer.component';
import { NgxxSpinnerComponent } from './components/common/ngxx-spinner/ngxx-spinner.component';
import { filter, Subscription } from 'rxjs';
import { ToastComponent } from './components/common/toast/toast.component';
import { ToastService } from './services/toast.service';
import { UserContextService } from './services/context/user-context.service';
import { PathService } from './services/path.service';
import { SidenavContextService } from './services/context/sidenav-context.service';
import { DesignService } from './services/design.service';
import { SidenavComponent } from './components/common/sidenav/sidenav.component';
import { SessionSyncService } from './services/session-sync.service';
import { CollectionSaveOverlayComponent } from './components/collection-save-overlay/collection-save-overlay.component';
import { CollectionSaveOverlayContextService } from './services/context/save-to-collection-context.service';
import { environment } from '../environments/environment.development';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    RouterOutlet,
    HeaderComponent,
    SearchOverlayComponent,
    FooterComponent,
    NgxxSpinnerComponent,
    ToastComponent,
    SidenavComponent,
    CollectionSaveOverlayComponent,
  ],
  template: `
    <div class="flex flex-col h-screen">
      <app-header class="sticky top-0 z-30" />
      <div class="drawer-container relative flex flex-1 overflow-hidden custom-scrollbar">
        @if (userContext.initials() && design.minBk('xl')()) {
          <div class="absolute top-4 left-[10px] z-30 group">
            <button class="cursor-pointer" (click)="sidenavContext.toggle()" aria-label="Sidebar">
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
        @if (sidenavContext.isMounted() && userContext.initials() && design.minBk('xl')()) {
          <aside
            class="drawer absolute inset-y-0 left-0 w-64
              transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
              -translate-x-full"
            [class.translate-x-0]="sidenavContext.isVisible()"
            [class.-translate-x-full]="!sidenavContext.isVisible()">
            <app-sidenav />
          </aside>
        }
        <section #scrollHost
          class="content flex flex-col flex-1 overflow-y-auto
          transition-[margin] duration-500"
          [class.ml-64]="sidenavContext.isOpen() && userContext.initials() && design.minBk('xl')()">
          <main class="flex-1 p-4 block">
            <router-outlet />
          </main>
          <app-footer class="shrink-0" />
        </section>
      </div>
    </div>
    @if (searchContextService.isMounted()) {
      <app-search-overlay />
    }
    @if (saveOverlayContext.isMounted() && userContext.initials() !== '') {
      <app-collection-save-overlay />
    }
    <app-toast [context]="toastService.context()" />
    <app-ngxx-spinner />
  `,
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  title = 'MercurionWebNg';

  isDarkTheme: Signal<boolean> = computed(() => this.themeManagerService.theme() === 'dark');
  headerHeight = signal(64);

  private routeSub?: Subscription;

  private currentPath = signal<string>('');
  private firstNavigationDone = signal<boolean>(false);

  private publicExact = new Set(environment.PUBLIC_EXACT_PATHS);
  private publicPrefixes = environment.PUBLIC_PREFIXES;

  @ViewChild('scrollHost') private scrollHostRef!: ElementRef<HTMLElement>;
  @ViewChild(HeaderComponent, { read: ElementRef }) headerRef!: ElementRef<HTMLElement>;

  constructor(
    private readonly themeManagerService: ThemeManagerService,
    protected readonly searchContextService: SearchContextService,
    private readonly router: Router,
    private readonly zone: NgZone,
    protected readonly toastService: ToastService,
    protected readonly userContext: UserContextService,
    private readonly pathService: PathService,
    protected readonly sidenavContext: SidenavContextService,
    protected readonly design: DesignService,
    private readonly sessionSync: SessionSyncService,
    protected readonly saveOverlayContext: CollectionSaveOverlayContextService,
    private readonly authService: AuthService
  ) {

    if (this.userContext.initials() && this.authService.getCookieValue('__logged_in') !== 'true') {
      this.userContext.clearInitials()
      this.authService.setAccessToken(null)
      this.authService.setWs_accessToken(null)
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
      if (raw.startsWith('/app/')) raw = raw.slice(4);
      else if (raw === '/app') raw = '/';
      if (raw.length > 1 && raw.endsWith('/')) raw = raw.slice(0, -1);
      return raw;
    };

    // Path iniziale
    this.currentPath.set(normalize(this.router.url));
    this.pathService.setPath(this.currentPath());

    // Scroll to top su ogni NavigationEnd (animazione sul container)
    this.routeSub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e: NavigationEnd) => {
        this.scrollToTop(240); // chiamata reale

        const url = normalize(e.urlAfterRedirects);
        this.currentPath.set(url);
        this.pathService.setPath(url);
        if (!this.firstNavigationDone()) this.firstNavigationDone.set(true);
        if (this.userContext.initials() !== '') {
          sessionStorage.setItem(
            'redirectAfterLogin',
            window.location.pathname.slice(4) + window.location.search
          );
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
          firstStableReached = true;
        } else {
          return;
        }
      }

      const isPublic =
        this.publicExact.has(url) || this.publicPrefixes.some((p) => url.startsWith(p));
      const isLoggedOutOnly = this.publicExact.has(url);

      const safeNavigate = (target: string) => {
        if (target === url) return;
        if (lastProgrammaticNav === target) return;
        lastProgrammaticNav = target;
        queueMicrotask(() => {
          if (this.router.url.toLowerCase() === url) {
            this.router.navigateByUrl(target);
          }
        });
      };

      if (url === '/') safeNavigate('/login');

      if (!logged) {
        if (!isPublic) safeNavigate('/login');
        return;
      }

      if (isLoggedOutOnly) safeNavigate('/profile');
    });
  }

  // Animazione scroll sul container scrollabile
  private scrollToTop(duration = 240) {
    // Se il ref non è ancora pronto, riprova al prossimo frame
    const host = this.scrollHostRef?.nativeElement;
    if (!host) {
      requestAnimationFrame(() => this.scrollToTop(duration));
      return;
    }

    this.zone.runOutsideAngular(() => {
      const start = host.scrollTop;
      if (start === 0) return;

      const startTime = performance.now();
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const y = Math.floor(start * (1 - easeOutCubic(progress)));
        host.scrollTop = y;
        if (progress < 1) requestAnimationFrame(step);
      };

      requestAnimationFrame(step);
    });
  }

  async ngOnInit() { }

  ngAfterViewInit() { }

  ngOnDestroy() {
    this.routeSub?.unsubscribe();
  }
}
