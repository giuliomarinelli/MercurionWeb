import { MoleculeSearchResult } from './../../../Models/graphql/molecule-search/molecule-search-result.interface';
import { Component, HostListener, OnInit, signal } from '@angular/core';
import { SearchContextService } from '../../../services/stores/search-context.service';
import { SearchInputComponent } from '../search-input/search-input.component';

@Component({
  selector: 'app-search-overlay',
  imports: [SearchInputComponent],
  template: `
    <div
      class="fixed inset-0 z-[999] bg-black/70 backdrop-blur-sm text-light-on-surface-main dark:text-slate-50 transition-all duration-300"
      [class.opacity-0]="!searchContextService.isVisible()"
      [class.opacity-100]="searchContextService.isVisible()">
      <div class="flex justify-center items-start pt-32 sm:pt-40 px-4">
        <div
          class="w-full max-w-3xl space-y-6 bg-light-surface-main/85 dark:bg-dark-surface-main/85 p-3 2xs:p-4 md:p-6 lg:p-12 rounded-lg">
          <!-- HEADER -->
          <div class="flex justify-between items-center mb-3 relative md:-top-2 lg:-top-4">
            <h2 class="text-2xl font-semibold tracking-wide">Ricerca molecolare</h2>
            <button (click)="close()"
              class="text-light-on-surface-main/70 dark:text-slate-50/70 hover:text-slate-500/80 dark:hover:text-white transition">
              <svg class="w-9 h-9" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512">
                <path fill="currentColor"
                  d="M310.6 361.4L233.3 284.1 310.6 206.7c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L188 238.7 110.6 161.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L142.7 284.1 65.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L188 329.3l77.3 77.3c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3z" />
              </svg>
            </button>
          </div>

          <!-- Qui inserirai i tuoi componenti -->
          <!-- Esempio placeholder -->
          <app-search-input
            (onLoading)="loading.set($event)"
            (onResult)="handleResults($event)"
            (onError)="handleError($event)"
          />

          <div
            class="bg-light-surface-secondary dark:bg-slate-50/10 p-6 rounded-xl text-light-on-surface-main dark:text-sm dark:text-slate-50/90">
            <p>[🔬] Area input, filtri e risultati</p>
          </div>
        </div>
      </div>
    </div>


  `
})
export class SearchOverlayComponent implements OnInit {

  loading = signal<boolean>(false)

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

  handleResults(results: MoleculeSearchResult[]): void {

  }

  handleError(err: unknown): void {

  }

}
