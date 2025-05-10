import { AfterViewInit, Component, computed, CUSTOM_ELEMENTS_SCHEMA, effect, ElementRef, OnDestroy, OnInit, signal, Signal, ViewChild } from '@angular/core';
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



@Component({
  selector: 'app-root',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    RouterOutlet,
    HeaderComponent,
    SearchOverlayComponent,
    FooterComponent,
    NgxxSpinnerComponent,
    ToastComponent
  ],
  template: `

  <app-header class="block sticky top-0 z-30" />

  <!-- Sidebar FIXED (solo per utenti loggati) -->
  @if (userContext.initials() && sidenavContext.isMounted()) {
    <app-sidebar class="fixed block left-0 bottom-0 top-[69.13px] h-full w-64 bg-slate-100 dark:bg-gray-800/40 shadow-sm text-white transition-transform duration-300 ease-in-out" />
  }

  <!-- Wrapper contenuto + footer -->
  <div class="min-h-screen flex flex-col transition-all" [class.ml-64]="userContext.initials() && sidenavContext.isMounted()">

    <main class="flex-1">
      <router-outlet />
    </main>

    <app-footer class="block transition-all" />
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
    protected readonly sidenavContext: SidenavContextService
  ) {
    effect(() => {
      const initials = this.userContext.initials();
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
