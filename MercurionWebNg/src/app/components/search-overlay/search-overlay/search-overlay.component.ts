import { Component, HostListener } from '@angular/core';
import { SearchContextService } from '../../../services/stores/search-context.service';

@Component({
  selector: 'app-search-overlay',
  imports: [],
  templateUrl: './search-overlay.component.html',
  styleUrl: './search-overlay.component.css'
})
export class SearchOverlayComponent {

  constructor(protected readonly searchContextService: SearchContextService) { }

  close(): void {
    this.searchContextService.isOpenedSearchOverlay.set(false)
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscape() {
    if (this.searchContextService.isOpenedSearchOverlay()) {
      this.close()
    }
  }

}
