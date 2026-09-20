import { BindCollectionsToMoleculeContextService } from './../../../services/context/action-context/bind-collections-to-molecule-context.service';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  effect,
  computed,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  viewChild
} from '@angular/core';
import { PaginationController } from '../../../services/pagination/pagination-controller';
import { UiMoleculeCollection } from '../../../Models/graphql/molecule-collection/molecule-collection.types';
import { ActionOverlayContextService } from '../../../services/context/action-context/action-overlay-context.service';
import { MoleculeCollectionService } from '../../../services/graphql/molecule-collection.service';
import { debounceTime, map, Observable, Subscription } from 'rxjs';
import { PageModel } from '../../../Models/graphql/page.models';
import { ProgressIndicatorComponent } from '../../common/progress-indicator/progress-indicator.component';
import { PmSearchInputComponent } from '../../common/pm-search-input/pm-search-input.component';
import { CollectionCardComponent } from '../../molecule-detail/collection-card/collection-card.component';
import { SkeletonCollectionCardComponent } from '../../common/skeleton-card-loader/skeleton-card-loader.component';
import { Router } from '@angular/router';
import { ActionCardComponent } from '../../common/action-card/action-card.component';
import { DomainInvalidationService } from '../../../services/domain-invalidation.service';
import { ActionFooterComponent } from '../../common/action-footer/action-footer.component';
import { ButtonComponent } from '../../common/button/button.component';
import { CollectionPickerFacade } from '../collection-picker/collection-picker.facade';
import { AbstractMultiselectItem } from '../../../Models/abstract.models';

@Component({
  selector: 'm-bind-collections-to-molecule',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ProgressIndicatorComponent,
    PmSearchInputComponent,
    CollectionCardComponent,
    SkeletonCollectionCardComponent,
    ActionCardComponent,
    ActionFooterComponent,
    ButtonComponent
  ],
  styles: [
    `
    /* Scrollbar sottile cross-browser */
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
    `
  ],
  template: `
<div class="flex justify-center items-start md:items-center min-h-screen px-2 sm:px-4 pt-1 md:pt-6 m-overlay-screen">
  <m-action-card
    size="wide"
    labelledBy="bindCollectionsHeading"
    closeLabel="Chiudi pannello collega collezioni"
    [busy]="step_12_loading()"
    (closed)="close()"
  >
    <!-- HEADER -->
      <h2 action-card-title
        id="bindCollectionsHeading"
        class="text-lg font-semibold text-light-on-surface-main dark:text-dark-on-surface-main"
      >
        Collega molecola a nuove collezioni
      </h2>

      <!-- BODY -->
      <div action-card-body class="bg-white dark:bg-dark-surface-main">
      <div
        #scrollRoot
        class="py-6 px-2 sm:px-3 overflow-y-auto flex flex-col gap-4 m-scroll-thin m-overscroll-touch m-overlay-body"
      >
        @switch (step()) {
          @case (1) {
            <div class="px-2 sm:px-3 space-y-3 sm:space-y-4">
              <h2 class="font-semibold text-center sm:text-left">
                Scegli le collezioni a cui aggiungere la molecola:
              </h2>

              <m-search-input
                class="block w-full max-w-[20rem] sm:max-w-none mx-auto sm:mx-0"
                [value]="searchTerm()"
                [placeholder]="'Cerca una collezione...'"
                [useAltDarkStyle]="true"
                (valueChange)="doQuery($event)"
                (submitted)="doQuery($event)"
                (cleared)="doClear()"
              />

              <div class="pt-2 sm:pt-4">
                @if (multiselectItems().length !== 0) {
                  <div class="flex items-center gap-3 mb-6">
                    <button
                      type="button"
                      class="block w-full select-none font-semibold ml-[2px] text-left"
                      (click)="onSelectAllChange(!isSelectedAll())"
                      aria-label="Seleziona tutte le collezioni"
                    >
                      {{ isSelectedAll() ? 'DESELEZIONA TUTTI' : 'SELEZIONA TUTTI' }}
                    </button>
                  </div>
                }

                @for (row of multiselectItems(); track row.item.id; let i = $index) {
                  <m-collection-card
                    [collection]="row.item"
                    [i]="i"
                    [isReadonly]="true"
                    [selectable]="true"
                    [selected]="row.isChecked()"
                    (selectedChange)="row.isChecked.set($event); toggleOne(row)"
                  />
                }
              </div>

              <div #sentinel class="h-1 w-full"></div>

              @if (loading) {
                @if (page > 1) {
                  <div class="flex justify-center py-4" role="status" aria-live="polite" aria-busy="true">
                    <m-progress-indicator [size]="60" />
                  </div>
                } @else {
                  <div class="space-y-4" role="status" aria-live="polite" aria-busy="true">
                    @for (i of [0,1,2,3,4]; track i) {
                      <m-skeleton-collection-card />
                    }
                  </div>
                }
              } @else if (empty() && (earlyDone || done)) {
                <p class="text-slate-700 dark:text-slate-200 py-6" role="status" aria-live="polite">
                  Nessuna collezione.
                </p>
              }
            </div>
          }
          @case (2) {
            @if (error()) {
              <span
                id="bindCollectionsStatus"
                class="text-light-error dark:text-dark-error"
                role="alert"
                aria-live="assertive"
              >
                Si è verificato un errore
              </span>
            } @else {
              <span
                id="bindCollectionsStatus"
                class="text-light-accent-primary-hc dark:text-dark-accent-secondary"
                role="status"
                aria-live="polite"
              >
                Collezioni collegate con successo!
              </span>
            }
          }
        }
      </div>
    </div>

    <!-- FOOTER -->
    <m-action-footer action-card-footer>
      @if (step() === 1) {
        <m-button
        action-footer-secondary
        variant="neutral"
        (click)="close()"
        >
        Annulla
        </m-button>
      }

      <m-button
        action-footer-primary
        [disabled]="(isSelectedNothing() || step_12_loading())"
        [loading]="step_12_loading()"
        (click)="step() === 1 ? doSubmit() : close()"
        [attr.aria-label]="step() === 1 ? 'Aggiungi la molecola alle collezioni selezionate' : 'Chiudi conferma'"
        [attr.aria-describedby]="step() === 2 ? 'bindCollectionsStatus' : null"
      >
        @if (step() === 1) {
        Aggiungi
        } @else if (step() === 2) {
        Ok
        }
      </m-button>
    </m-action-footer>
  </m-action-card>
</div>
  `
})
export class BindCollectionsToMoleculeComponent implements OnInit, AfterViewInit, OnDestroy {

