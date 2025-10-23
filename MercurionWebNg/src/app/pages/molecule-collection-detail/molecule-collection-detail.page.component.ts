import { AfterViewInit, Component, ElementRef, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { MoleculeCollectionService } from '../../services/graphql/molecule-collection.service';
import { catchError, debounce, debounceTime, distinctUntilChanged, filter, firstValueFrom, interval, map, Observable, of, Subscription, switchMap, tap } from 'rxjs';
import { MoleculeCardItemModel, MoleculeCollection } from '../../Models/graphql/molecule-collection/molecule-collection.types';
import { MyMoleculesHeadingComponent } from '../../components/molecule-detail/my-molecules-heading/my-molecules-heading.component';
import { ClassicSpinnerComponent } from '../../components/common/classic-spinner/classic-spinner.component';
import { MoleculeCollectionItemCardComponent } from '../../components/molecule-detail/molecule-collection-item-card/molecule-collection-item-card.component';
import { SkeletonMoleculeCardComponent } from '../../components/molecule-detail/skeleton-molecule-card/skeleton-molecule-card.component';
import { ActivatedRoute } from '@angular/router';
import { MoleculeCollectionItemService } from '../../services/graphql/molecule-collection-item.service';
import { LinkModel } from '../../Models/link.model';
import { HistoryContextService } from '../../services/context/history-context.service';
import { Helpers } from '../../helpers';
import { ToastService } from '../../services/toast.service';
import { PmSearchInputComponent } from '../../components/common/pm-search-input/pm-search-input.component';
import { AbstractPaginationComponent } from '../../abstract/abstract-pagination-component';




@Component({
  selector: 'app-molecule-collection-detail',
  imports: [
    MyMoleculesHeadingComponent,
    ClassicSpinnerComponent,
    MoleculeCollectionItemCardComponent,
    SkeletonMoleculeCardComponent,
    PmSearchInputComponent
  ],
  template: `

    <section class="max-w-5xl mx-auto p-0 xs:p-4 sm:p-6 md:p-8 space-y-12">
    <app-my-molecules-heading [breadcrumb]="breadcrumb" />
    <div class="flex flex-wrap justify-between items-center pb-8 pt-2 relative -top-14 gap-y-4">
      <h2 class="bg-slate-50 dark:bg-neutral-950 z-10 block sticky top-0 text-3xl md:text-4xl lg:text-[2.65rem] font-semibold tracking-wider text-center sm:text-left text-light-accent-primary dark:text-dark-accent-primary" style="margin-block-start: 0">
          {{name()}}
      </h2>
      <div class="flex items-center justify-end gap-3">
        <!-- Duplica -->
        <button
          (click)="doDuplicateCollection()"
          type="button"
          class="relative p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700
                 transition-colors duration-150"
          title="Crea una nuova collezione a partire da questa (Duplica)"
        >
          <svg
            class="size-7 text-slate-600 dark:text-slate-300"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              d="M4 4a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1h-1V4a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h1v1H6a2 2 0 0 1-2-2V4z"
            />
            <path
              d="M8 6a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2V6z"
            />
          </svg>
        </button>
        <!-- Elimina -->
        <button
          type="button"
          class="relative p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700
                 transition-colors duration-150"
          title="Elimina collezione"
          (click)="doDeleteCollection()"
        >
          <svg
            class="size-7 text-light-error dark:text-dark-error"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fill-rule="evenodd"
              d="M6 8a1 1 0 0 1 1 1v7h6V9a1 1 0 1 1 2 0v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a1 1 0 0 1 1-1zM4 5a1 1 0 0 1 1-1h2V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1h2a1 1 0 0 1 1 1v1H4V5z"
              clip-rule="evenodd"
            />
          </svg>
        </button>

          <!-- 🧩 Aggiungi ad una collezione -->
        <button
          type="button"
          class="flex items-center gap-2 relative px-3 py-1 rounded-md border border-slate-300 dark:border-slate-600
                 text-slate-600 dark:text-slate-300 text-xs font-medium
                 hover:bg-slate-200 dark:hover:bg-slate-700
                 transition-colors duration-150"
          title="Aggiungi nuove molecole alla collezione"
          (click)="doAddToCollection()"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-5 w-auto">
            <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
            <path d="M336 112L336 96L304 96L304 304L96 304L96 336L304 336L304 544L336 544L336 336L544 336L544 304L336 304L336 112z"/>
          </svg>
          <span>Aggiungi nuove molecole</span>
        </button>
      </div>
    </div>
      <pm-search-input
        [class.invisible]="empty() && earlyDone"
        [value]="searchTerm()"
        (valueChange)="doQuery($event)"
        (submitted)="doQuery($event)"
        (cleared)="doClear()"
      />
    <div class="mt-px relative -top-8">
      @for (item of items; track item; let i = $index) {
        <app-molecule-collection-item-card [molecule]="item" [i]="i" [collectionId]="colId()" (onDelete)="doDelete($event)" />
      }
    </div>
    <div #sentinel class="sentinel"></div>
    @if (loading) {
      @if (page > 1 && items.length > 2) {
        <div class="flex justify-center">
          <app-classic-spinner [size]="60" />
        </div>
      } @else {
        <div class="relative -top-8">
        @for (i of [0, 1, 2, 3, 4]; track i) {
            <app-skeleton-molecule-card />
          }
        </div>
      }
    } @else if (empty() && (earlyDone || done)) {
      <p class="relative -top-8 text-slate-700 dark:text-slate-200">Nessuna molecola in questa collezione.</p>
    }
  </section>

  `
})
export class MoleculeCollectionDetailPageComponent extends AbstractPaginationComponent<MoleculeCardItemModel> implements OnInit, OnDestroy, AfterViewInit {

  // ======================= DEPS =======================
  private readonly moleculeCollectionService = inject(MoleculeCollectionService)
  private readonly moleculeCollectionItemService = inject(MoleculeCollectionItemService)
  private readonly route = inject(ActivatedRoute)
  private readonly historyContext = inject(HistoryContextService)
  private readonly toast = inject(ToastService)
  // ====================================================

  @ViewChild('sentinel', { static: true })
  declare sentinel: ElementRef | undefined

  protected readonly breadcrumb: LinkModel[] = [
    {
      label: 'Collezioni Molecolari',
      path: '/molecules/collections'
    }
  ]

  private colIdSub?: Subscription
  private touchSub?: Subscription
  private delSub?: Subscription
  title = ''
  error = signal<boolean>(false)
  name = signal<string>('')
  colId = signal<string>('')

  protected override fetch$(page = this.page, size = 7): Observable<{
    items: MoleculeCardItemModel[];
    totalPages: number;
    totalItems: number;
    currentPage: number;
  }> {
    const id = this.colId();
    return this.moleculeCollectionItemService.getPaginatedItemsForCollection(id, page, size, this.searchTerm()).pipe(
      debounceTime(200),
      map(page => ({
        ...page,
        items: page.items.map(mol => Helpers.moleculeClientToCardAdapter(mol))
      }))
    );
  }

  ngOnInit(): void {
    this.touchSub = this.route.paramMap.pipe(
      map(pm => pm.get('colId') ?? ''),
      filter(id => id.length > 0),
      distinctUntilChanged(),
      switchMap(id => this.moleculeCollectionService.markMoleculeCollectionAsTouched(id)),
      switchMap(res => {
        if (res) {
          return this.historyContext.pollNewItem()
        }
        return of(null)
      })
    ).subscribe(() => {/* pass */ })
    this.colIdSub = this.route.paramMap.pipe(
      map(pm => pm.get('colId') ?? ''),
      filter(id => id.length > 0),
      distinctUntilChanged(),
      switchMap(id => this.moleculeCollectionService.getCollectionById(id)),
      tap(col => {
        if (!col) {
          this.error.set(true)
          return
        }
        this.colId.set(col.id)
      }),
      catchError(() => {
        this.error.set(true)
        return of(null)
      })
    ).subscribe(col => {
      if (!col) return;
      this.name.set(col.name)
      this.loadMore(col.id)
    });
  }

  ngAfterViewInit(): void {
    this.startObserver()
  }

  ngOnDestroy(): void {
    this.colIdSub?.unsubscribe()
    this.touchSub?.unsubscribe()
    this.delSub?.unsubscribe()
  }

  protected override async loadMore(_id?: string) {
    if (this.loading || this.done) return;

    const id = this.colId() ?? _id;
    if (!id) return; // ← guardia fondamentale

    this.loading = true;

    const newPage = await firstValueFrom(this.fetch$(this.page, 7));
    if (!newPage || newPage.items.length === 0) {
      this.done = true;
      if (this.page === 1) {
        this.earlyDone = true
      }
    } else {
      this.items = [...this.items, ...newPage.items];
      this.page++;
    }
    this.loading = false;
  }

  doDelete(id: string): void {
    this.delSub = this.moleculeCollectionItemService.deleteItem(id).subscribe({
      next: ok => {
        if (ok) {
          this.historyContext.triggerRemoveItemFromHistoryView(id)
          const i = this.items.findIndex(item => item.id === id)
          if (i !== -1) {
            this.items.splice(i, 1)
            if (!this.items.length) {
              this.empty.set(true)
            }
          }
        }
      },
      error: () => this.toast.trigger('Si è verificato un errore.', 'error', 2500)
    })
  }

  doDuplicateCollection(): void {

  }
  doDeleteCollection(): void {

  }
  doAddToCollection(): void {

  }


  protected override doQuery(q: string): void {
    this.query(q)
  }

  protected override doClear(): void {
    this.clear()
  }

}
