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
import { PmSearchInputComponent } from '../../components/common/pm-search-input/pm-search-input.component';
import { ActionOverlayContextService } from '../../services/context/action-context/action-overlay-context.service';
import { DomainInvalidationService } from '../../services/domain-invalidation.service';
import { PaginationComponent } from '../../components/common/pagination/pagination.component';
import { ScrollContextService } from '../../services/context/scroll-context.service';

@Component({
  selector: 'm-all-my-molecules.page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MoleculeCollectionItemCardComponent,
    SkeletonMoleculeCardComponent,
    MyMoleculesHeadingComponent,
    RouterLink,
    PmSearchInputComponent,
    PaginationComponent
  ],
  template: `

    <section class="max-w-5xl mx-auto p-0 xs:p-4 sm:p-6 md:p-8 space-y-12" role="main" aria-labelledby="all-my-molecules-heading">
      <m-my-molecules-heading />
      <div class="flex flex-col sm:flex-row sm:flex-wrap gap-y-3 sm:gap-y-4 justify-between items-start sm:items-center relative -top-12 pt-2">
        <h2 id="all-my-molecules-heading" class="h1 bg-slate-50 dark:bg-neutral-950 z-10 block sticky top-0 bottom-5" style="margin-block-start: 0">
            Tutte le mie molecole
        </h2>
        <div class="flex items-center gap-3 w-full sm:w-auto">
          <!-- 🧩 Aggiungi nuove molecole -->
          <button
            type="button"
            class="flex items-center gap-2 relative -top-2 px-3 py-1 rounded-md border border-slate-400 dark:border-slate-500
                   text-slate-700 dark:text-slate-200 text-xs font-medium
                   hover:bg-slate-200 dark:hover:bg-slate-700
                   transition-colors duration-150"
            title="Aggiungi nuove molecole alla collezione"
            (click)="doAddMolecules()"
            aria-label="Aggiungi nuove molecole alla collezione"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-5 w-auto">
              <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
              <path d="M336 112L336 96L304 96L304 304L96 304L96 336L304 336L304 544L336 544L336 336L544 336L544 304L336 304L336 112z"/>
            </svg>
            <span>Aggiungi nuove molecole</span>
          </button>
        </div>
      </div>
      <m-search-input
        class="block relative"
        [value]="searchTerm()"
        (valueChange)="doQuery($event)"
        (submitted)="doQuery($event)"
        (cleared)="doClear()"
      />
      <div class="flex gap-2 items-center relative -top-6">
        <a class="a relative z-20 -top-2 inline-flex items-center gap-2" routerLink="/molecules/collections">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current w-8 h-auto shrink-[0.65]" aria-hidden="true">
            <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
            <path d="M296.5 153.7C268.2 123 314.7 79.6 343.4 110.1C395.3 166.7 479.5 256.1 528.4 302C544.6 317.7 544.4 343.6 528.4 359.3C517.9 369.6 499.6 387.7 494.2 394.1C448.6 448.2 388.1 485.8 344.3 536.7C332.8 550.1 312.6 551.7 299.2 540.3C257.6 499.5 349.3 448.3 372.4 421.9C398.9 399.3 423.7 378 444.4 353.8C432 353.5 419.6 353.7 406.7 354C325.8 354.2 244.1 356.1 162.3 355.5C136.2 356.8 94.8 360.6 96 321.8C97.9 289.9 132.6 290.7 157.9 291.6C239.4 292.1 320.7 290.4 403.1 290.1C410 289.9 417.2 289.8 424.8 289.7C376.2 241.2 341.3 201.2 296.4 153.7z"/>
          </svg>
          <span>Mostra tutte le mie collezioni molecolari</span>
        </a>
        </div>
      <div class="mt-px relative -top-16">
        @for (item of items; track item.id; let i = $index) {
          <m-molecule-collection-item-card
            [molecule]="item"
            [i]="i"
            [triggerDisappear]="item.triggerDisappear()"
            [collapse]="item.collapse()"
            (onDelete)="doDelete($event)" />
        }
      </div>
      <div #sentinel class="sentinel"></div>
      @if (loading && page === 1) {
          <div class="relative -top-16">
            @for (i of [0, 1, 2, 3, 4]; track i) {
              <m-skeleton-molecule-card />
            }
          </div>
      }
      <m-pagination
        [state]="paginationState()"
        (loadMoreRequested)="loadMore()"
        (retry)="retryPagination()" />
      @if (empty() && (earlyDone || done)) {
        <p class="relative -top-8 text-slate-700 dark:text-slate-200">Nessuna molecola.</p>
      }
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
  private readonly scrollContext = inject(ScrollContextService)
  private readonly pagination = new PaginationController<MoleculeCardItemModel>({
    fetch: (page, query) => this.moleculeCollectionItemService.getAllPaginatedItems(page, 25, query).pipe(
      delay(page === 1 ? 120 : 0),
      map(result => ({ ...result, items: result.items.map(mol => Helpers.moleculeClientToCardConverter(mol)) }))
    )
  })
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
      const root = this.scrollContext.scrollRootRef()?.nativeElement ?? null
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
  }


  ngOnInit(): void {
    queueMicrotask(() => void this.loadMore())
  }

  ngOnDestroy(): void {
    this.observer?.disconnect()
    this.pagination.dispose()
    this.delSub?.unsubscribe()
  }

  loadMore(): Promise<void> { return this.pagination.loadMore() }
  retryPagination(): void { this.pagination.retry() }
  resetPagination(): void { this.pagination.reset() }
  doQuery(q: string): void { this.pagination.setQuery(q) }
  doClear(): void { this.pagination.clear() }

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
