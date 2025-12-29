import { HistoryContextService } from './../../services/context/history-context.service';
import { UiMoleculeCollection } from '../../Models/graphql/molecule-collection/molecule-collection.types';
import { catchError, debounceTime, EMPTY, firstValueFrom, map, of, Subscription, switchMap, tap } from 'rxjs';
import { MyMoleculesHeadingComponent } from '../../components/molecule-detail/my-molecules-heading/my-molecules-heading.component';
import { AfterViewInit, Component, ElementRef, inject, OnInit, ViewChild, effect, OnDestroy, signal } from '@angular/core';
import { MoleculeCollectionService } from '../../services/graphql/molecule-collection.service';
import { CollectionCardComponent } from '../../components/molecule-detail/collection-card/collection-card.component';
import { ClassicSpinnerComponent } from '../../components/common/classic-spinner/classic-spinner.component';
import { SkeletonCollectionCardComponent } from '../../components/common/skeleton-card-loader/skeleton-card-loader.component';
import { RouterLink } from '@angular/router';
import { PmSearchInputComponent } from '../../components/common/pm-search-input/pm-search-input.component';
import { AbstractPaginationComponent } from '../../abstract/abstract-pagination-component';
import { Observable } from 'rxjs';
import { PageModel } from '../../Models/graphql/page.models';
import { ActionOverlayContextService } from '../../services/context/action-context/action-overlay-context.service';
import { CreateCollectionContextService } from '../../services/context/action-context/create-collection-context.service';
import { ToastService } from '../../services/toast.service';
import { AddMoleculesToCollectionContextService } from '../../services/context/action-context/add-molecules-to-collection-context.service';
import { AppContextService } from '../../services/context/app-context.service';


@Component({
  selector: 'm-my-molecule-collections',
  imports: [
    MyMoleculesHeadingComponent,
    CollectionCardComponent,
    ClassicSpinnerComponent,
    SkeletonCollectionCardComponent,
    RouterLink,
    PmSearchInputComponent
  ],
  template: `

  <section class="max-w-5xl mx-auto p-0 xs:p-4 sm:p-6 md:p-8 space-y-12">
    <m-my-molecules-heading />
    <div class="flex flex-wrap gap-y-4 justify-between items-center relative -top-12 pt-2 gap-x-4">
        <h2 class="h1 bg-slate-50 dark:bg-neutral-950 z-10 block sticky top-0 bottom-5" style="margin-block-start: 0; align-self: baseline;">
            Le mie collezioni molecolari
        </h2>

        <!-- 🧩 Crea una o più nuove collezioni -->
        <button
          type="button"
          class="flex items-center gap-2 relative px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-600
                 text-slate-600 dark:text-slate-300 text-xs font-medium
                 hover:bg-slate-200 dark:hover:bg-slate-700
                 transition-colors duration-150 self-start top-[7px]"
          title="Aggiungi nuove molecole"
          (click)="createNewCollection()"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-4 w-auto">
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
      <p class="mt-5 text-slate-700 dark:text-slate-200">Nessuna collezione molecolare.</p>
    } @else {
      <div class="flex gap-2 items-center flex-wrap relative -top-6">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current w-8 h-auto relative -top-2">
          <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
          <path d="M296.5 153.7C268.2 123 314.7 79.6 343.4 110.1C395.3 166.7 479.5 256.1 528.4 302C544.6 317.7 544.4 343.6 528.4 359.3C517.9 369.6 499.6 387.7 494.2 394.1C448.6 448.2 388.1 485.8 344.3 536.7C332.8 550.1 312.6 551.7 299.2 540.3C257.6 499.5 349.3 448.3 372.4 421.9C398.9 399.3 423.7 378 444.4 353.8C432 353.5 419.6 353.7 406.7 354C325.8 354.2 244.1 356.1 162.3 355.5C136.2 356.8 94.8 360.6 96 321.8C97.9 289.9 132.6 290.7 157.9 291.6C239.4 292.1 320.7 290.4 403.1 290.1C410 289.9 417.2 289.8 424.8 289.7C376.2 241.2 341.3 201.2 296.4 153.7z"/>
        </svg>
        <a class="a relative -top-2" routerLink="/molecules/all-my-molecules">Mostra tutte le mie molecole in un unico raggruppamento</a>
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
    @if (loading) {
      @if (page > 1) {
        <div class="flex justify-center">
          <m-classic-spinner [size]="60" />
        </div>
      } @else {
        <div class="relative -top-16">
          @for (i of [0, 1, 2, 3, 4]; track i) {
            <m-skeleton-collection-card />
          }
        </div>
      }
    }
  </section>

  `
})
export class MyMoleculeCollectionsPageComponent extends AbstractPaginationComponent<UiMoleculeCollection> implements OnInit, AfterViewInit, OnDestroy {

