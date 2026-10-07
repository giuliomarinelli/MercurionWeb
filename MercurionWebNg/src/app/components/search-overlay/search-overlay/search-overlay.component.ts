import {
  AfterViewInit,
  OnDestroy,
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  inject,
  signal,
  effect,
  untracked,
  viewChild
} from '@angular/core'

import { SearchContextService } from '../../../services/context/search-context.service'
import { SearchFieldComponent } from '../../common/search-field/search-field.component'
import { ButtonComponent } from '../../common/button/button.component'
import { SearchResultComponent } from '../search-result/search-result.component'
import { SearchResultSkeletonLoaderComponent } from '../search-result-skeleton-loader/search-result-skeleton-loader.component'
import { SearchTypeSelectorComponent } from '../search-type-selector/search-type-selector.component'
import { IconButtonComponent } from '../../common/icon-button/icon-button.component'
import { UserContextService } from '../../../services/context/user-context.service'
import { MoleculeSearchResult } from '../../../Models/graphql/molecule-search/molecule-search-result.interface'
import { PageModel } from '../../../Models/graphql/page.models'
import { MoleculeCardItemModel, MoleculeCollectionItemClient } from '../../../Models/graphql/molecule-collection/molecule-collection.types'
import { SkeletonMoleculeCardComponent } from '../../molecule-detail/skeleton-molecule-card/skeleton-molecule-card.component'
import { MoleculeSummaryCardComponent } from '../../molecule-detail/molecule-summary-card/molecule-summary-card.component'
import { moleculeCardToSummary } from '../../molecule-detail/molecule-summary-card/molecule-summary-card.view-model'
import { MoleculeSearchService } from '../../../services/graphql/molecule-search.service'
import { MoleculeCollectionItemService } from '../../../services/graphql/molecule-collection-item.service'
import { Helpers } from '../../../helpers'
import { Subscription } from 'rxjs'
import { map } from 'rxjs/operators'
import { DialogShellComponent } from '../../common/dialog-shell/dialog-shell.component'
import { ViewportRuntimeService } from '../../../services/context/viewport-runtime.service'
import { ShellLayoutService } from '../../../services/context/shell-layout.service'


