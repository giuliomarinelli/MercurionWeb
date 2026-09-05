import {
  AfterViewInit,
  OnDestroy,
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  HostListener,
  ViewChild,
  inject,
  signal,
  effect
} from '@angular/core'

import { SearchContextService } from '../../../services/context/search-context.service'
import { SearchInputComponent } from '../search-input/search-input.component'
import { SearchResultComponent } from '../search-result/search-result.component'
import { SearchResultSkeletonLoaderComponent } from '../search-result-skeleton-loader/search-result-skeleton-loader.component'
import { SearchTypeSelectorComponent } from '../search-type-selector/search-type-selector.component'
import { CloseButtonComponent } from '../../common/close-button/close-button.component'
import { UserContextService } from '../../../services/context/user-context.service'
import { MoleculeSearchResult } from '../../../Models/graphql/molecule-search/molecule-search-result.interface'
import { PageModel } from '../../../Models/graphql/page.models'
import { MoleculeCardItemModel, MoleculeCollectionItemClient } from '../../../Models/graphql/molecule-collection/molecule-collection.types'
import { SkeletonMoleculeCardComponent } from '../../molecule-detail/skeleton-molecule-card/skeleton-molecule-card.component'
import { MoleculeCollectionItemCardComponent } from '../../molecule-detail/molecule-collection-item-card/molecule-collection-item-card.component'
import { MoleculeSearchService } from '../../../services/graphql/molecule-search.service'
import { MoleculeCollectionItemService } from '../../../services/graphql/molecule-collection-item.service'
import { Helpers } from '../../../helpers'
import { Subscription } from 'rxjs'
import { map } from 'rxjs/operators'


