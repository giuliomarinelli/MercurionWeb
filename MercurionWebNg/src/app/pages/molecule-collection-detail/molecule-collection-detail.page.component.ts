import { PageModel } from '../../Models/graphql/page.models';
import { CustomDetailsComponent } from '../../components/molecule-detail/my-molecule-custom-details/custom-details.component';
import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild,
  inject,
  signal,
  effect,
  OnInit,
  OnDestroy,
  NgZone
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  firstValueFrom,
  map,
  of,
  Subscription,
  switchMap,
  tap,
  throttleTime,
  fromEvent,
  EMPTY,
  throwError,
  mergeMap
} from 'rxjs';

import { AbstractPaginationComponent } from '../../abstract/abstract-pagination-component';

import { MoleculeCollectionService } from '../../services/graphql/molecule-collection.service';
import { MoleculeCollectionItemService } from '../../services/graphql/molecule-collection-item.service';
import { HistoryContextService } from '../../services/context/history-context.service';
import { ToastService } from '../../services/toast.service';
import { ActionOverlayContextService } from '../../services/context/action-context/action-overlay-context.service';
import { Helpers } from '../../helpers';
import { LinkModel } from '../../Models/link.model';
import { MoleculeCardItemModel } from '../../Models/graphql/molecule-collection/molecule-collection.types';
import { MyMoleculesHeadingComponent } from '../../components/molecule-detail/my-molecules-heading/my-molecules-heading.component';
import { ClassicSpinnerComponent } from '../../components/common/classic-spinner/classic-spinner.component';
import { MoleculeCollectionItemCardComponent } from '../../components/molecule-detail/molecule-collection-item-card/molecule-collection-item-card.component';
import { SkeletonMoleculeCardComponent } from '../../components/molecule-detail/skeleton-molecule-card/skeleton-molecule-card.component';
import { PmSearchInputComponent } from '../../components/common/pm-search-input/pm-search-input.component';
import { CustomDetailSaveModel } from '../../Models/custom-detail-save.model';
import { Observable } from 'rxjs';
import { AddMoleculesToCollectionContextService } from '../../services/context/action-context/add-molecules-to-collection-context.service';
import { AppTitleService } from '../../services/app-title.service';