  // ======================= DEPS =======================
  private readonly moleculeCollectionService = inject(MoleculeCollectionService)
  private readonly actionOverlayContext = inject(ActionOverlayContextService)
  private readonly createCtx = inject(CreateCollectionContextService)
  private readonly addCtx = inject(AddMoleculesToCollectionContextService)
  private readonly toast = inject(ToastService)
  private readonly historyContext = inject(HistoryContextService)
  private readonly appContext = inject(AppContextService)
  // ====================================================

  private delColSub?: Subscription
  private dupColSub?: Subscription

  @ViewChild('sentinel', { static: true })
  declare sentinel: ElementRef<HTMLDivElement> | undefined

  private tick = signal<number>(0)

  constructor() {

    super();

    effect(() => {
      const t = this.createCtx.addedTick()
      if (t === 0) {
        return
      }
      queueMicrotask(() => this.resetPagination())
    });

    effect(() => {
      const t = this.addCtx.addedTick()
      if (t === 0) {
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

    // Fallback: if the CreateCollection overlay just closed and a tick occurred, refresh
    effect(() => {
      const scope = this.actionOverlayContext.scope();
      const visible = this.actionOverlayContext.isVisible();
      const t = this.createCtx.addedTick();
      if (scope === 'CreateCollection' && !visible && t > 0) {
        this.resetPagination();
      }
    })
  }


  ngOnInit(): void {
    this.loadMore()
  }

  ngAfterViewInit(): void {
    this.startObserver()
  }

  ngOnDestroy(): void {
    this.delColSub?.unsubscribe()
    this.dupColSub?.unsubscribe()
  }

  protected override async loadMore(): Promise<void> {
    if (this.loading || this.done) return

    this.loading = true

    const newPage = await firstValueFrom(this.fetch$())

    if (newPage.items.length === 0) {
      this.done = true
      if (this.page === 1) this.earlyDone = true
    } else {
      if (this.empty()) this.empty.set(false)

      this.items = [...this.items, ...newPage.items]

      const seen = new Set<string>()
      this.items = this.items.filter(item => {
        const id = (item as any)?.id as string | undefined
        if (!id) return true
        if (seen.has(id)) return false
        seen.add(id)
        return true
      })

      this.page++
    }

    this.loading = false
  }



  createNewCollection(): void {
    this.actionOverlayContext.open('CreateCollection')
  }

  protected fetch$(): Observable<PageModel<UiMoleculeCollection>> {
    return this.moleculeCollectionService.getPaginatedCollections(this.page, 10, this.searchTerm())
      .pipe(
        debounceTime(20),
        map(page => ({
          ...page,
          items: page.items.map(item => ({
            ...item,
            triggerDisappear: signal<boolean>(false),
            collapse: signal<boolean>(false)
          }))
        }))
      )
  }

  protected override doQuery(q: string): void {
    this.query(q)
  }

  protected override doClear(): void {
    this.clear()
  }

  doDuplicateCollection(collectionId: string): void {
    this.dupColSub = this.moleculeCollectionService.duplicateCollection(collectionId).subscribe({
      next: () => {
        queueMicrotask(() => {
          this.appContext.smoothToTop()
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
              setTimeout(() => this.items[i].collapse.set(true), 120)
              setTimeout(() => {
                this.items.splice(i, 1)
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
    this.addCtx.setCollectionId(collectionId)
    this.actionOverlayContext.open('AddMoleculesToCollection')
  }

}
