import { MoleculeSearchResult } from './../../../Models/graphql/molecule-search/molecule-search-result.interface';
import { AfterViewInit, Component, effect, ElementRef, HostListener, inject, OnInit, signal, ViewChild } from '@angular/core';
import { SearchContextService } from '../../../services/context/search-context.service';
import { SearchInputComponent } from '../search-input/search-input.component';
import { SearchResultComponent } from '../search-result/search-result.component';
import { SearchResultSkeletonLoaderComponent } from '../search-result-skeleton-loader/search-result-skeleton-loader.component';
import { SearchTypeSelectorComponent } from '../search-type-selector/search-type-selector.component';
import { CloseButtonComponent } from '../../common/close-button/close-button.component';
import { UserContextService } from '../../../services/context/user-context.service';
import { PageModel } from '../../../Models/graphql/page.models';
import { MoleculeCardItemModel } from '../../../Models/graphql/molecule-collection/molecule-collection.types';
import { TypeGuardsService } from '../../../services/type-guards.service';
import { SkeletonMoleculeCardComponent } from '../../molecule-detail/skeleton-molecule-card/skeleton-molecule-card.component';
import { MoleculeCollectionItemCardComponent } from '../../molecule-detail/molecule-collection-item-card/molecule-collection-item-card.component';

@Component({
  selector: 'm-search-overlay',
  imports: [
    SearchInputComponent,
    SearchResultComponent,
    SearchTypeSelectorComponent,
    CloseButtonComponent,
    SearchResultSkeletonLoaderComponent,
    SkeletonMoleculeCardComponent,
    MoleculeCollectionItemCardComponent
  ],
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
            <h2 class="text-2xl font-medium tracking-wide">Ricerca molecolare</h2>
            <m-close-button [size]="8" [action]="close.bind(this)" />
          </div>

          <m-molecule-search-input
            [viewMode]="_viewMode()"
            (onLoading)="loading.set($event)"
            (onResult)="handleResults($event)"
            (onError)="handleError($event)"
            (onQuery)="query.set($event)"
            (onEmpty)="handleEmpty()" />

          <div class="relative bg-light-surface-secondary dark:bg-slate-50/10 p-6 h-full rounded-xl text-light-on-surface-main dark:text-sm dark:text-slate-50/90 max-h-[38vh] overflow-y-auto overflow-anchor-none"
            #scrollRoot>
            <m-search-type-selector (onViewClick)="handleViewClick($event)" />
            <hr class="border-px border-slate-300/50 mt-5 sticky top-[-24px] -z-10" />
            @switch (_viewMode()) {
              @case ('chembl') {
                @if (loading()) {
                <!-- Skeleton loader -->
                  <m-search-result-skeleton-loader />
                } @else if (array(results()).length) {
                  <!-- Lista risultati -->
                  @for (molecule of array(results()); track molecule.id) {
                    <m-search-result [molecule]="molecule" [query]="query()" />
                  }
                } @else if (!array(results()).length && !error() && !empty()) {
                  <div class="text-sm text-gray-400 text-center py-8">
                    Nessun risultato trovato.
                  </div>
                } @else if (error()) {
                  <div class="text-sm text-light-error dark:text-dark-error rounded px-4 py-2 text-center">
                    Errore nella ricerca. Riprova.
                  </div>
                }
              }
              @case ('my') {
                @if (loading()) {
                <!-- Skeleton loader -->
                  @for(i of [0, 1, 2, 3, 4, 5]; track i) {
                   <m-skeleton-molecule-card />
                  }
                } @else if (pagination(results()).items.length) {
                  <!-- Lista risultati -->
                  @for (molecule of pagination(results()).items; track molecule.id; let i = $index) {
                    <m-molecule-collection-item-card [molecule]="molecule" [i]="i" />
                  }
                } @else if (!pagination(results()).items.length) {
                  <div class="text-sm text-gray-400 text-center py-8">
                    Nessun risultato trovato.
                  </div>
                } @else if (error()) {
                  <div class="text-sm text-light-error dark:text-dark-error rounded px-4 py-2 text-center">
                    Errore nella ricerca. Riprova.
                  </div>
                }
              }
            }
            <div #sentinel class="h-1 w-full"></div>
          </div>
        </div>
      </div>
    </div>


  `
})
export class SearchOverlayComponent implements AfterViewInit {

  private readonly userContext = inject(UserContextService)
  protected readonly typeGuards = inject(TypeGuardsService)

  @ViewChild('scrollRoot')
  scrollRoot!: ElementRef<HTMLElement>

  @ViewChild('sentinel')
  sentinel!: ElementRef<HTMLDivElement>

  @ViewChild(SearchInputComponent)
  searchInput!: SearchInputComponent

  empty = signal<boolean>(true)
  query = signal<string>('')
  loading = signal<boolean>(false)
  results = signal<MoleculeSearchResult[] | PageModel<MoleculeCardItemModel>>([])
  error = signal<unknown | null>(null)
  _viewMode = signal<'my' | 'chembl'>('chembl')

  constructor(protected readonly searchContextService: SearchContextService) {
    effect(() => this.empty() && this.results.set([]))
  }

  close(): void {
    this.searchContextService.isOpenedSearchOverlay.set(false)
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.searchContextService.isOpenedSearchOverlay()) {
      this.close()
    }
  }

  ngAfterViewInit(): void {
    this.searchInput.setScrollRoot(this.scrollRoot)
    this.searchInput.setSentinel(this.sentinel)
  }

  onEmpty(): void {
    this.empty.set(true)
    this.query.set('')
  }

  handleResults(results: MoleculeSearchResult[] | PageModel<MoleculeCardItemModel>): void {
    this.empty.set(false)
    this.results.set(results)
    this.error.set(null)
  }

  handleError(e: unknown): void {
    this.empty.set(false)
    this.error.set(e)
    this.results.set([])
  }

  handleViewClick(e: 'my' | 'chembl'): void {
    if (this._viewMode() === e) {
      return
    }
    this._viewMode.set(e)
  }

  array(item: MoleculeSearchResult[] | PageModel<unknown>): MoleculeSearchResult[] {
    if (!this.typeGuards.isMoleculeSearchResultArray(item)) {
      return []
    }
    return item
  }

  pagination(item: MoleculeSearchResult[] | PageModel<unknown>): PageModel<MoleculeCardItemModel> {
    if (!Array.isArray(item)) {
      return item as PageModel<MoleculeCardItemModel>
    }
    return {
      items: [],
      itemCount: 0,
      totalItems: 0,
      itemsPerPage: 0,
      totalPages: 0,
      currentPage: 0
    }
  }

  handleEmpty(): void {
    if (this._viewMode() === 'chembl') {
      this.empty.set(true)
    }
  }

}
