import { MoleculeSearchResult } from './../../../Models/graphql/molecule-search/molecule-search-result.interface';
import { Component, HostListener, OnInit, signal } from '@angular/core';
import { SearchContextService } from '../../../services/context/search-context.service';
import { SearchInputComponent } from '../search-input/search-input.component';
import { SearchResultComponent } from '../search-result/search-result.component';

@Component({
  selector: 'app-search-overlay',
  imports: [SearchInputComponent, SearchResultComponent],
  template: `
    <div
      class="fixed inset-0 z-[999] bg-black/70 backdrop-blur-sm text-light-on-surface-main dark:text-slate-50 transition-all duration-300"
      [class.opacity-0]="!searchContextService.isVisible()"
      [class.opacity-100]="searchContextService.isVisible()">
      <div class="flex justify-center items-center pt-32 sm:pt-40 px-4">
        <div
          class="w-full h-[60vh] max-w-3xl space-y-6 bg-light-surface-main/85 dark:bg-dark-surface-main/85 p-3 2xs:p-4 md:p-6 lg:p-12 rounded-lg">
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
            (onQuery)="query.set($event)"
            (onEmpty)="empty.set(true)"
          />

          <div
            class="bg-light-surface-secondary dark:bg-slate-50/10 p-6 h-full rounded-xl text-light-on-surface-main dark:text-sm dark:text-slate-50/90 max-h-[40vh] overflow-y-auto">
            <p>[🔬] Area input, filtri e risultati</p>
            <hr class="border-px border-slate-300/50 mt-5" />
            <!-- Skeleton loader -->
            @if (loading()) {
              <div class="space-y-3">
                @for (i of [0, 1, 2, 3, 4]; track i) {
                  <div class="flex items-center gap-3 p-3 rounded-lg animate-pulse bg-slate-200 my-1">
                    <div class="w-12 h-12 bg-slate-300 rounded-lg"></div>
                    <div class="flex-1 min-w-0">
                      <div class="h-4 bg-slate-300 rounded w-2/3 mb-2"></div>
                      <div class="h-3 bg-slate-200 rounded w-1/2"></div>
                    </div>
                  </div>
                  }
              </div>
              } @else if (results().length) {
                <!-- Lista risultati -->
                @for (molecule of results(); track molecule) {
                  <app-search-result [molecule]="molecule" [query]="query()"></app-search-result>
                }
              } @else if (!results().length && !error() && !empty()) {
                <div class="text-sm text-gray-400 text-center py-8">
                  Nessun risultato trovato.
                </div>
              } @else if (error()) {
                <div class="text-sm text-red-500 bg-red-50 dark:bg-red-950 rounded px-4 py-2 text-center">
                  Errore nella ricerca. Riprova.
                </div>
              }


          </div>
        </div>
      </div>
    </div>


  `
})
export class SearchOverlayComponent implements OnInit {

  empty = signal<boolean>(true)
  query = signal<string>('')
  loading = signal<boolean>(false)
  results = signal<MoleculeSearchResult[]>([])
  error = signal<unknown | null>(null)

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

  ngOnInit(): void {

  }

  onEmpty(): void {
    this.empty.set(true)
  }

  handleResults(results: MoleculeSearchResult[]): void {
    this.empty.set(false)
    this.results.set(results)
    this.error.set(null)
  }

  handleError(err: unknown): void {
    this.empty.set(false)
    this.error.set(err)
    this.results.set([])
  }

}