@Component({
  selector: 'm-search-overlay',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    SearchFieldComponent,
    ButtonComponent,
    SearchResultComponent,
    SearchTypeSelectorComponent,
    IconButtonComponent,
    SearchResultSkeletonLoaderComponent,
    SkeletonMoleculeCardComponent,
    MoleculeSummaryCardComponent,
    DialogShellComponent
  ],
  template: `
    <m-dialog-shell
      [mounted]="searchContextService.isMounted()"
      [open]="searchContextService.isVisible()"
      label="Ricerca molecolare"
      backdropVariant="search"
      panelVariant="search"
      (dismissed)="close()">
      <div class="flex w-full min-w-0 justify-center items-center px-2 sm:px-4 m-overlay-screen">
        <div
          [class.m-search-panel--compact]="viewport.overlayCompact()"
          [class.m-search-panel--short]="viewport.visualHeight() < 260"
          class="m-search-panel w-full min-w-0 max-w-3xl flex flex-col
          bg-light-surface-main dark:bg-dark-surface-main
           p-4 md:p-6 lg:p-10
           rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/5">
          <!-- HEADER -->
          <div class="m-search-header flex shrink-0 justify-between items-center gap-2">
            <h2 class="text-2xl font-medium tracking-wide">Ricerca molecolare</h2>
            <m-icon-button
              size="sm"
              icon="close"
              ariaLabel="Chiudi ricerca molecolare"
              (pressed)="close()"
            >
            </m-icon-button>
          </div>

          @if (userContext.isLoggedIn()) {
            <m-search-type-selector class="block shrink-0" [value]="_viewMode()" [compact]="viewport.overlayCompact()" (onViewClick)="handleViewClick($event)" />
          }
          <div class="m-search-query shrink-0 min-w-0">
            <m-search-field
              [value]="query()"
              [initialFocus]="true"
              [label]="_viewMode() === 'my' ? 'Cerca nelle tue molecole' : 'Cerca su ChEMBL'"
              [placeholder]="_viewMode() === 'my' ? 'Nome della molecola…' : 'Nome o identificativo ChEMBL…'"
              [hint]="_viewMode() === 'my' ? 'Lascia vuoto per vedere tutte le tue molecole.' : 'Inserisci almeno 2 caratteri.'"
              (valueChange)="handleInput($event)"
              (submitted)="handleQuery($event)" />
            <p class="m-search-hint mt-2 text-xs text-on-surface-secondary">
              {{ _viewMode() === 'my' ? 'Le molecole salvate nel tuo spazio di lavoro.' : 'Esplora ChEMBL: cerca per nome o identificativo, con almeno 2 caratteri.' }}
            </p>
          </div>
          <div class="m-search-results relative bg-surface-secondary flex flex-col flex-1 min-h-0 min-w-0 rounded-xl text-on-surface-main overflow-hidden border border-token-border">
            <div [class.sr-only]="viewport.overlayCompact()" class="m-search-status shrink-0 px-4 py-2 border-b border-token-border text-xs text-on-surface-secondary" role="status" aria-live="polite" aria-atomic="true">
              {{ loading() ? 'Ricerca in corso…' : resultCount() ? resultCount() === 1 ? '1 molecola visualizzata' : resultCount() + ' molecole visualizzate' : 'Risultati della ricerca' }}
            </div>
            <div #scrollRoot class="flex-1 min-h-0 min-w-0 overflow-y-auto overscroll-contain m-scroll-thin p-2 sm:p-3">

            @switch (_viewMode()) {
              @case ('chembl') {
                @if (loading()) {
                  <m-search-result-skeleton-loader />
                } @else if (chemblResults().length) {
                  @for (molecule of chemblResults(); track molecule.id) {
                    <m-search-result class="block mb-2 last:mb-0" [molecule]="molecule" [query]="query()" (navigated)="onResultNavigate()" />
                  }
                } @else if (showChemblEmptyMessage()) {
                  <div class="m-search-state text-sm text-on-surface-secondary text-center px-4 py-8">
                    Nessuna molecola trovata. Prova un altro nome o modifica la ricerca.
                  </div>

                } @else if (!error()) {
                  <div class="m-search-state text-sm text-on-surface-secondary text-center px-4 py-8">
                    <strong class="block mb-2 text-base text-on-surface-main">Trova la tua prossima molecola</strong>
                    Cerca su ChEMBL e apri un risultato per esplorarne la struttura e i dati.
                  </div>
                }
              }
              @case ('my') {
                @if (loading() && !myItems().length) {
                  @for (i of [0,1,2,3,4,5]; track i) {
                    <m-skeleton-molecule-card class="block mb-2 last:mb-0" [compact]="viewport.overlayCompact()" />
                  }
                } @else if (myItems().length) {
                  @for (molecule of myItems(); track molecule.id; let i = $index) {
                    <m-molecule-summary-card
                      [viewModel]="savedSummary(molecule)"
                      (navigate)="onResultNavigate()"
                      class="block w-full mb-2 last:mb-0" />
                  }
                  @if (loading() && myItems().length) {
                    <div class="mt-3">
                      <m-skeleton-molecule-card class="block mb-2 last:mb-0" [compact]="viewport.overlayCompact()" />
                    </div>
                  }
                } @else if (showMyEmptyMessage()) {
                  <div class="m-search-state text-sm text-on-surface-secondary text-center px-4 py-8">
                    Nessuna molecola trovata. Prova un altro nome o modifica la ricerca.
                  </div>

                }
              }
            }

            @if (error()) {
              <div class="m-search-state text-center px-4 py-6" role="alert">
                <p class="font-medium text-on-surface-main">
                  {{ myItems().length ? 'Non siamo riusciti a caricare altre molecole.' : 'La ricerca non è riuscita.' }}
                </p>
                <p class="mt-2 mb-4 text-sm text-on-surface-secondary">La tua ricerca è conservata. Puoi riprovare.</p>
                <m-button size="sm" variant="outline" (pressed)="retry()">Riprova</m-button>
              </div>
            } @else if (_viewMode() === 'my' && myItems().length && !myDone()) {
              <div class="text-center py-3">
                <m-button size="sm" variant="outline" [disabled]="loading()" (pressed)="loadNextMyPage()">{{ loading() ? 'Caricamento…' : 'Carica altre molecole' }}</m-button>
              </div>
            } @else if (_viewMode() === 'chembl' && chemblResults().length === 100) {
              <p class="text-center px-4 py-3 text-xs text-on-surface-secondary">Sono mostrati fino a 100 risultati. Affina la ricerca per trovare la molecola desiderata.</p>
            }
            <div #sentinel class="h-1 w-full"></div>
            </div>
          </div>
        </div>
      </div>
    </m-dialog-shell>
  `,
  styles: [`
    .m-search-panel {
      position: relative;
      height: min(48rem, var(--m-action-card-available-height));
      min-height: 0;
      gap: 1rem;
      padding: clamp(1rem, 2.5vw, 1.75rem);
    }

    /* Short visual viewports need the working controls, not a second title row. */
    .m-search-panel--compact {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      grid-template-rows: auto auto minmax(0, 1fr);
      padding: 0.75rem;
      gap: 0.5rem;
    }
    .m-search-panel--compact .m-search-header { grid-column: 2; grid-row: 2; }
    .m-search-panel--compact .m-search-header h2,
    .m-search-panel--compact .m-search-hint { display: none; }
    .m-search-panel--compact m-search-type-selector { grid-column: 1 / -1; grid-row: 1; }
    .m-search-panel--compact .m-search-query { grid-column: 1; grid-row: 2; }
    .m-search-panel--compact .m-search-results { grid-column: 1 / -1; grid-row: 3; }
    .m-search-panel--short { padding: 0.5rem; gap: 0.25rem; }

    /* Scrollbar sottile per l'area dei risultati */
    .m-scroll-thin {
      scrollbar-gutter: stable;
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
  protected readonly viewport = inject(ViewportRuntimeService)
  private readonly shellLayout = inject(ShellLayoutService)

  protected readonly searchContextService = inject(SearchContextService)
  protected readonly userContext = inject(UserContextService)
  private readonly chemblService = inject(MoleculeSearchService)
  private readonly collectionService = inject(MoleculeCollectionItemService)

  private readonly scrollRoot = viewChild.required<ElementRef<HTMLElement>>('scrollRoot');

  private readonly sentinel = viewChild.required<ElementRef<HTMLDivElement>>('sentinel');

  query = signal<string>('')

  protected _viewMode = signal<'my' | 'chembl'>('chembl')

  loading = signal<boolean>(false)
  error = signal<unknown | null>(null)

  chemblResults = signal<MoleculeSearchResult[]>([])
  private chemblSub?: Subscription

  myItems = signal<MoleculeCardItemModel[]>([])
  savedSummary = (molecule: MoleculeCardItemModel) => moleculeCardToSummary(molecule, {
    actions: [],
    selectable: false,
    compact: this.viewport.overlayCompact()
  })
  private myPage = signal<number>(0)
  private myTotalPages = signal<number | null>(null)
  protected myDone = signal<boolean>(false)
  private mySub?: Subscription

  private observer?: IntersectionObserver
  private destroyed = false
  private queryTimer?: ReturnType<typeof setTimeout>

  constructor() {
    effect(() => {
      const opened = this.searchContextService.isOpenedSearchOverlay()
      untracked(() => {
        clearTimeout(this.queryTimer)
        this.observer?.disconnect()
        this.chemblSub?.unsubscribe()
        this.mySub?.unsubscribe()
        if (opened) {
          this._viewMode.set('chembl')
          this.query.set('')
          this.loading.set(false)
          this.error.set(null)
          this.chemblResults.set([])
          this.resetMyState()
        }
      })
    })
  }

  close(): void {
    clearTimeout(this.queryTimer)
    this.observer?.disconnect()
    this.chemblSub?.unsubscribe()
    this.mySub?.unsubscribe()
    this.searchContextService.close()
  }

  onResultNavigate(): void {
    this.close()
    this.shellLayout.requestCloseOffCanvas()
  }

  ngOnDestroy(): void {
    this.destroyed = true
    clearTimeout(this.queryTimer)
    this.observer?.disconnect()
    this.chemblSub?.unsubscribe()
    this.mySub?.unsubscribe()
  }

  ngAfterViewInit(): void {
    const rootEl = this.scrollRoot()?.nativeElement ?? null
    const sentinelEl = this.sentinel()?.nativeElement
    if (!sentinelEl) return

    this.observer = new IntersectionObserver(entries => {
      const entry = entries[0]
      if (!entry.isIntersecting) return
      if (this._viewMode() !== 'my') return
      if (!this.searchContextService.isOpenedSearchOverlay() || this.loading() || this.myDone() || this.error()) return

      // stacco subito, cosÃƒÂ¬ non resta "incollato" intersecting
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

  protected resultCount(): number {
    return this._viewMode() === 'my' ? this.myItems().length : this.chemblResults().length
  }

  handleInput(raw: string): void {
    clearTimeout(this.queryTimer)
    this.observer?.disconnect()
    this.chemblSub?.unsubscribe()
    this.mySub?.unsubscribe()
    this.query.set(raw)
    this.loading.set(false)
    this.error.set(null)
    this.chemblResults.set([])
    this.resetMyState()
    if (this._viewMode() === 'chembl' && raw.trim().length < 2) return
    this.loading.set(true)
    this.queryTimer = setTimeout(() => this.handleQuery(raw), 300)
  }

  protected retry(): void {
    if (this._viewMode() === 'my') this.loadNextMyPage()
    else this.handleQuery(this.query())
  }

  handleQuery(raw: string): void {
    clearTimeout(this.queryTimer)
    this.observer?.disconnect()
    this.query.set(raw ?? '')
    this.loading.set(false)
    this.error.set(null)

    const trimmed = this.query().trim()
    this.scrollRoot().nativeElement.scrollTop = 0

    if (this._viewMode() === 'chembl') {
      if (trimmed.length < 2) {
        this.chemblSub?.unsubscribe()
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
      this.chemblSub?.unsubscribe()
      this.chemblResults.set([])
      this.loading.set(false)
      this.error.set(null)
    }
  }

  handleViewClick(mode: 'my' | 'chembl'): void {
    if (this._viewMode() === mode) return

    clearTimeout(this.queryTimer)
    this._viewMode.set(mode)
    this.observer?.disconnect()
    this.scrollRoot().nativeElement.scrollTop = 0
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
    if (this.loading() || this.myDone() || this.destroyed) return

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
          const existingIds = new Set(this.myItems().map(item => item.id))
          const merged = [...this.myItems(), ...page.items.filter(item => !existingIds.has(item.id))]
          this.myItems.set(merged)
          this.myPage.set(page.currentPage)
          this.myTotalPages.set(page.totalPages)

          if (page.currentPage >= page.totalPages || page.items.length === 0) {
            this.myDone.set(true)
          }

          this.loading.set(false)

          // riattacco dopo che Angular ha renderizzato i nuovi items
          queueMicrotask(() => {
            if (this.destroyed || this._viewMode() !== 'my' || this.myDone() ||
              !this.searchContextService.isOpenedSearchOverlay()) return
            const sentinelEl = this.sentinel()?.nativeElement
            if (sentinelEl) this.observer?.observe(sentinelEl)
          })
        },
        error: err => {
          this.error.set(err)
          this.loading.set(false)

        }
      })
  }

  protected showMyEmptyMessage(): boolean {
    if (this.loading() || this.error()) return false
    return this.myItems().length === 0
  }
}
