import { MoleculeCardItemModel } from './../../Models/graphql/molecule-collection/molecule-collection.types';
import { Component, effect, ElementRef, inject, OnDestroy, OnInit, signal, ChangeDetectionStrategy, viewChild } from '@angular/core';
import { MoleculeCollectionItemCardComponent } from '../../components/molecule-detail/molecule-collection-item-card/molecule-collection-item-card.component';
import { delay, map, Subscription } from 'rxjs';
import { MoleculeCollectionItemService } from '../../services/graphql/molecule-collection-item.service';
import { Helpers } from '../../helpers';
import { SkeletonMoleculeCardComponent } from '../../components/molecule-detail/skeleton-molecule-card/skeleton-molecule-card.component';
import { MyMoleculesHeadingComponent } from '../../components/molecule-detail/my-molecules-heading/my-molecules-heading.component';
import { RouterLink } from '@angular/router';
import { HistoryContextService } from '../../services/context/history-context.service';
import { ToastService } from '../../services/toast.service';
import { PaginationController } from '../../services/pagination/pagination-controller';
import { SearchFieldComponent } from '../../components/common/search-field/search-field.component';
import { ButtonComponent } from '../../components/common/button/button.component';
import { ActionOverlayContextService } from '../../services/context/action-context/action-overlay-context.service';
import { DomainInvalidationService } from '../../services/domain-invalidation.service';
import { RealtimeSyncStatusService } from '../../services/realtime-sync-status.service';
import { ScrollContextService } from '../../services/context/scroll-context.service';

@Component({
  selector: 'm-all-my-molecules.page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MoleculeCollectionItemCardComponent,
    SkeletonMoleculeCardComponent,
    MyMoleculesHeadingComponent,
    RouterLink,
    SearchFieldComponent,
    ButtonComponent
  ],
  styleUrl: '../molecule-list-page.css',
  template: `
    <section class="molecule-list-page" role="main" aria-labelledby="all-my-molecules-heading">
      <m-my-molecules-heading [compact]="true" />
      <header class="m-list-heading">
        <div>
          <h2 id="all-my-molecules-heading">Tutte le mie molecole</h2>
          <p>Le molecole salvate, raccolte in un unico posto.</p>
        </div>
        <m-button size="lg" (pressed)="doAddMolecules()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="size-4 shrink-0" aria-hidden="true"><path d="M12 4v16M4 12h16" stroke-width="1.5" /></svg>
          Aggiungi molecole
        </m-button>
      </header>
      <div class="m-list-tools">
        <m-search-field label="Cerca nelle mie molecole" placeholder="Cerca molecola..."
          [value]="searchInput()" [pending]="loading && page === 1"
          (valueChange)="doQuery($event)" (submitted)="submitQuery($event)" />
        <div class="m-list-context">
          <p role="status" aria-live="polite" aria-atomic="true">
            @if (loading && page === 1) { Ricerca in corso… }
            @else if (paginationState().error && !items.length) { Risultati non disponibili }
            @else { {{ items.length }} {{ items.length === 1 ? 'molecola visualizzata' : 'molecole visualizzate' }} }
          </p>
          <a class="m-list-link" routerLink="/molecules/collections">Le mie collezioni<span aria-hidden="true">→</span></a>
        </div>
      </div>
      <div class="m-list-results" [attr.aria-busy]="loading" aria-label="Molecole salvate">
        @for (item of items; track item.id; let i = $index) {
          <m-molecule-collection-item-card [molecule]="item" (onDelete)="doDelete($event)" [i]="i"
            [triggerDisappear]="item.triggerDisappear()" [collapse]="item.collapse()" />
        }
        @if (loading && page === 1) {
          <div class="m-list-skeletons" aria-hidden="true">
            @for (i of [0, 1, 2, 3, 4]; track i) { <m-skeleton-molecule-card [i]="i" /> }
          </div>
        }
        @if (!loading && !paginationState().error && !items.length && done) {
          <div class="m-list-empty">
            <h3>{{ searchTerm() ? 'Nessun risultato' : 'La tua raccolta inizia qui' }}</h3>
            <p>{{ searchTerm() ? 'Prova un altro nome oppure cancella la ricerca.' : 'Scegli una collezione e aggiungi le molecole da conservare.' }}</p>
            @if (searchTerm()) { <m-button size="lg" variant="outline" (pressed)="doClear()">Cancella ricerca</m-button> }
            @else { <m-button size="lg" (pressed)="doAddMolecules()">Aggiungi molecole</m-button> }
          </div>
        }
      </div>
      <div #sentinel class="m-list-sentinel" aria-hidden="true"></div>
      <div class="m-list-pagination">
        @if (paginationState().error) {
          <div class="m-list-error" role="alert">
            <p>{{ items.length ? 'Non siamo riusciti a caricare altri risultati. Quelli già caricati restano disponibili.' : 'Non siamo riusciti a caricare le molecole. Riprova tra poco.' }}</p>
            <m-button size="lg" variant="outline" (pressed)="retryPagination()">Riprova</m-button>
          </div>
        } @else if (items.length && !done) {
          <m-button size="lg" variant="outline" [loading]="loading" (pressed)="loadMore()">Carica altre molecole</m-button>
        } @else if (items.length && done) {
          <p class="m-list-end">Hai visualizzato tutte le molecole{{ searchTerm() ? ' corrispondenti alla ricerca' : '' }}.</p>
        }
      </div>
    </section>
  `
})
export class AllMyMoleculesPageComponent implements OnInit, OnDestroy {

