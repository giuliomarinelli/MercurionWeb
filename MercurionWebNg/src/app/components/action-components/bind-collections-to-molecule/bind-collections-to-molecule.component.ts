import { BindCollectionsToMoleculeContextService } from './../../../services/context/action-context/bind-collections-to-molecule-context.service';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild
} from '@angular/core';
import { AbstractPaginatedMultiselectComponent } from '../../../abstract/abstract-paginated-multiselect-component';
import { UiMoleculeCollection } from '../../../Models/graphql/molecule-collection/molecule-collection.types';
import { ActionOverlayContextService } from '../../../services/context/action-context/action-overlay-context.service';
import { MoleculeCollectionService } from '../../../services/graphql/molecule-collection.service';
import { debounceTime, map, Observable, Subscription } from 'rxjs';
import { PageModel } from '../../../Models/graphql/page.models';
import { ClassicSpinnerComponent } from '../../common/classic-spinner/classic-spinner.component';
import { PmSearchInputComponent } from '../../common/pm-search-input/pm-search-input.component';
import { CollectionSelectCardComponent } from '../../molecule-detail/collection-select-card/collection-select-card.component';
import { SkeletonCollectionCardComponent } from '../../common/skeleton-card-loader/skeleton-card-loader.component';
import { Router } from '@angular/router';
import { CloseButtonComponent } from '../../common/close-button/close-button.component';

