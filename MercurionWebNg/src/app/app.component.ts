import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, effect, ElementRef, OnDestroy, OnInit, Signal, ViewChild } from '@angular/core';
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



@Component({
  selector: 'app-root',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    RouterOutlet,
    HeaderComponent,
    MoleculeViewerComponent,
    SearchOverlayComponent,
    FooterComponent,
    NgxxSpinnerComponent,
    ToastComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {

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
    private readonly userContext: UserContextService,
    private readonly pathService: PathService
  ) {
    effect(() => {
      const path = this.pathService.path();
      const initials = this.userContext.initials();
      const isValid = initials && (initials.length === 1 || initials.length === 2);

      if (!isValid && path !== '/login') {
        this.router.navigateByUrl('/login');
      }
    })
  }

  async ngOnInit(): Promise<void> {

    this.routeSub = this.router.events
      .pipe(
        filter(e => e instanceof NavigationEnd)
      )
      .subscribe((e: NavigationEnd) => {
        this.currentPath = e.urlAfterRedirects
      })
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe()
  }




}
