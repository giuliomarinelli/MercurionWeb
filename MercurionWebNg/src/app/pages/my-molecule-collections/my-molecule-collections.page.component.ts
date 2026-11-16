import { DestructiveConfirmationComponent } from '../../components/common/destructive-confirmation/destructive-confirmation.component'
import { HistoryContextService } from './../../services/context/history-context.service'
import { UiMoleculeCollection } from '../../Models/graphql/molecule-collection/molecule-collection.types'
import { delay, map, Subscription } from 'rxjs'
import { MyMoleculesHeadingComponent } from '../../components/molecule-detail/my-molecules-heading/my-molecules-heading.component'
import { Component, ElementRef, inject, OnInit, effect, OnDestroy, signal, ChangeDetectionStrategy, viewChild } from '@angular/core'
import { MoleculeCollectionService } from '../../services/graphql/molecule-collection.service'
import { CollectionCardComponent } from '../../components/molecule-detail/collection-card/collection-card.component'
import { SkeletonCollectionCardComponent } from '../../components/common/skeleton-card-loader/skeleton-card-loader.component'
import { RouterLink } from '@angular/router'
import { SearchFieldComponent } from '../../components/common/search-field/search-field.component'
import { ButtonComponent } from '../../components/common/button/button.component'
import { PaginationController } from '../../services/pagination/pagination-controller'
import { ActionOverlayContextService } from '../../services/context/action-context/action-overlay-context.service'
import { CreateCollectionContextService } from '../../services/context/action-context/create-collection-context.service'
import { ToastService } from '../../services/toast.service'
import { ScrollContextService } from '../../services/context/scroll-context.service'
import { DomainInvalidationService } from '../../services/domain-invalidation.service'
import { RealtimeSyncStatusService } from '../../services/realtime-sync-status.service'