@Component({
  selector: 'm-molecule-collection-detail',
  imports: [
    MyMoleculesHeadingComponent,
    ClassicSpinnerComponent,
    MoleculeCollectionItemCardComponent,
    SkeletonMoleculeCardComponent,
    PmSearchInputComponent,
    CustomDetailsComponent
  ],
  template: `
  <main class="max-w-5xl mx-auto p-0 xs:p-4 sm:p-6 md:p-8 space-y-12" role="main" [attr.aria-busy]="loading" aria-live="polite">
    <m-my-molecules-heading [breadcrumb]="breadcrumb" />

    <div class="flex flex-col sm:flex-row sm:flex-wrap justify-between items-start sm:items-center pb-8 pt-2 relative -top-14 gap-y-4 sm:gap-y-2 sm:gap-x-4">

      <m-custom-details
        [itemId]="colId()!"
        [type]="'name'"
        [value]="name()"
        [badgeName]="''"
        [triggerRollback]="triggerRenameRollback()"
        (onSaving)="doRenameCollection($event)"
        (onDoingRollback)="triggerRenameRollback.set(false)"
      />

      <div class="flex flex-wrap items-center justify-start sm:justify-end gap-3 w-full sm:w-auto">
        <button
          (click)="doDuplicateCollection(colId())"
          type="button"
          class="relative p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-150"
          title="Crea una nuova collezione a partire da questa (Duplica)"
          aria-label="Duplica collezione"
        >
          <svg class="size-7 text-slate-700 dark:text-slate-200" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M4 4a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1h-1V4a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h1v1H6a2 2 0 0 1-2-2V4z"/>
            <path d="M8 6a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2V6z"/>
          </svg>
        </button>

        <button
          type="button"
          class="relative p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-150"
          title="Elimina collezione"
          (click)="doDeleteCollection()"
          aria-label="Elimina collezione"
        >
          <svg class="size-7 text-light-error dark:text-dark-error" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M6 8a1 1 0 0 1 1 1v7h6V9a1 1 0 1 1 2 0v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a1 1 0 0 1 1-1zM4 5a1 1 0 0 1 1-1h2V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1h2a1 1 0 0 1 1 1v1H4V5z" clip-rule="evenodd"/>
          </svg>
        </button>

        <button
          type="button"
          class="flex items-center gap-2 relative px-3 py-1 rounded-md border border-slate-300 dark:border-slate-600
                 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-150"
          title="Aggiungi nuove molecole alla collezione"
          (click)="doAddToCollection()"
          aria-label="Aggiungi nuove molecole alla collezione"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-5 w-auto" aria-hidden="true">
            <path d="M336 112L336 96L304 96L304 304L96 304L96 336L304 336L304 544L336 544L336 336L544 336L544 304L336 304L336 112z"/>
          </svg>
          <span>Aggiungi nuove molecole</span>
        </button>
      </div>
    </div>

    <m-search-input
      [value]="searchTerm()"
      (valueChange)="doQuery($event)"
      (submitted)="doQuery($event)"
      (cleared)="doClear()" />

    <div class="mt-px relative -top-8">
      @for (item of items; track item.id; let i = $index) {
        <m-molecule-collection-item-card
          [molecule]="item"
          [i]="i"
          [collectionId]="colId()"
          [triggerDisappear]="item.triggerDisappear()"
          [collapse]="item.collapse()"
          (onDelete)="doDelete($event)"

          (onRemoveFromCollection)="doRemoveMoleculeFromCollection($event)"/>
      }
    </div>

    <!-- Sentinel con altezza > 0 -->
    <div #sentinel class="h-px w-full"></div>

    @if (loading) {
      @if (page > 1 && items.length > 2) {
        <div class="flex justify-center" role="status" aria-live="polite">
          <m-classic-spinner [size]="60" />
        </div>
      } @else {
        <div class="relative -top-20">
          @for (i of [0,1,2,3,4]; track i) {
            <m-skeleton-molecule-card />
          }
        </div>
      }
    } @else if (empty() && (earlyDone)) {
      <p class="relative -top-8 text-slate-700 dark:text-slate-200" role="status" aria-live="polite">
        Nessuna molecola in questa collezione.
      </p>
    }
  </main>
  `
})
export class MoleculeCollectionDetailPageComponent extends AbstractPaginationComponent<MoleculeCardItemModel>
  implements OnInit, OnDestroy, AfterViewInit {

  private readonly colService = inject(MoleculeCollectionService)
  private readonly itemService = inject(MoleculeCollectionItemService)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly history = inject(HistoryContextService)
  private readonly toast = inject(ToastService)
  private readonly overlay = inject(ActionOverlayContextService)
  protected readonly addCtx = inject(AddMoleculesToCollectionContextService)
  private readonly zone = inject(NgZone)
  private readonly historyContext = inject(HistoryContextService)
  private readonly appTitle = inject(AppTitleService)

  @ViewChild('sentinel', { static: true })
  protected declare sentinel: ElementRef | undefined;

  private scrollFallbackSub?: Subscription;
  private colIdSub?: Subscription;
  private touchSub?: Subscription;
  private delSub?: Subscription;
  private reSub?: Subscription;
  private reFrCoSub?: Subscription
  private delColSub?: Subscription
  private dupColSub?: Subscription

  error = signal<boolean>(false)
  name = signal<string>('')
  colId = signal<string>('')
  triggerRenameRollback = signal<boolean>(false)
  private tick = signal<number>(0)

  protected readonly breadcrumb: LinkModel[] = [
    { label: 'Collezioni Molecolari', path: '/molecules/collections' }
  ];

  constructor() {
    super()
    effect(() => {
      const t = this.addCtx.addedTick()
      if (t === 0) {
        return
      }
      this.resetAndRefetch()
    })
    effect(() => {
      const t = this.tick()
      if (t === 0) {
        return
      }
      this.resetAndRefetch()
    })
  }

  // ========= data fetch =========
  protected override fetch$(
    page: number = this.page,
    size: number = 20,
    q?: string,
    excludeJoinedToCollection?: boolean,
    collectionId?: boolean
  ): Observable<PageModel<MoleculeCardItemModel>> {
    const id = this.colId();
    return this.itemService
      .getPaginatedItemsForCollection(id, page, size, this.searchTerm())
      .pipe(
        debounceTime(20),
        map(p => ({
          ...p,
          items: p.items.map(mol => Helpers.moleculeClientToCardConverter(mol))
        }))
      )
  }

  // ========= lifecycle =========
  ngOnInit(): void {
    // tocca la collection su cambio id
    this.touchSub = this.route.paramMap.pipe(
      map(pm => pm.get('colId') ?? ''),
      filter(Boolean),
      distinctUntilChanged(),
      switchMap(id => this.colService.markMoleculeCollectionAsTouched(id)),
      switchMap(res => res ? this.history.pollNewItem() : of(null))
    ).subscribe((res) => {
      if (res == null) {
        this.router.navigateByUrl('/404-not-found')
      }
    })

    // cambia collezione ⇒ reset + prima pagina + observer
    this.colIdSub = this.route.paramMap.pipe(
      map(pm => pm.get('colId') ?? ''),
      filter(Boolean),
      distinctUntilChanged(),
      switchMap((id) => this.colService.getCollectionById(id)),
      tap((col) => {
        if (!col) {
          this.error.set(true)
        }
        else {
          this.colId.set(col.id)
          this.appTitle.setSection('Dettaglio Collezione', col.name)
        }
      }),
      catchError(() => { this.error.set(true); return of(null); })
    ).subscribe(async col => {
      if (!col) return;
      this.name.set(col.name);
      await this.resetAndRefetch();
    })
  }

  ngAfterViewInit(): void {
    this.startObserver();  // IO
    this.startScrollFallback(); // fallback opzionale
  }

  ngOnDestroy(): void {
    this.colIdSub?.unsubscribe()
    this.touchSub?.unsubscribe()
    this.delSub?.unsubscribe()
    this.scrollFallbackSub?.unsubscribe()
    this.reSub?.unsubscribe()
    this.reFrCoSub?.unsubscribe()
    this.delColSub?.unsubscribe()
    this.dupColSub?.unsubscribe()
    this.observer?.disconnect()
  }

  // ========= paging =========
  protected override async loadMore(_id?: string) {
    if (this.loading || this.done) return;

    const id = this.colId() || _id;
    if (!id) return;

    this.loading = true;
    try {
      const newPage = await firstValueFrom(
        this.fetch$(this.page, 25).pipe(
          catchError(() => of({
            items: [],
            totalPages: 0,
            totalItems: 0,
            currentPage: this.page
          }))
        )
      );

      if (!newPage || newPage.items.length === 0) {
        this.done = true;
        if (this.page === 1) this.earlyDone = true;
      } else {
        this.items = [...this.items, ...newPage.items];
        this.page++;
      }
    } finally {
      this.loading = false;
    }
  }

  protected override startObserver(bottomPx: number = 600) {
    // disconnetti eventuale vecchio observer
    this.observer?.disconnect();

    // crea IO fuori da Angular per non scatenare CD continuo
    this.zone.runOutsideAngular(() => {
      this.observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry && entry.isIntersecting) {
            // rientro in Angular solo per la fetch
            this.zone.run(() => this.loadMore());
          }
        },
        { root: null, rootMargin: `0px 0px ${bottomPx}px 0px`, threshold: 0.01 }
      );

      if (this.sentinel?.nativeElement) {
        this.observer.observe(this.sentinel.nativeElement);
      }
    });
  }

  private startScrollFallback() {
    // opzionale: alcuni UA bizzarri non sempre chiamano IO. Facciamo un guard-rail.
    this.scrollFallbackSub?.unsubscribe();
    this.scrollFallbackSub = fromEvent(window, 'scroll').pipe(
      throttleTime(200)
    ).subscribe(() => {
      if (this.loading || this.done) return;
      const nearBottom = (window.innerHeight + window.scrollY) >= (document.body.offsetHeight - 800);
      if (nearBottom) this.loadMore();
    });
  }

  private async resetAndRefetch() {
    // reset state
    this.items = [];
    this.page = 1;
    this.done = false;
    this.earlyDone = false;
    this.empty.set(true);

    // prima pagina
    await this.loadMore();

    // re-attach observer (idempotente)
    this.startObserver();
  }

  // ========= actions =========
  doDelete(id: string): void {
    this.delSub = this.itemService.deleteItem(id).subscribe({
      next: ok => {
        if (!ok) return;
        const i = this.items.findIndex(item => item.id === id)
        if (i !== -1) {
          queueMicrotask(() => {
            this.history.triggerRemoveItemFromHistoryView(id)
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
      },
      error: () => this.toast.trigger('Si è verificato un errore.', 'error', 2500)
    });
  }

  doDuplicateCollection(collectionId: string): void {
    this.dupColSub = this.colService.duplicateCollection(collectionId).subscribe({
      next: (res) => {
        queueMicrotask(() => {
          this.router.navigateByUrl('molecules/collections')
          this.toast.trigger(`Collezione duplicata con successo. Nuova collezione: '${res.name}'`, 'success')
        })
      },
      error: () => queueMicrotask(() => this.toast.trigger('Si è verificato un errore inaspettato. Se si ripete, contatta il supporto.', 'error'))
    })
  }


  doDeleteCollection(): void {
    const onError = () => queueMicrotask(() => this.toast.trigger('Si è verificato un errore.', 'error', 3000))
    this.delColSub = this.colService.deleteCollection(this.colId()).pipe(
      switchMap(ok => {
        if (ok) {
          queueMicrotask(() => {
            this.toast.trigger('Collezione eliminata con successo.', 'success', 3000)
            this.router.navigateByUrl('/molecules/collections')
          })
          return of(ok)
        }
        return of(false)
      }),
      catchError(() => {
        onError()
        return EMPTY
      }),
      mergeMap(ok => {
        if (!ok) {
          onError()
        }
        return !ok ? EMPTY : of(ok)
      }),
      tap(() => this.historyContext.triggerRemoveItemFromHistoryView(this.colId()))
    ).subscribe(() => { /* pass */ })
  }

  doRenameCollection(e: CustomDetailSaveModel): void {
    const { value: name } = e
    this.reSub = this.colService.updateCollectionName(this.colId(), name).pipe(
      switchMap(() => this.historyContext.pollNewItem()),
      catchError(e => {
        if (e.message === `duplicate key value violates unique constraint "unique_name_per_user"`) {
          queueMicrotask(() => {
            this.triggerRenameRollback.set(true)
            this.toast.trigger('Questo nome esiiste già. Impossibile rinominare!', 'error', 3000)
          })
          return EMPTY;
        }
        return throwError(() => e)
      }),
    ).subscribe();

  }

  doAddToCollection(): void {
    queueMicrotask(() => {
      this.addCtx.setCollectionId(this.colId());
      this.overlay.open('AddMoleculesToCollection');
    });
  }

  doRemoveMoleculeFromCollection(moleculeId: string): void {
    const onError = () => queueMicrotask(() => this.toast.trigger('Si è verificato un errore', 'error', 3000))
    this.reFrCoSub = this.itemService.removeMoleculeFromCollection(this.colId(), moleculeId).subscribe({
      next: ok => {
        if (ok) {
          const i = this.items.findIndex(item => item.id === moleculeId)
          if (i !== -1) {
            queueMicrotask(() => {
              this.history.triggerRemoveItemFromHistoryView(moleculeId)
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
        } else {
          onError()
        }
      },
      error: () => onError()
    })
  }

  // ========= search =========
  protected override doQuery(q: string): void {
    this.searchTerm.set(q);
    queueMicrotask(() => this.resetAndRefetch());
  }

  protected override doClear(): void {
    this.searchTerm.set('');
    queueMicrotask(() => this.resetAndRefetch());
  }
}
