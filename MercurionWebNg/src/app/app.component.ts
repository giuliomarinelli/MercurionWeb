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
import { RealtimeSocketService } from './services/socket.IO/realtime-socket.service'

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
  private currentPath = ''

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
    private readonly realtimeSocketService: RealtimeSocketService
  ) {
    // Connetti la socket una sola volta
    this.realtimeSocketService.connect()

    // Su ogni nuova connessione websocket, esegui handshake e aggiorna il context
    this.realtimeSocketService.onConnect().subscribe(async () => {
      try {
        const ack = await this.realtimeSocketService.emit('so.pub.session_init')
        if (ack?.detail === 'websocket session init successful') {
          this.userContext.setInitials(localStorage.getItem('login') ?? 'U')
        } else {
          this.userContext.clearInitials()
        }
      } catch {
        this.userContext.clearInitials()
      }
    })

    // Se il server notifica che la sessione è scaduta
    this.realtimeSocketService.on('sv.pub.session_expired').subscribe((res: any) => {
      if (res?.detail === 'session expired') {
        this.userContext.clearInitials()
      }
    })

    effect(() => {
      const initials = this.userContext.initials()
      const isLoggedIn = initials !== ''
      const publicRoutes = ['/login', '/register', '/forgot', '/privacy', '/']
      const currentUrl = this.router.url;

      if (!isLoggedIn && !publicRoutes.includes(currentUrl)) {
        this.router.navigate(['/login'])
      }
      if (isLoggedIn && publicRoutes.includes(currentUrl)) {
        this.router.navigate(['/profile'])
      }
    })
  }

  async ngOnInit() {
    this.routeSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: NavigationEnd) => {
        this.currentPath = e.urlAfterRedirects
        this.pathService.setPath(this.currentPath)
      })
  }

  ngAfterViewInit() { }

  ngOnDestroy() {
    this.routeSub?.unsubscribe()
  }
}
