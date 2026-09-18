import { HistoryContextService } from './../../services/context/history-context.service';
import { UiMoleculeCollection } from '../../Models/graphql/molecule-collection/molecule-collection.types';
import { catchError, delay, EMPTY, firstValueFrom, map, of, Subscription, switchMap, tap } from 'rxjs';
import { MyMoleculesHeadingComponent } from '../../components/molecule-detail/my-molecules-heading/my-molecules-heading.component';
import { AfterViewInit, Component, ElementRef, inject, OnInit, effect, OnDestroy, signal, ChangeDetectionStrategy, viewChild } from '@angular/core';
import { MoleculeCollectionService } from '../../services/graphql/molecule-collection.service';
import { CollectionCardComponent } from '../../components/molecule-detail/collection-card/collection-card.component';
import { SkeletonCollectionCardComponent } from '../../components/common/skeleton-card-loader/skeleton-card-loader.component';
import { RouterLink } from '@angular/router';
import { PmSearchInputComponent } from '../../components/common/pm-search-input/pm-search-input.component';
import { PaginationController } from '../../services/pagination/pagination-controller';
import { Observable } from 'rxjs';
import { PageModel } from '../../Models/graphql/page.models';
import { ActionOverlayContextService } from '../../services/context/action-context/action-overlay-context.service';
import { CreateCollectionContextService } from '../../services/context/action-context/create-collection-context.service';
import { ToastService } from '../../services/toast.service';
import { ScrollContextService } from '../../services/context/scroll-context.service';
import { DomainInvalidationService } from '../../services/domain-invalidation.service';
import { PaginationComponent } from '../../components/common/pagination/pagination.component';


@Component({
  selector: 'm-my-molecule-collections',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MyMoleculesHeadingComponent,
    CollectionCardComponent,
    SkeletonCollectionCardComponent,
    RouterLink,
    PmSearchInputComponent,
    PaginationComponent
  ],
  template: `

  <main class="max-w-5xl mx-auto p-0 xs:p-4 sm:p-6 md:p-8 space-y-12" role="main" [attr.aria-busy]="loading" aria-live="polite">
    <m-my-molecules-heading />
    <div class="flex flex-col sm:flex-row sm:flex-wrap gap-y-3 sm:gap-y-3 sm:gap-x-4 justify-between items-start sm:items-center relative -top-12 pt-2">
        <h2 class="h1 bg-slate-50 dark:bg-neutral-950 z-10 block sticky top-0 bottom-5" style="margin-block-start: 0; align-self: baseline;">
            Le mie collezioni molecolari
        </h2>

        <!-- 🧩 Crea una o più nuove collezioni -->
        <button
          type="button"
          class="flex items-center gap-2 relative px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-600
                 text-slate-700 dark:text-slate-200 text-xs font-medium
                 hover:bg-slate-200 dark:hover:bg-slate-700
                 transition-colors duration-150 self-start top-[7px]"
          title="Crea nuove collezioni."
          (click)="createNewCollection()"
          aria-label="Crea una o più nuove collezioni"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-4 w-auto" aria-hidden="true">
            <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
            <path d="M336 112L336 96L304 96L304 304L96 304L96 336L304 336L304 544L336 544L336 336L544 336L544 304L336 304L336 112z"/>
          </svg>
          <span>Crea una o più nuove collezioni</span>
        </button>

    </div>
    <m-search-input
      class="block relative"
      [placeholder]="'Cerca collezione...'"
      [value]="searchTerm()"
      (valueChange)="doQuery($event)"
      (submitted)="doQuery($event)"
      (cleared)="doClear()"
    />
    @if (empty() && (earlyDone || done)) {
      <p class="mt-5 text-slate-700 dark:text-slate-200" role="status" aria-live="polite">Nessuna collezione molecolare.</p>
    } @else {
      <div class="flex gap-2 items-center relative -top-6">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current w-8 h-auto relative -top-2 srink-[0.65]" aria-hidden="true">
          <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
          <path d="M296.5 153.7C268.2 123 314.7 79.6 343.4 110.1C395.3 166.7 479.5 256.1 528.4 302C544.6 317.7 544.4 343.6 528.4 359.3C517.9 369.6 499.6 387.7 494.2 394.1C448.6 448.2 388.1 485.8 344.3 536.7C332.8 550.1 312.6 551.7 299.2 540.3C257.6 499.5 349.3 448.3 372.4 421.9C398.9 399.3 423.7 378 444.4 353.8C432 353.5 419.6 353.7 406.7 354C325.8 354.2 244.1 356.1 162.3 355.5C136.2 356.8 94.8 360.6 96 321.8C97.9 289.9 132.6 290.7 157.9 291.6C239.4 292.1 320.7 290.4 403.1 290.1C410 289.9 417.2 289.8 424.8 289.7C376.2 241.2 341.3 201.2 296.4 153.7z"/>
        </svg>
        <a class="a relative -top-2 text-light-accent-primary-hc dark:text-dark-accent-primary-btn-hc" routerLink="/molecules/all-my-molecules">Mostra tutte le mie molecole in un unico raggruppamento</a>
      </div>
    }
    <div class="mt-px relative -top-16">
      @for (item of items; track item.id; let i = $index) {
        <m-collection-card
          [collection]="item"
          [i]="i"
          [triggerDisappear]="item.triggerDisappear()"
          [collapse]="item.collapse()"
          (onDuplicate)="doDuplicateCollection($event)"
          (onDelete)="doDeleteCollection($event)"
          (onAddMolecules)="doAddMoleculesToCollection($event)"  />
      }
    </div>
    <div #sentinel class="sentinel"></div>
    @if (loading && page === 1) {
        <div class="relative -top-16">
          @for (i of [0, 1, 2, 3, 4]; track i) {
            <m-skeleton-collection-card />
          }
        </div>
    }
    <m-pagination
      [state]="paginationState()"
      (loadMoreRequested)="loadMore()"
      (retry)="retryPagination()" />
  </main>

  `
})
export class MyMoleculeCollectionsPageComponent implements OnInit, AfterViewInit, OnDestroy {