  private readonly actionOverlayContext = inject(ActionOverlayContextService);
  private readonly bindContext = inject(BindCollectionsToMoleculeContextService);
  private readonly invalidation = inject(DomainInvalidationService);
  private readonly moleculeCollectionService = inject(MoleculeCollectionService);
  private readonly picker = new CollectionPickerFacade({
    mode: { kind: 'multi', operation: 'bind', moleculeId: this.bindContext.moleculeId() ?? '' },
    pageSize: 20
  });
  private readonly router = inject(Router);
  private readonly sessionId = this.actionOverlayContext.session('BindCollectionsToMolecule')?.id ?? -1;
  private readonly pagination = new PaginationController<UiMoleculeCollection>({
    fetch: page => this.picker.fetchPage$(page, this.searchTerm()).pipe(
      debounceTime(100),
      map(result => ({ ...result, items: result.items.map(item => ({
        ...item,
        triggerDisappear: signal(false),
        collapse: signal(false)
      })) }))
    )
  })
  private observer?: IntersectionObserver

  private suSub?: Subscription;

  step = signal<1 | 2>(1);
  step_12_loading = signal<boolean>(false);
  error = signal<boolean>(false);

  protected readonly root = viewChild<ElementRef<HTMLDivElement>>('scrollRoot');
  protected readonly sentinel = viewChild<ElementRef<HTMLDivElement>>('sentinel');
  readonly multiselectItems = signal<AbstractMultiselectItem<UiMoleculeCollection>[]>([]);
  readonly selectedIdSet = signal<Set<string>>(new Set());
  readonly excludedIdSet = signal<Set<string>>(new Set());
  readonly bulkIntent = signal<'none' | 'all' | 'unselect'>('none');
  readonly selectionSnapshotAt = signal<string | null>(null);
  readonly isSelectedAll = computed(() => this.bulkIntent() === 'all');
  readonly isSelectedNothing = computed(() => this.bulkIntent() !== 'all' && this.selectedIdSet().size === 0);
  readonly isPartiallySelected = computed(() => {
    const visible = this.multiselectItems();
    const checked = visible.filter(item => item.isChecked()).length;
    return checked > 0 && checked < visible.length;
  });
  get items(): UiMoleculeCollection[] { return this.pagination.items() }
  get loading(): boolean { return this.pagination.loading() }
  get done(): boolean { return this.pagination.done() }
  get earlyDone(): boolean { return this.pagination.earlyDone() }
  get page(): number { return this.pagination.page() }
  get empty(): ReturnType<typeof signal<boolean>> { return this.pagination.empty }
  get searchTerm(): ReturnType<typeof signal<string>> { return this.pagination.query }