@Component({
  selector: 'm-bind-collections-to-molecule',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ClassicSpinnerComponent,
    PmSearchInputComponent,
    CollectionSelectCardComponent,
    SkeletonCollectionCardComponent,
    CloseButtonComponent
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
<div class="flex justify-center items-center min-h-screen px-2 sm:px-4">
  <div class="action-card max-w-5xl">
    <!-- HEADER -->
    <div class="action-card-header">
      <h2 class="text-lg font-semibold text-light-on-surface-main dark:text-dark-on-surface-main">
        Collega molecola a nuove collezioni
      </h2>

      <m-close-button [action]="close.bind(this)" />
    </div>

    <!-- BODY -->
    <div class="action-card-body bg-white dark:bg-dark-surface-main">
      <div
        #scrollRoot
        class="py-6 px-3 overflow-y-auto flex flex-col gap-4 min-h-[60vh] max-h-[60vh] m-scroll-thin"
      >
        @switch (step()) {
          @case (1) {
            <div class="px-3">
              <h2 class="font-semibold mb-3">
                Scegli le collezioni a cui aggiungere la molecola:
              </h2>

              <m-search-input
                class="block"
                [value]="searchTerm()"
                [placeholder]="'Cerca una collezione...'"
                (valueChange)="doQuery($event)"
                (submitted)="doQuery($event)"
                (cleared)="doClear()"
              />

              <div class="mt-6">
                @if (multiselectItems().length !== 0) {
                  <m-collection-select-card
                    class="block mb-6"
                    [isSelectAll]="true"
                    [value]="isSelectedAll()"
                    [indeterminate]="isPartiallySelected()"
                    (selectedAll)="onSelectAllChange($event)"
                  />
                }

                @for (row of multiselectItems(); track row.item.id; let i = $index) {
                  <m-collection-select-card
                    [collection]="row.item"
                    [i]="i"
                    [value]="row.isChecked()"
                    (valueChange)="row.isChecked.set($event); toggleOne(row)"
                  />
                }
              </div>

              <div #sentinel class="h-1 w-full"></div>

              @if (loading) {
                @if (page > 1) {
                  <div class="flex justify-center py-4">
                    <m-classic-spinner [size]="60" />
                  </div>
                } @else {
                  <div class="space-y-4">
                    @for (i of [0,1,2,3,4]; track i) {
                      <m-skeleton-collection-card />
                    }
                  </div>
                }
              } @else if (empty() && (earlyDone || done)) {
                <p class="text-slate-700 dark:text-slate-200 py-6">
                  Nessuna collezione.
                </p>
              }
            </div>
          }
          @case (2) {
            @if (error()) {
              <span class="text-light-error dark:text-dark-error">
                Si è verificato un errore
              </span>
            } @else {
              <span class="text-light-accent-secondary dark:text-dark-accent-secondary">
                Collezioni collegate con successo!
              </span>
            }
          }
        }
      </div>
    </div>

    <!-- FOOTER -->
    <div class="action-card-footer">
      @if (step() === 1) {
        <button
          type="button"
          class="px-4 py-2 rounded-lg bg-light-surface-secondary text-light-on-surface-main
                 dark:bg-slate-200 dark:text-light-on-surface-main
                 hover:bg-white dark:hover:bg-slate-300/80
                 border border-light-border dark:border-dark-border/80
                 shadow-sm
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-accent-primary
                 focus-visible:ring-offset-2 focus-visible:ring-offset-light-surface-secondary
                 dark:focus-visible:ring-offset-dark-surface-secondary
                 transition-colors duration-200"
          (click)="close()"
        >
          Annulla
        </button>
      }

      <button
        type="button"
        class="relative inline-flex items-center justify-center px-4 py-2 rounded-lg
               bg-light-accent-primary text-white font-semibold shadow-md
               hover:bg-light-accent-primary/90
               dark:bg-dark-accent-primary-btn dark:hover:bg-dark-accent-primary
               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-accent-primary
               focus-visible:ring-offset-2 focus-visible:ring-offset-light-surface-secondary
               dark:focus-visible:ring-offset-dark-surface-secondary
               disabled:bg-light-accent-primary/50 disabled:cursor-not-allowed
               transition-colors duration-200 dark:shadow-btn-dark disabled:hover:bg-light-accent-primary/50"
        [disabled]="(isSelectedNothing() || step_12_loading())"
        (click)="step() === 1 ? doSubmit() : close()"
        [attr.aria-busy]="step_12_loading()"
      >
        <span [class.invisible]="step_12_loading()">
          @if (step() === 1) {
            <span>Aggiungi</span>
          } @else if (step() === 2) {
            <span>Ok</span>
          }
        </span>

        <span
          aria-hidden="true"
          class="absolute inset-0 flex items-center justify-center"
          [class.hidden]="!step_12_loading() || (step() === 1 && isSelectedNothing())"
        >
          <m-classic-spinner [size]="24"></m-classic-spinner>
        </span>
      </button>
    </div>
  </div>
</div>
  `
})
export class BindCollectionsToMoleculeComponent
  extends AbstractPaginatedMultiselectComponent<UiMoleculeCollection>
  implements OnInit, AfterViewInit, OnDestroy {

  private readonly actionOverlayContext = inject(ActionOverlayContextService);
  private readonly bindContext = inject(BindCollectionsToMoleculeContextService);
  private readonly moleculeCollectionService = inject(MoleculeCollectionService);
  private readonly router = inject(Router);

  private suSub?: Subscription;

  step = signal<1 | 2>(1);
  step_12_loading = signal<boolean>(false);
  error = signal<boolean>(false);

  @ViewChild('scrollRoot', { static: false })
  protected declare root: ElementRef<HTMLDivElement>;

  @ViewChild('sentinel', { static: false })
  protected declare sentinel: ElementRef<HTMLDivElement>;

  ngOnInit(): void {
    queueMicrotask(() => this.loadMore());
  }

  ngAfterViewInit(): void {
    queueMicrotask(() => this.startObserver());
  }

  ngOnDestroy(): void {
    this.suSub?.unsubscribe();
    this.observer?.disconnect();
  }

  private _rearmOnStep = effect(() => {
    if (this.step() === 1) {
      queueMicrotask(() => this.startObserver());
    } else {
      this.observer?.disconnect();
    }
  });

  protected override fetch$(
    page?: number,
    size?: number,
    q?: string,
    excludeJoinedToCollection?: boolean,
    collectionId?: boolean
  ): Observable<PageModel<UiMoleculeCollection>> {
    return this.moleculeCollectionService
      .getPaginatedCollections(this.page, 8, this.searchTerm(), true, this.bindContext.moleculeId())
      .pipe(
        debounceTime(100),
        map(page => ({
          ...page,
          items: page.items.map(item => ({
            ...item,
            triggerDisappear: signal<boolean>(false),
            collapse: signal<boolean>(false)
          }))
        }))
      );
  }

  protected override doQuery(q: string): void {
    this.query(q);
  }

  protected override doClear(): void {
    this.clear();
  }

  close(): void {
    this.actionOverlayContext.close();
  }

  doSubmit(): void {
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
        .bindManyCollectionsToMolecule(this.bindContext.moleculeId()!, collectionIds, this.isSelectedAll())
        .subscribe({
          next: ({ ok, moleculeUUID }) => {
            this.step_12_loading.set(false);
            this.bindContext.notifyAdded();
            this.error.set(!ok);
            this.bindContext.clearMoleculeId();
            queueMicrotask(() => {
              this.actionOverlayContext.close();
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