  // ======================= DEPS =======================
  private readonly moleculeCollectionService = inject(MoleculeCollectionService)
  private readonly actionOverlayContext = inject(ActionOverlayContextService)
  private readonly createCtx = inject(CreateCollectionContextService)
  private readonly toast = inject(ToastService)
  private readonly historyContext = inject(HistoryContextService)
  private readonly scrollContext = inject(ScrollContextService)
  private readonly invalidations = inject(DomainInvalidationService)
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
  private observer?: IntersectionObserver
  // ====================================================

  private delColSub?: Subscription
  private dupColSub?: Subscription

  protected readonly sentinel = viewChild<ElementRef<HTMLDivElement>>('sentinel');
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
      const event = this.invalidations.last()
      if (event?.domain !== 'molecule-collection' ||
          (event.action !== 'created' && event.action !== 'deleted')) {
        return
      }
      queueMicrotask(() => this.resetPagination())
    });

    effect(() => {
      const event = this.invalidations.last()
      if (event?.domain !== 'molecule-collection' || event.action !== 'molecules-added') {
        return
      }
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

  ngAfterViewInit(): void {
    this.startObserver()
  }

  ngOnDestroy(): void {
    this.observer?.disconnect()
    this.pagination.dispose()
    this.delColSub?.unsubscribe()
    this.dupColSub?.unsubscribe()
  }

  loadMore(): Promise<void> { return this.pagination.loadMore() }
  retryPagination(): void { this.pagination.retry() }
  resetPagination(): void { this.pagination.reset() }
  doQuery(q: string): void { this.pagination.setQuery(q) }
  doClear(): void { this.pagination.clear() }

  private startObserver(): void {
    const sentinel = this.sentinel()?.nativeElement
    if (!sentinel) return
    this.observer?.disconnect()
    this.observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting) void this.loadMore()
    }, { rootMargin: '0px 0px 500px 0px' })
    this.observer.observe(sentinel)
  }



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

  doDeleteCollection(collectionId: string): void {
    const onError = () => queueMicrotask(() => this.toast.trigger('Si è verificato un errore.', 'error', 3000))
    this.delColSub = this.moleculeCollectionService.deleteCollection(collectionId).pipe(
      switchMap(ok => {
        if (!ok) {
          onError()
          return of(ok)
        }
        return of(true)
      }),
      catchError(() => {
        onError()
        return EMPTY
      }),
      tap((ok) => {
        if (ok) {
          const i = this.items.findIndex(col => col.id === collectionId)
          if (i !== -1) {
            queueMicrotask(() => {
              this.historyContext.triggerRemoveItemFromHistoryView(collectionId)
              this.items[i].triggerDisappear.set(true)
              setTimeout(() => this.items[i]?.collapse.set(true), 120)
              setTimeout(() => {
                this.pagination.replaceItems(this.items.filter(item => item.id !== collectionId))
                if (this.items.length === 0) {
                  this.tick.update(x => x + 1)
                }
              }, 500)
            })
          }

        }
      })
    ).subscribe(() => { /* pass */ })
  }

  doAddMoleculesToCollection(collectionId: string): void {
    this.actionOverlayContext.open('AddMoleculesToCollection', { collectionId, redirectToCollectionPath: false, importFromChembl: false })
  }

}
