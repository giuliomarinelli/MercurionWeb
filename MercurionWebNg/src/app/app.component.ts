import { AfterViewInit, Component, computed, CUSTOM_ELEMENTS_SCHEMA, effect, ElementRef, NgZone, OnDestroy, OnInit, signal, Signal, ViewChild } from '@angular/core';
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
import { RealtimeSocketService } from './services/socket.IO/realtime-socket.service';



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

    <!-- 0️⃣  root: colonna piena viewport -->
    <div class="flex flex-col h-screen">

      <!-- 1️⃣  Header (sticky) -->
      <app-header class="sticky top-0 z-30" />

      <!-- 2️⃣  Drawer‑container  (relativo, overflow‑hidden) -->

      <div class="drawer-container relative flex flex-1 overflow-hidden custom-scrollbar">
        @if (userContext.initials() && design.minBk('lg')()) {
          <div class="absolute top-4 left-[10px] z-30 group">
            <button class="cursor-pointer" (click)="sidenavContext.toggle()" aria-label="Sidebar">
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
        <!-- 2a) Drawer (RELATIVE, non fixed) -->
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

        <!-- 2b) Contenuto scorrevole -->
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




    <!-- Overlay e utilità -->
    @if (searchContextService.isMounted()) {
      <app-search-overlay />
    }

    <app-toast [context]="toastService.context()" />
    <app-ngxx-spinner />

`



})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {



  title = 'MercurionWebNg'

  smilesString = 'CC(=O)OC1=CC=CC=C1C(=O)O'
  smilesString1 = 'CC[C@@H]([C@H](C)O)N1C(=O)N(C=N1)C2=CC=C(C=C2)N3CCN(CC3)C4=CC=C(C=C4)OC[C@H]5C[C@](OC5)(CN6C=NC=N6)C7=C(C=C(C=C7)F)F'

  isDarkTheme: Signal<boolean> = computed(() => this.themeManagerService.theme() === 'dark')

  private routeSub: Subscription | undefined
  private currentPath: string = ''

  constructor(
    private readonly themeManagerService: ThemeManagerService,
    protected readonly searchContextService: SearchContextService,
    private readonly router: Router,
    protected readonly toastService: ToastService,
    protected readonly userContext: UserContextService,
    private readonly pathService: PathService,
    protected readonly sidenavContext: SidenavContextService,
    protected readonly design: DesignService,
    private realtimeSocketService: RealtimeSocketService
  ) {
    this.realtimeSocketService.onConnect().subscribe(r => console.log('socket connected'))
    // TODO: Fixd these effects in a robuste manner
    effect(() => {
      // const initials = this.userContext.initials()
      // const isValid = initials && (initials.length === 1 || initials.length === 2);

      // // Leggi direttamente dalla Router URL, non da pathService
      // const currentUrl = this.router.url;

      // // Non fare nulla finché Angular non ha completato la navigazione
      // if (currentUrl === '' || currentUrl === '/') return;

      // // Se non sei loggato, e non sei già su /login, forza redirect
      // if (!isValid && !currentUrl.startsWith('/login')) {
      //   this.toastService.trigger('Accesso negato')
      //   this.router.navigateByUrl('/login')
      // }
    })
    effect(() => {
      // const initials = this.userContext.initials();
      // console.log('[effect] initials =', initials, 'zone?', NgZone.isInAngularZone());
      // console.log('[effect] router url =', this.router.url);

      // if (!initials && !this.router.url.startsWith('/login')) {
      //   console.log('[effect] → navigate /login');
      //   this.router.navigate(['/login']);
      // }
    });


  }

  @ViewChild(HeaderComponent, { read: ElementRef })
  headerRef!: ElementRef<HTMLElement>;

  headerHeight = signal(64)

  async ngOnInit(): Promise<void> {

    this.routeSub = this.router.events
      .pipe(
        filter(e => e instanceof NavigationEnd)
      )
      .subscribe((e: NavigationEnd) => {
        this.currentPath = e.urlAfterRedirects
        this.pathService.setPath(this.currentPath)
      })
  }

  ngAfterViewInit(): void {

  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe()
  }




}