@Component({
  selector: 'm-search-overlay',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
      [class.opacity-100]="searchContextService.isVisible()"
      role="dialog"
      aria-modal="true"
      aria-label="Ricerca molecolare"
      [attr.aria-hidden]="!searchContextService.isVisible()"
    >
      <div class="flex justify-center md:justify-center items-stretch md:items-center px-2 sm:px-4 pt-1 md:pt-16 m-overlay-screen h-full">
        <div
          class="w-full max-w-3xl space-y-6 flex flex-col h-full md:h-[75vh]
          bg-light-surface-main/90 dark:bg-dark-surface-main/90
           p-4 md:p-6 lg:p-10
           rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/5">
          <!-- HEADER -->
          <div class="flex justify-between items-center mb-3 relative md:-top-2 lg:-top-4">
            <h2 class="text-2xl font-medium tracking-wide">Ricerca molecolare</h2>
            <m-close-button [size]="6" [action]="close.bind(this)" variant="input" />
          </div>

          <m-molecule-search-input
            [viewMode]="_viewMode()"
            [search_excludeAlreadyAdded]="false"
            (onQuery)="handleQuery($event)"
            (onEmpty)="handleEmpty()" />

          <div
          class="relative bg-light-surface-secondary dark:bg-slate-50/10 flex-1 min-h-0 rounded-xl text-light-on-surface-main dark:text-sm dark:text-slate-50/90 overflow-y-auto border border-spacing-px border-slate-300/50 max-h-none md:max-h-[70vh] m-overscroll-touch m-scroll-thin"
            #scrollRoot>
              @if (userContext.isLoggedIn()) {
                <div class="sticky top-0 z-30
                     bg-light-surface-secondary/95 dark:bg-slate-800/95 backdrop-blur
                     px-6 pt-5 pb-4
                     border-b border-slate-200/60 dark:border-white/10
                     overflow-y-auto scrollbar-thin scrollbar-thumb-slate-400/40 dark:scrollbar-thumb-white/20 scrollbar-track-transparent">
                  <m-search-type-selector (onViewClick)="handleViewClick($event)" />
                </div>
              }

            @switch (_viewMode()) {
              @case ('chembl') {
                @if (loading()) {
                  <m-search-result-skeleton-loader />
                } @else if (chemblResults().length) {
                  @for (molecule of chemblResults(); track molecule.id) {
                    <m-search-result [molecule]="molecule" [query]="query()" />
                  }
                } @else if (showChemblEmptyMessage()) {
                  <div class="text-sm text-slate-700 dark:text-slate-200 text-center py-8">
                    Nessun risultato trovato.
                  </div>
                } @else if (error()) {
                  <div class="text-sm text-light-error dark:text-dark-error rounded px-4 py-2 text-center">
                    Errore nella ricerca. Riprova.
                  </div>
                } @else {
                  <div class="text-sm text-slate-700 dark:text-slate-200 text-center py-8">
                    Qui compariranno i risultati quando digiterai.
                  </div>
                }
              }
              @case ('my') {
                @if (loading() && !myItems().length) {
                  @for (i of [0,1,2,3,4,5]; track i) {
                    <m-skeleton-molecule-card />
                  }
                } @else if (myItems().length) {
                  @for (molecule of myItems(); track molecule.id; let i = $index) {
                    <m-molecule-collection-item-card [molecule]="molecule" [i]="i" [hideActions]="true" />
                  }
                  @if (loading() && myItems().length) {
                    <div class="mt-3">
                      <m-skeleton-molecule-card />
                    </div>
                  }
                } @else if (showMyEmptyMessage()) {
                  <div class="text-sm text-slate-700 dark:text-slate-200 text-center py-8">
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
  `,
  styles: [`
    /* Scrollbar sottile per l'area dei risultati */
    .m-scroll-thin {
      scrollbar-width: thin; /* Firefox */
      scrollbar-color: #64748b transparent; /* thumb, track */
    }

    :host-context(.dark) .m-scroll-thin {
      scrollbar-color: #94a3b8 transparent;
    }

    .m-scroll-thin::-webkit-scrollbar {
      width: 6px;
    }

    .m-scroll-thin::-webkit-scrollbar-track {
      background: transparent;
    }

    .m-scroll-thin::-webkit-scrollbar-thumb {
      background-color: #cbd5e1; /* slate-300-ish */
      border-radius: 9999px;
    }

    :host-context(.dark) .m-scroll-thin::-webkit-scrollbar-thumb {
      background-color: #475569; /* slate-600-ish */
    }

    .m-scroll-thin::-webkit-scrollbar-thumb:hover {
      background-color: #94a3b8;
    }

    :host-context(.dark) .m-scroll-thin::-webkit-scrollbar-thumb:hover {
      background-color: #e2e8f0;
    }
  `]
})
export class SearchOverlayComponent implements AfterViewInit, OnDestroy {

  // TODO: Medium priority - align Safari/iOS viewport/keyboard handling here with action overlays if issues reappear.
  protected readonly searchContextService = inject(SearchContextService)
  protected readonly userContext = inject(UserContextService)
  private readonly chemblService = inject(MoleculeSearchService)
  private readonly collectionService = inject(MoleculeCollectionItemService)

  @ViewChild('scrollRoot')
  private scrollRoot!: ElementRef<HTMLElement>

  @ViewChild('sentinel')
  private sentinel!: ElementRef<HTMLDivElement>

  query = signal<string>('')

  protected _viewMode = signal<'my' | 'chembl'>('chembl')

  loading = signal<boolean>(false)
  error = signal<unknown | null>(null)

  chemblResults = signal<MoleculeSearchResult[]>([])
  private chemblSub?: Subscription

  myItems = signal<MoleculeCardItemModel[]>([])
  private myPage = signal<number>(0)
  private myTotalPages = signal<number | null>(null)
  private myDone = signal<boolean>(false)
  private mySub?: Subscription

  private observer?: IntersectionObserver

  constructor() {
    effect(() => {
      if (this.searchContextService.isOpenedSearchOverlay()) {
        this._viewMode.set('chembl')
        this.query.set('')
        this.loading.set(false)
        this.error.set(null)
        this.chemblResults.set([])
        this.myItems.set([])
      }
    })
  }

  close(): void {
    this.searchContextService.close()
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.searchContextService.isOpenedSearchOverlay()) {
      this.close()
    }
  }

  ngOnDestroy(): void {
    this.observer?.disconnect()
    this.chemblSub?.unsubscribe()
    this.mySub?.unsubscribe()
  }

  ngAfterViewInit(): void {
    const rootEl = this.scrollRoot?.nativeElement ?? null
    const sentinelEl = this.sentinel?.nativeElement
    if (!sentinelEl) return

    this.observer = new IntersectionObserver(entries => {
      const entry = entries[0]
      if (!entry.isIntersecting) return
      if (this._viewMode() !== 'my') return
      if (this.loading() || this.myDone()) return

      // stacco subito, così non resta "incollato" intersecting
      this.observer?.unobserve(sentinelEl)
      this.loadNextMyPage()
    }, {
      root: rootEl,
      rootMargin: '0px 0px 200px 0px',
      threshold: 0
    })

    this.observer.observe(sentinelEl)
  }

  // ======= HANDLERS =======

  handleQuery(raw: string): void {
    this.query.set(raw ?? '')
    this.error.set(null)

    const trimmed = this.query().trim()

    if (this._viewMode() === 'chembl') {
      if (trimmed.length < 2) {
        this.loading.set(false)
        this.chemblResults.set([])
        return
      }
      this.searchChembl(trimmed)
      return
    }

    // mode "my"
    this.resetMyState()
    this.loadNextMyPage()
  }

  handleEmpty(): void {
    if (this._viewMode() === 'chembl') {
      this.chemblResults.set([])
      this.loading.set(false)
      this.error.set(null)
    }
  }

  handleViewClick(mode: 'my' | 'chembl'): void {
    if (this._viewMode() === mode) return

    this._viewMode.set(mode)
    this.error.set(null)
    this.loading.set(false)

    if (mode === 'chembl') {
      // passo a chembl: stop paginazione "my"
      this.mySub?.unsubscribe()
      this.myItems.set([])
      this.myPage.set(0)
      this.myTotalPages.set(null)
      this.myDone.set(false)

      const trimmed = this.query().trim()
      if (trimmed.length >= 2) {
        this.searchChembl(trimmed)
      } else {
        this.chemblResults.set([])
      }
      return
    }

    // passo a "my"
    this.chemblSub?.unsubscribe()
    this.chemblResults.set([])
    this.resetMyState()
    this.loadNextMyPage()
  }

  // ======= CHEMBL =======

  private searchChembl(term: string): void {
    this.chemblSub?.unsubscribe()
    this.loading.set(true)
    this.error.set(null)

    this.chemblSub = this.chemblService
      .searchMolecule(term, 100)
      .subscribe({
        next: res => {
          this.chemblResults.set(res ?? [])
          this.loading.set(false)
        },
        error: err => {
          this.error.set(err)
          this.chemblResults.set([])
          this.loading.set(false)
        }
      })
  }

  protected showChemblEmptyMessage(): boolean {
    if (this.loading() || this.error()) return false
    const trimmed = this.query().trim()
    return trimmed.length >= 2 && this.chemblResults().length === 0
  }

  // ======= MY MOLECULES + INFINITE SCROLL =======

  private resetMyState(): void {
    this.mySub?.unsubscribe()
    this.myItems.set([])
    this.myPage.set(0)
    this.myTotalPages.set(null)
    this.myDone.set(false)
  }

  protected loadNextMyPage(): void {
    if (this._viewMode() !== 'my') return
    if (this.loading() || this.myDone()) return

    const nextPage = this.myPage() + 1
    const q = this.query().trim()

    this.loading.set(true)
    this.error.set(null)

    this.mySub?.unsubscribe()

    this.mySub = this.collectionService
      .getAllPaginatedItems(nextPage, 7, q)
      .pipe(
        map((page: PageModel<MoleculeCollectionItemClient>) => ({
          ...page,
          items: page.items.map(mol => Helpers.moleculeClientToCardConverter(mol))
        }))
      )
      .subscribe({
        next: page => {
          const merged = [...this.myItems(), ...page.items]
          this.myItems.set(merged)
          this.myPage.set(page.currentPage)
          this.myTotalPages.set(page.totalPages)

          if (page.currentPage >= page.totalPages || page.items.length === 0) {
            this.myDone.set(true)
          }

          this.loading.set(false)

          // riattacco dopo che Angular ha renderizzato i nuovi items
          queueMicrotask(() => {
            const sentinelEl = this.sentinel?.nativeElement
            if (sentinelEl) this.observer?.observe(sentinelEl)
          })
        },
        error: err => {
          this.error.set(err)
          this.loading.set(false)

          queueMicrotask(() => {
            const sentinelEl = this.sentinel?.nativeElement
            if (sentinelEl) this.observer?.observe(sentinelEl)
          })
        }
      })
  }

  protected showMyEmptyMessage(): boolean {
    if (this.loading() || this.error()) return false
    return this.myItems().length === 0
  }
}
