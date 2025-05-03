import { Component, computed, Signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './components/common/header/header.component';
import { MoleculeViewerComponent } from './components/chem/molecule-viewer/molecule-viewer.component';
import { ThemeManagerService } from './services/stores/theme-manager.service';
import { SearchOverlayComponent } from './components/search-overlay/search-overlay/search-overlay.component';
import { SearchContextService } from './services/stores/search-context.service';
import { FooterComponent } from './components/common/footer/footer.component';
import { ChemSpinnerComponent } from './components/common/spinner/chem-spinner.component';



@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    HeaderComponent,
    MoleculeViewerComponent,
    SearchOverlayComponent,
    FooterComponent,
    ChemSpinnerComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {

  title = 'MercurionWebNg'

  smilesString = 'CC(=O)OC1=CC=CC=C1C(=O)O'
  smilesString1 = 'CC[C@@H]([C@H](C)O)N1C(=O)N(C=N1)C2=CC=C(C=C2)N3CCN(CC3)C4=CC=C(C=C4)OC[C@H]5C[C@](OC5)(CN6C=NC=N6)C7=C(C=C(C=C7)F)F'

  isDarkTheme: Signal<boolean> = computed(() => this.themeManagerService.theme() === 'dark')

  constructor(
    private readonly themeManagerService: ThemeManagerService,
    protected readonly searchContextService: SearchContextService
  ) { }

}