@Component({
  selector: 'm-my-molecule-collections',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MyMoleculesHeadingComponent,
    CollectionCardComponent,
    SkeletonCollectionCardComponent,
    RouterLink,
    DestructiveConfirmationComponent,
    SearchFieldComponent,
    ButtonComponent
  ],
  styleUrl: '../molecule-list-page.css',
  template: `
    <section class="molecule-list-page" role="main" aria-labelledby="my-collections-heading">
      <m-my-molecules-heading [compact]="true" />
      <header class="m-list-heading">
        <div>
          <h2 id="my-collections-heading">Le mie collezioni molecolari</h2>
          <p>Organizza le tue molecole e ritrova ogni progetto.</p>
        </div>
        <m-button size="lg" (pressed)="createNewCollection()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="size-4 shrink-0" aria-hidden="true"><path d="M12 4v16M4 12h16" stroke-width="1.5" /></svg>
          Crea collezioni
        </m-button>
      </header>
      <div class="m-list-tools">
        <m-search-field label="Cerca nelle mie collezioni" placeholder="Cerca collezione..."
          [value]="searchInput()" [pending]="loading && page === 1"
          (valueChange)="doQuery($event)" (submitted)="submitQuery($event)" />
        <div class="m-list-context">
          <p role="status" aria-live="polite" aria-atomic="true">
            @if (loading && page === 1) { Ricerca in corso… }
            @else if (paginationState().error && !items.length) { Risultati non disponibili }
            @else { {{ items.length }} {{ items.length === 1 ? 'collezione visualizzata' : 'collezioni visualizzate' }} }
          </p>
          <a class="m-list-link" routerLink="/molecules">Tutte le mie molecole<span aria-hidden="true">→</span></a>
        </div>
      </div>
      <div class="m-list-results" role="group" [attr.aria-busy]="loading" aria-label="Collezioni salvate">
        @for (item of items; track item.id; let i = $index) {
          <m-collection-card [collection]="item" (onDuplicate)="doDuplicateCollection($event)" (onDelete)="doDeleteCollection($event)" (onAddMolecules)="doAddMoleculesToCollection($event)" [i]="i"
            [triggerDisappear]="item.triggerDisappear()" [collapse]="item.collapse()" />
        }
        @if (loading && page === 1) {
          <div class="m-list-skeletons" aria-hidden="true">
            @for (i of [0, 1, 2, 3, 4]; track i) { <m-skeleton-collection-card [i]="i" /> }
          </div>
        }
        @if (!loading && !paginationState().error && !items.length && done) {
          <div class="m-list-empty">
            <h3>{{ searchTerm() ? 'Nessun risultato' : 'Crea la tua prima collezione' }}</h3>
            <p>{{ searchTerm() ? 'Prova un altro nome oppure cancella la ricerca.' : 'Raggruppa le molecole per progetto, famiglia o argomento.' }}</p>
            @if (searchTerm()) { <m-button size="lg" variant="outline" (pressed)="doClear()">Cancella ricerca</m-button> }
            @else { <m-button size="lg" (pressed)="createNewCollection()">Crea collezioni</m-button> }
          </div>
        }
      </div>
      <div #sentinel class="m-list-sentinel" aria-hidden="true"></div>
      <div class="m-list-pagination">
        @if (paginationState().error) {
          <div class="m-list-error" role="alert">
            <p>{{ items.length ? 'Non siamo riusciti a caricare altri risultati. Quelli già caricati restano disponibili.' : 'Non siamo riusciti a caricare le collezioni. Riprova tra poco.' }}</p>
            <m-button size="lg" variant="outline" (pressed)="retryPagination()">Riprova</m-button>
          </div>
        } @else if (items.length && !done) {
          <m-button size="lg" variant="outline" [loading]="loading" (pressed)="loadMore()">Carica altre collezioni</m-button>
        } @else if (items.length && done) {
          <p class="m-list-end">Hai visualizzato tutte le collezioni{{ searchTerm() ? ' corrispondenti alla ricerca' : '' }}.</p>
        }
      </div>
    </section>
    <m-destructive-confirmation [open]="!!deletion()" title="Elimina collezione?" [subject]="deletion()?.name ?? ''"
      description="La collezione verrà eliminata insieme alle molecole presenti soltanto in questa collezione. Questa operazione non può essere annullata."
      [pending]="deletePending()" [error]="deleteError()" (cancelled)="cancelDeletion()" (confirmed)="confirmDeletion()" />
  `
})
export class MyMoleculeCollectionsPageComponent implements OnInit, OnDestroy {

  // ======================= DEPS =======================
  private readonly moleculeCollectionService = inject(MoleculeCollectionService)
  private readonly actionOverlayContext = inject(ActionOverlayContextService)
  private readonly createCtx = inject(CreateCollectionContextService)
  private readonly toast = inject(ToastService)
  private readonly historyContext = inject(HistoryContextService)
  private readonly scrollContext = inject(ScrollContextService)
  private readonly invalidations = inject(DomainInvalidationService)
  private readonly syncStatus = inject(RealtimeSyncStatusService)
  private readonly pagination = new PaginationController<UiMoleculeCollection>({
    fetch: (page, query) => this.moleculeCollectionService.getPaginatedCollections(page, 25, query).pipe(
      delay(page === 1 ? 120 : 0),
      map(result => ({ ...result, items: result.items.map(item => ({
        ...item,
        triggerDisappear: signal(false),
        collapse: signal(false)
      })) }))
    ),
    merge: (current, incoming) => {
      const seen = new Set<string>()
      return [...current, ...incoming].filter(item => {
        if (seen.has(item.id)) return false
        seen.add(item.id)
        return true
      })
    }
  })
  readonly searchInput = signal('')
  private queryTimer?: ReturnType<typeof setTimeout>
  private observer?: IntersectionObserver
  // ====================================================

  private delColSub?: Subscription
  private dupColSub?: Subscription

  protected readonly sentinel = viewChild<ElementRef<HTMLDivElement>>('sentinel')
  get items(): UiMoleculeCollection[] { return this.pagination.items() }
  get loading(): boolean { return this.pagination.loading() }
  get done(): boolean { return this.pagination.done() }
  get earlyDone(): boolean { return this.pagination.earlyDone() }
  get page(): number { return this.pagination.page() }
  get searchTerm(): ReturnType<typeof signal<string>> { return this.pagination.query }
  get empty(): ReturnType<typeof signal<boolean>> { return this.pagination.empty }
  paginationState() { return this.pagination.paginationState() }