  ngOnInit(): void {
    queueMicrotask(() => void this.loadMore());
  }

  ngAfterViewInit(): void {
    queueMicrotask(() => this.startObserver());
  }

  ngOnDestroy(): void {
    this.suSub?.unsubscribe();
    this.observer?.disconnect();
    this.pagination.dispose();
    this.picker.destroy();
  }

  private _rearmOnStep = effect(() => {
    if (this.step() === 1) {
      queueMicrotask(() => this.startObserver());
    } else {
      this.observer?.disconnect();
    }
  });

  loadMore(): Promise<void> {
    return this.pagination.loadMore().then(() => {
      const existing = new Map(this.multiselectItems().map(row => [row.item.id, row]));
      const rows = this.items.map(item => existing.get(item.id) ?? {
        item,
        isChecked: signal(this.isSelectedAll() ? !this.excludedIdSet().has(item.id) : this.selectedIdSet().has(item.id))
      });
      this.multiselectItems.set(rows);
    });
  }
  retryPagination(): void { this.pagination.retry(); }
  resetPagination(): void { this.pagination.reset(); this.multiselectItems.set([]); }
  doQuery(q: string): void { this.pagination.setQuery(q); this.multiselectItems.set([]); }
  doClear(): void { this.pagination.clear(); this.multiselectItems.set([]); }
  paginationState() { return this.pagination.paginationState(); }
  private startObserver(): void {
    const sentinel = this.sentinel()?.nativeElement;
    if (!sentinel) return;
    this.observer?.disconnect();
    this.observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting) void this.loadMore();
    }, { root: this.root()?.nativeElement ?? null, rootMargin: '0px 0px 500px 0px' });
    this.observer.observe(sentinel);
  }
  toggleOne(row: AbstractMultiselectItem<UiMoleculeCollection>): void {
    const next = new Set(this.bulkIntent() === 'all' ? this.excludedIdSet() : this.selectedIdSet());
    if (this.bulkIntent() === 'all') {
      row.isChecked() ? next.delete(row.item.id) : next.add(row.item.id);
      this.excludedIdSet.set(next);
    } else {
      row.isChecked() ? next.add(row.item.id) : next.delete(row.item.id);
      this.selectedIdSet.set(next);
      this.bulkIntent.set('none');
    }
  }
  onSelectAllChange(checked: boolean): void {
    if (checked) {
      this.bulkIntent.set('all');
      this.excludedIdSet.set(new Set());
      this.selectionSnapshotAt.set(String(Date.now()));
    } else {
      this.bulkIntent.set('unselect');
      this.selectedIdSet.set(new Set());
      this.excludedIdSet.set(new Set());
      this.selectionSnapshotAt.set(null);
    }
    this.multiselectItems().forEach(row => row.isChecked.set(checked));
  }

  close(): void {
    this.actionOverlayContext.close(this.sessionId);
  }

  doSubmit(): void {
    const moleculeId = this.bindContext.moleculeId();
    if (!moleculeId) {
      this.error.set(true);
      return;
    }
    if (this.step() === 1) {
      if (this.isSelectedNothing()) {
        return;
      }
      this.step_12_loading.set(true);
      let collectionIds: string[] = [];
      if (this.isSelectedAll()) {
        collectionIds = this.multiselectItems()
          .filter(w => !w.isChecked())
          .map(w => w.item.id);
      } else {
        collectionIds = Array.from(this.selectedIdSet());
      }
      this.suSub = this.moleculeCollectionService
        .bindManyCollectionsToMolecule(
          moleculeId,
          collectionIds,
          this.isSelectedAll(),
          this.selectionSnapshotAt()
        )
        .subscribe({
          next: ({ ok, moleculeUUID }) => {
            this.step_12_loading.set(false);
            if (ok) {
              this.invalidation.publish({
                domain: 'molecule',
                action: 'collections-bound',
                moleculeId
              });
            }
            this.error.set(!ok);
            queueMicrotask(() => {
              this.actionOverlayContext.close(this.sessionId);
              if (moleculeUUID) {
                this.router.navigateByUrl(`/molecules/detail/${moleculeUUID}`);
              }
            });
          },
          error: () => {
            this.step_12_loading.set(false);
            this.error.set(true);
            this.step.set(2);
          }
        });
    }
  }
}