  // ======================= DEPS =======================
  private readonly moleculeCollectionItemService = inject(MoleculeCollectionItemService)
  private readonly historyContext = inject(HistoryContextService)
  private readonly toast = inject(ToastService)
  private readonly actionContext = inject(ActionOverlayContextService)
  private readonly invalidations = inject(DomainInvalidationService)
  private readonly syncStatus = inject(RealtimeSyncStatusService)
  private readonly scrollContext = inject(ScrollContextService)
  private readonly pagination = new PaginationController<MoleculeCardItemModel>({
    fetch: (page, query) => this.moleculeCollectionItemService.getAllPaginatedItems(page, 25, query).pipe(
      delay(page === 1 ? 120 : 0),
      map(result => ({ ...result, items: result.items.map(mol => Helpers.moleculeClientToCardConverter(mol)) }))
    )
  })
  readonly searchInput = signal('')
  private queryTimer?: ReturnType<typeof setTimeout>
  private observer?: IntersectionObserver
  protected readonly sentinel = viewChild<ElementRef<HTMLDivElement>>('sentinel')
  // ====================================================

  private tick = signal<number>(0)

  get items(): MoleculeCardItemModel[] { return this.pagination.items() }
  get loading(): boolean { return this.pagination.loading() }
  get done(): boolean { return this.pagination.done() }
  get earlyDone(): boolean { return this.pagination.earlyDone() }
  get page(): number { return this.pagination.page() }
  get searchTerm(): ReturnType<typeof signal<string>> { return this.pagination.query }
  get empty(): ReturnType<typeof signal<boolean>> { return this.pagination.empty }
  paginationState() { return this.pagination.paginationState() }


  private delSub?: Subscription

  constructor() {
    effect(() => {
      const sentinel = this.sentinel()?.nativeElement
      const root = this.scrollContext.intersectionRoot()
      const canLoad = !this.pagination.loading() && !this.pagination.done() && !this.pagination.error()
      this.observer?.disconnect()
      if (!sentinel || !canLoad) return
      this.observer = new IntersectionObserver(entries => {
        if (entries[0]?.isIntersecting) void this.loadMore()
      }, { root, rootMargin: '0px 0px 500px 0px' })
      this.observer.observe(sentinel)
    })
    effect(() => {
      const t = this.tick()
      if (t === 0) {
        return
      }
      queueMicrotask(() => {
        this.resetPagination()
      })
    })
    effect(() => {
      const event = this.invalidations.last()
      if (event?.domain !== 'molecule-collection' || event.action !== 'molecules-added') {
        return
      }
      queueMicrotask(() => {
        this.resetPagination()
      })
    })
    effect(() => {
      const event = this.invalidations.last()
      const remoteMoleculeChanged =
        event?.domain === 'molecule' &&
        event.action === 'changed' &&
        event.remote === true
      const reconnect = event?.domain === 'realtime' && event.action === 'reconcile'
      if (!remoteMoleculeChanged && !reconnect) return
      if (remoteMoleculeChanged) this.syncStatus.markSynchronized()
      queueMicrotask(() => this.resetPagination())
    })
  }


  ngOnInit(): void {
    queueMicrotask(() => void this.loadMore())
  }

  ngOnDestroy(): void {
    clearTimeout(this.queryTimer)
    this.observer?.disconnect()
    this.pagination.dispose()
    this.delSub?.unsubscribe()
  }

  loadMore(): Promise<void> { return this.pagination.loadMore() }
  retryPagination(): void { this.pagination.retry() }
  resetPagination(): void { this.pagination.reset() }
  doQuery(q: string): void {
    this.searchInput.set(q)
    clearTimeout(this.queryTimer)
    if (!q.trim()) { this.submitQuery(q); return }
    this.queryTimer = setTimeout(() => this.submitQuery(q), 250)
  }
  submitQuery(q: string): void {
    clearTimeout(this.queryTimer)
    this.searchInput.set(q)
    if (q.trim() !== this.searchTerm()) this.pagination.setQuery(q.trim())
  }
  doClear(): void { this.submitQuery('') }

  doDelete(id: string): void {
    const onError = () => queueMicrotask(() => this.toast.trigger('Si è verificato un errore.', 'error', 3000))
    this.delSub = this.moleculeCollectionItemService.deleteItem(id).subscribe({
      next: ok => {
        if (ok) {
          this.historyContext.triggerRemoveItemFromHistoryView(id)
          const i = this.items.findIndex(item => item.id === id)
          if (i !== -1) {
            queueMicrotask(() => {
              this.historyContext.triggerRemoveItemFromHistoryView(id)
              this.items[i].triggerDisappear.set(true)
              setTimeout(() => this.items[i]?.collapse.set(true), 120)
              setTimeout(() => {
                this.pagination.replaceItems(this.items.filter(item => item.id !== id))
                if (this.items.length === 0) {
                  this.tick.update(x => x + 1)
                }
              }, 500)
              void this.loadMore()
            })
          }
        } else {
          onError()
        }
      },
      error: () => onError()
    })
  }

  doAddMolecules(): void {
    queueMicrotask(() => {
      // Ensure a clean context when starting from the All My Molecules page
      this.actionContext.open('SelectCollectionThenRoute', { importFromChembl: false })
    })
  }

}