  private tick = signal<number>(0)

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
      const event = this.invalidations.last()
      if (event?.domain !== 'molecule-collection' ||
          (event.action !== 'created' && event.action !== 'deleted')) {
        return
      }
      queueMicrotask(() => this.resetPagination())
    })

    effect(() => {
      const event = this.invalidations.last()
      if (event?.domain !== 'molecule-collection' || event.action !== 'molecules-added') {
        return
      }
      queueMicrotask(() => this.resetPagination())
    })

    effect(() => {
      const event = this.invalidations.last()
      const remoteCollectionChanged =
        event?.domain === 'molecule-collection' &&
        event.action === 'changed' &&
        event.remote === true
      const reconnect = event?.domain === 'realtime' && event.action === 'reconcile'
      if (!remoteCollectionChanged && !reconnect) return
      if (remoteCollectionChanged) this.syncStatus.markSynchronized()
      queueMicrotask(() => this.resetPagination())
    })

    effect(() => {
      const t = this.tick()
      if (t === 0) {
        return
      }
      queueMicrotask(() => this.resetPagination())
    })

  }


  ngOnInit(): void {
    void this.loadMore()
  }

  ngOnDestroy(): void {
    clearTimeout(this.queryTimer)
    this.observer?.disconnect()
    this.pagination.dispose()
    this.delColSub?.unsubscribe()
    this.dupColSub?.unsubscribe()
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



  createNewCollection(): void {
    this.actionOverlayContext.open('CreateCollection')
  }

  doDuplicateCollection(collectionId: string): void {
    this.dupColSub = this.moleculeCollectionService.duplicateCollection(collectionId).subscribe({
      next: () => {
        queueMicrotask(() => {
          this.scrollContext.smoothToTop()
          this.resetPagination()
        })
      },
      error: () => queueMicrotask(() => this.toast.trigger('Si è verificato un errore inaspettato. Se si ripete, contatta il supporto.', 'error'))
    })
  }

  readonly deletion = signal<{ id: string; name: string } | null>(null)
  readonly deletePending = signal(false)
  readonly deleteError = signal('')

  doDeleteCollection(collectionId: string): void {
    if (this.deletePending()) return
    const item = this.items.find(item => item.id === collectionId)
    if (!item) return
    this.deleteError.set('')
    this.deletion.set({ id: item.id, name: item.name })
  }

  cancelDeletion(): void {
    if (!this.deletePending()) this.deletion.set(null)
  }

  confirmDeletion(): void {
    const selection = this.deletion()
    if (!selection || this.deletePending()) return
    const id = selection.id
    this.deletePending.set(true)
    this.deleteError.set('')
    const onError = () => {
      this.deletePending.set(false)
      this.deleteError.set('Eliminazione non riuscita. Puoi riprovare o annullare.')
    }
    this.delColSub = this.moleculeCollectionService.deleteCollection(id).subscribe({
      next: ok => {
        if (!ok) { onError(); return }
        this.deletePending.set(false)
        this.deletion.set(null)
        this.historyContext.triggerRemoveItemFromHistoryView(id)
        const item = this.items.find(item => item.id === id)
        if (item) {
          item.triggerDisappear.set(true)
          setTimeout(() => item.collapse.set(true), 120)
          setTimeout(() => {
            this.pagination.replaceItems(this.items.filter(item => item.id !== id))
            if (!this.items.length) this.tick.update(value => value + 1)
          }, 500)
        }
        this.toast.trigger('Collezione eliminata.', 'success', 3000)
      },
      error: onError
    })
  }

  doAddMoleculesToCollection(collectionId: string): void {
    this.actionOverlayContext.open('AddMoleculesToCollection', { collectionId, redirectToCollectionPath: false, importFromChembl: false })
  }

}
