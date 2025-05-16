import { AfterViewInit, Component, computed, CUSTOM_ELEMENTS_SCHEMA, effect, ElementRef, NgZone, OnDestroy, OnInit, signal, Signal, ViewChild } from '@angular/core';
import { GuardsCheckEnd, GuardsCheckStart, NavigationCancel, NavigationEnd, NavigationError, NavigationStart, ResolveEnd, ResolveStart, Router, RouterOutlet, RoutesRecognized } from '@angular/router';
import { HeaderComponent } from './components/common/header/header.component';
import { MoleculeViewerComponent } from './components/chem/molecule-viewer/molecule-viewer.component';
import { ThemeManagerService } from './services/stores/theme-manager.service';
import { SearchOverlayComponent } from './components/search-overlay/search-overlay/search-overlay.component';
import { SearchContextService } from './services/stores/search-context.service';
import { FooterComponent } from './components/common/footer/footer.component';
import { NgxxSpinnerComponent } from './components/common/ngxx-spinner/ngxx-spinner.component';
import { filter, Subscription } from 'rxjs';
import { FingerprintService } from './services/fingerprint.service';
import { ToastComponent } from './components/common/toast/toast.component';
import { ToastService } from './services/toast.service';
import { UserContextService } from './services/stores/user-context.service';
import { PathService } from './services/path.service';
import { SidenavContextService } from './services/stores/sidenav-context.service';
import { DesignService } from './services/design.service';
import { SidenavComponent } from './components/common/sidenav/sidenav.component';



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
      <app-header class="sticky top-0 z-30"></app-header>

      <!-- 2️⃣  Drawer‑container  (relativo, overflow‑hidden) -->

      <div class="drawer-container relative flex flex-1 overflow-hidden">
        @if (userContext.initials() && design.minBk('lg')()) {
          <div class="absolute top-2 left-2 z-30">
            <button class="cursor-pointer" (click)="sidenavContext.toggle()">
              @if (sidenavContext.isVisible()) {
                <svg xmlns="http://www.w3.org/2000/svg" class="fill-current w-7 h-auto text-light-on-surface-main dark:text-dark-on-surface-main" viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M512 256A256 256 0 1 0 0 256a256 256 0 1 0 512 0zM271 135c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-87 87 87 87c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0L167 273c-9.4-9.4-9.4-24.6 0-33.9L271 135z"/></svg>
              } @else {
                <svg xmlns="http://www.w3.org/2000/svg" class="fill-current w-7 h-auto text-light-on-surface-main dark:text-dark-on-surface-main" viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M0 256a256 256 0 1 0 512 0A256 256 0 1 0 0 256zM241 377c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l87-87-87-87c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0L345 239c9.4 9.4 9.4 24.6 0 33.9L241 377z"/></svg>
              }
            </button>
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
    protected readonly design: DesignService
  ) {
    effect(() => {
      const initials = this.userContext.initials()
      const isValid = initials && (initials.length === 1 || initials.length === 2);

      // Leggi direttamente dalla Router URL, non da pathService
      const currentUrl = this.router.url;

      // Non fare nulla finché Angular non ha completato la navigazione
      if (currentUrl === '' || currentUrl === '/') return;

      // Se non sei loggato, e non sei già su /login, forza redirect
      if (!isValid && !currentUrl.startsWith('/login')) {
        this.toastService.trigger('Accesso negato')
        this.router.navigateByUrl('/login')
      }
    })
    effect(() => {
      const initials = this.userContext.initials();
      console.log('[effect] initials =', initials, 'zone?', NgZone.isInAngularZone());
      console.log('[effect] router url =', this.router.url);

      if (!initials && !this.router.url.startsWith('/login')) {
        console.log('[effect] → navigate /login');
        this.router.navigate(['/login']);
      }
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
