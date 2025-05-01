import { Component, HostListener, OnInit } from '@angular/core';
import { SearchContextService } from '../../../services/stores/search-context.service';
import { SearchInputComponent } from '../search-input/search-input.component';

@Component({
  selector: 'app-search-overlay',
  imports: [SearchInputComponent],
  templateUrl: './search-overlay.component.html',
  styleUrl: './search-overlay.component.css'
})
export class SearchOverlayComponent implements OnInit {

  constructor(protected readonly searchContextService: SearchContextService) { }

  close(): void {
    this.searchContextService.isOpenedSearchOverlay.set(false)
  }

  onSearch(query: string): void {}

  @HostListener('document:keydown.escape', ['$event'])
  onEscape() {
    if (this.searchContextService.isOpenedSearchOverlay()) {
      this.close()
    }
  }

  ngOnInit(): void {

  }

}
