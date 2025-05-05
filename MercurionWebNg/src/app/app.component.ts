import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, OnDestroy, OnInit, Signal } from '@angular/core';
import { GuardsCheckEnd, GuardsCheckStart, NavigationCancel, NavigationEnd, NavigationError, NavigationStart, ResolveEnd, ResolveStart, Router, RouterOutlet, RoutesRecognized } from '@angular/router';
import { HeaderComponent } from './components/common/header/header.component';
import { MoleculeViewerComponent } from './components/chem/molecule-viewer/molecule-viewer.component';
import { ThemeManagerService } from './services/stores/theme-manager.service';
import { SearchOverlayComponent } from './components/search-overlay/search-overlay/search-overlay.component';
import { SearchContextService } from './services/stores/search-context.service';
import { FooterComponent } from './components/common/footer/footer.component';
import { ChemSpinnerComponent } from './components/common/spinner/chem-spinner.component';
import { NgxxSpinnerComponent } from './components/common/ngxx-spinner/ngxx-spinner.component';
import { filter, Subscription } from 'rxjs';



@Component({
  selector: 'app-root',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    RouterOutlet,
    HeaderComponent,
    MoleculeViewerComponent,
    SearchOverlayComponent,
    FooterComponent,
    NgxxSpinnerComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {

  title = 'MercurionWebNg'

  smilesString = 'CC(=O)OC1=CC=CC=C1C(=O)O'
  smilesString1 = 'CC[C@@H]([C@H](C)O)N1C(=O)N(C=N1)C2=CC=C(C=C2)N3CCN(CC3)C4=CC=C(C=C4)OC[C@H]5C[C@](OC5)(CN6C=NC=N6)C7=C(C=C(C=C7)F)F'

  isDarkTheme: Signal<boolean> = computed(() => this.themeManagerService.theme() === 'dark')

  private subs: Subscription | undefined

  constructor(
    private readonly themeManagerService: ThemeManagerService,
    protected readonly searchContextService: SearchContextService,
    private readonly router: Router
  ) { }

  ngOnInit(): void {
    this.subs = this.router.events.subscribe(event => {
      switch (event.constructor) {
        case NavigationStart:
          console.log('🔵 NavigationStart:', event);
          break;
        case RoutesRecognized:
          console.log('🟡 RoutesRecognized:', event);
          break;
        case GuardsCheckStart:
          console.log('🟠 GuardsCheckStart:', event);
          break;
        case GuardsCheckEnd:
          console.log('🟠 GuardsCheckEnd:', event);
          break;
        case ResolveStart:
          console.log('🟣 ResolveStart:', event);
          break;
        case ResolveEnd:
          console.log('🟣 ResolveEnd:', event);
          break;
        case NavigationCancel:
          console.warn('⛔ NavigationCancel:', event);
          break;
        case NavigationError:
          console.error('❌ NavigationError:', event);
          break;
        case NavigationEnd:
          console.log('✅ NavigationEnd:', event);
          break;
      }
    })
  }

  ngOnDestroy(): void {
    this.subs?.unsubscribe()
  }




}
