import { Component, computed, OnInit, Signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './components/common/header/header.component';
import { MoleculeViewerComponent } from './components/chem/molecule-viewer/molecule-viewer.component';
import { ThemeManagerService } from './services/stores/theme-manager.service';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, MoleculeViewerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {

  title = 'MercurionWebNg'

  smilesString = 'CC(=O)OC1=CC=CC=C1C(=O)O'

  isDarkTheme: Signal<boolean> = computed(() => this.themeManagerService.theme() === 'dark')

  constructor(private readonly themeManagerService: ThemeManagerService) { }

  ngDoCheck() {
    console.log(this.isDarkTheme())
  }

}
