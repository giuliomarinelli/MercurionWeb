import { AfterViewInit, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, OnDestroy, OnInit, ViewChild, computed, effect, signal, Signal } from '@angular/core'
import { NavigationEnd, Router, RouterOutlet } from '@angular/router'
import { HeaderComponent } from './components/common/header/header.component'
import { ThemeManagerService } from './services/context/theme-manager.service'
import { SearchOverlayComponent } from './components/search-overlay/search-overlay/search-overlay.component'
import { SearchContextService } from './services/context/search-context.service'
import { FooterComponent } from './components/common/footer/footer.component'
import { NgxxSpinnerComponent } from './components/common/ngxx-spinner/ngxx-spinner.component'
import { filter, Subscription } from 'rxjs'
import { ToastComponent } from './components/common/toast/toast.component'
import { ToastService } from './services/toast.service'
import { UserContextService } from './services/context/user-context.service'
import { PathService } from './services/path.service'
import { SidenavContextService } from './services/context/sidenav-context.service'
import { DesignService } from './services/design.service'
import { SidenavComponent } from './components/common/sidenav/sidenav.component'
import { SessionSyncService } from './services/session-sync.service'

@Component({
  selector: 'app-root',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    RouterOutlet,
    HeaderComponent,
    SearchOverlayComponent,
    FooterComponent,
    NgxxSpinnerComponent,
    ToastComponent,
    SidenavComponent
  ],
  template: `
    <div class="flex flex-col h-screen">
      <app-header class="sticky top-0 z-30" />
      <div class="drawer-container relative flex flex-1 overflow-hidden custom-scrollbar">
        @if (userContext.initials() && design.minBk('lg')()) {
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
        @if (sidenavContext.isMounted() && userContext.initials() && design.minBk('lg')()) {
          <aside
            class="drawer absolute inset-y-0 left-0 w-64
              transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
              -translate-x-full"
            [class.translate-x-0]="sidenavContext.isVisible()"
            [class.-translate-x-full]="!sidenavContext.isVisible()">
            <app-sidenav />
          </aside>
        }
        <section class="content flex flex-col flex-1 overflow-y-auto
          transition-[margin] duration-500"
          [class.ml-64]="sidenavContext.isOpen() && userContext.initials() && design.minBk('lg')()">
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
    <app-toast [context]="toastService.context()" />
    <app-ngxx-spinner />
  `
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  title = 'MercurionWebNg'
  isDarkTheme: Signal<boolean> = computed(() => this.themeManagerService.theme() === 'dark')
  headerHeight = signal(64)
  private routeSub?: Subscription
  private currentPath = signal<string>('')

  @ViewChild(HeaderComponent, { read: ElementRef })
  headerRef!: ElementRef<HTMLElement>

  constructor(
    private readonly themeManagerService: ThemeManagerService,
    protected readonly searchContextService: SearchContextService,
    private readonly router: Router,
    protected readonly toastService: ToastService,
    protected readonly userContext: UserContextService,
    private readonly pathService: PathService,
    protected readonly sidenavContext: SidenavContextService,
    protected readonly design: DesignService,
    private readonly sessionSync: SessionSyncService
  ) {
    this.sessionSync.syncSession();   // ok se ti serve qui

    // --- Utils ---
    const normalize = (raw: string): string => {
      if (!raw) return '';
      // togli query/hash
      const qIdx = raw.indexOf('?');
      if (qIdx >= 0) raw = raw.slice(0, qIdx);
      const hIdx = raw.indexOf('#');
      if (hIdx >= 0) raw = raw.slice(0, hIdx);
      // togli base /app se presente
      if (raw.startsWith('/app/')) raw = raw.slice(4);
      else if (raw === '/app') raw = '/';
      // togli trailing slash eccetto root
      if (raw.length > 1 && raw.endsWith('/')) raw = raw.slice(0, -1);
      return raw;
    };

    // --- Signal path iniziale PRIMA dell’effetto ---
    this.currentPath.set(normalize(this.router.url));
    this.pathService.setPath(this.currentPath());

    // --- Aggiornamento path a ogni NavigationEnd ---
    this.routeSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: NavigationEnd) => {
        const url = normalize(e.urlAfterRedirects);
        this.currentPath.set(url);
        this.pathService.setPath(url);
      });

    // --- Effetto unico ---
    const publicExact = new Set(['/login', '/register', '/forgot', '/privacy', '/']);
    const publicPrefixes = ['/molecules/detail'];

    let lastProgrammaticNav: string | undefined;

    effect(() => {
      const initials = this.userContext.initials();     // '' se anonimo
      const logged = !!initials;
      const status = this.sessionSync.status();       // 'anonymous' / 'handshake' / 'loggedIn' / ...
      const rawUrl = this.currentPath();              // signal già aggiornato da NavigationEnd
      const url = rawUrl.toLowerCase();

      console.log('[ROUTE EFFECT]', { rawUrl, url, initials, logged, status });

      // Evita di reagire mentre stai negoziando la sessione
      if (status === 'handshake') return;

      const isPublic = publicExact.has(url) || publicPrefixes.some(p => url.startsWith(p));
      const isLoggedOutOnly = publicExact.has(url); // pagine che *se* loggato voglio evitare

      const safeNavigate = (target: string) => {
        if (target === url) return;
        if (lastProgrammaticNav === target) return;
        lastProgrammaticNav = target;
        queueMicrotask(() => {
          // solo se siamo ancora sulla stessa url prima del redirect
          if (this.router.url.toLowerCase() === url) {
            this.router.navigateByUrl(target);
          }
        });
      }

      if (!logged) {
        // Non loggato: permette tutte le public + publicPrefix
        if (!isPublic) safeNavigate('/login');
        return;
      }

      // Loggato: se stai su una pagina per "logged out only" ti porto al profilo
      if (isLoggedOutOnly) safeNavigate('/profile');
    });

  }


  async ngOnInit() {

  }

  ngAfterViewInit() { }

  ngOnDestroy() {
    this.routeSub?.unsubscribe()
  }
}
