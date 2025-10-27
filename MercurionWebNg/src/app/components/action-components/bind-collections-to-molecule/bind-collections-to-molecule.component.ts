import { BindCollectionsToMoleculeContextService } from './../../../services/context/action-context/bind-collections-to-molecule-context.service';
import { AfterViewInit, Component, effect, ElementRef, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { AbstractPaginatedMultiselectComponent } from '../../../abstract/abstract-paginated-multiselect-component';
import { UiMoleculeCollection } from '../../../Models/graphql/molecule-collection/molecule-collection.types';
import { ActionOverlayContextService } from '../../../services/context/action-context/action-overlay-context.service';
import { MoleculeCollectionService } from '../../../services/graphql/molecule-collection.service';
import { debounceTime, map, Observable, Subscription } from 'rxjs';
import { PageModel } from '../../../Models/graphql/page.model';
import { ClassicSpinnerComponent } from '../../common/classic-spinner/classic-spinner.component';
import { PmSearchInputComponent } from '../../common/pm-search-input/pm-search-input.component';
import { CollectionSelectCardComponent } from '../../molecule-detail/collection-select-card/collection-select-card.component';
import { SkeletonCollectionCardComponent } from '../../common/skeleton-card-loader/skeleton-card-loader.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-bind-collections-to-molecule',
  imports: [ClassicSpinnerComponent, PmSearchInputComponent, CollectionSelectCardComponent, SkeletonCollectionCardComponent],
  template: `
<div class="flex justify-center items-center min-h-screen px-2">
  <div class="w-full max-w-5xl bg-white dark:bg-dark-surface-main rounded-xl shadow-lg">

    <!-- Header sticky fuori dallo scroll -->
    <div class="flex items-center justify-between px-4 py-4 border-b border-b-slate-400 sticky top-0 z-50 rounded-t-xl bg-white dark:bg-dark-surface-main">
      <h2 class="text-lg font-semibold">Collega molecola a nuove collezioni</h2>
      <button class="inline-flex items-center justify-center size-8 rounded-md text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-transparent transition" (click)="close()">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current w-5 h-auto">
          <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
          <path d="M182.9 137.4L160.3 114.7L115 160L137.6 182.6L275 320L137.6 457.4L115 480L160.3 525.3L182.9 502.6L320.3 365.3L457.6 502.6L480.3 525.3L525.5 480L502.9 457.4L365.5 320L502.9 182.6L525.5 160L480.3 114.7L457.6 137.4L320.3 274.7L182.9 137.4z"/>
        </svg>
      </button>
    </div>
    <div #scrollRoot class="py-6 px-3 overflow-y-auto flex flex-col gap-4 min-h-[60vh] max-h-[60vh]">
      @switch (step()) {
        @case (1) {
          <div class="px-3">
            <h2 class="font-semibold mb-3">Scegli le collezioni a cui aggiungere la molecola:</h2>
            <pm-search-input
              class="block"
              [value]="searchTerm()"
              (valueChange)="doQuery($event)"
              (submitted)="doQuery($event)"
              (cleared)="doClear()"
            />
            <div class="mt-6">
              <app-collection-select-card class="block mb-6"
                [isSelectAll]="true"
                [value]="isSelectedAll()"
                [indeterminate]="isPartiallySelected()"
                (selectedAll)="onSelectAllChange($event)"
              />
              @for (row of multiselectItems(); track row.item.id; let i = $index) {
                <app-collection-select-card
                  [collection]="row.item"
                  [i]="i"
                  [value]="row.isChecked()"
                  (valueChange)="row.isChecked.set($event)"
                />
              }
            </div>
            <div #sentinel class="h-1 w-full"></div>
            @if (loading) {
              @if (page > 1) {
                <div class="flex justify-center py-4">
                  <app-classic-spinner [size]="60" />
                </div>
              } @else {
                <div class="space-y-4">
                  @for (i of [0,1,2,3,4]; track i) {
                    <app-skeleton-collection-card />
                  }
                </div>
              }
            } @else if (empty() && (earlyDone || done)) {
              <p class="text-slate-700 dark:text-slate-200 py-6">Nessuna molecola.</p>
            }
          </div>
        }
        @case (2) {
          @if (error()) {
            <span class="text-light-error dark:text-dark-error">Si è verificato un errore</span>
          } @else {
            <span class="text-light-accent-secondary dark:text-dark-accent-secondary">Collezioni collegate con successo!</span>
          }
        }
      }
    </div>
    <div class="my-4 mr-8 flex justify-end gap-2">
      @if (step() === 1) {
        <button
          type="button"
          class="px-4 py-2 rounded bg-slate-200 text-light-on-surface-main dark:bg-slate-100 dark:text-neutral-950 hover:bg-gray-300"
          (click)="close()"
        >
          Annulla
        </button>
      }
      <button
        type="submit"
        class="relative inline-flex items-center justify-center px-4 py-2 rounded bg-emerald-600 text-white font-semibold shadow hover:bg-emerald-700 disabled:bg-emerald-300 disabled:cursor-not-allowed"
        [disabled]="(isSelectedNothing() || step_12_loading())"
        (click)="step() === 1 ? doSubmit() : close()"
        [attr.aria-busy]="step_12_loading()"
      >
        <!-- Keep label in flow to preserve size -->
        <span [class.invisible]="step_12_loading()">
          @if (step() === 1) {
            <span>Aggiungi</span>
          } @else if (step() === 2) {
            <span>Ok</span>
          }
        </span>

        <!-- Overlay spinner without affecting layout -->
        <span
          aria-hidden="true"
          class="absolute inset-0 flex items-center justify-center"
          [class.hidden]="!step_12_loading() || (step() === 1 && isSelectedNothing())"
        >
          <app-classic-spinner [size]="24"></app-classic-spinner>
        </span>
      </button>
    </div>

  `
})
export class BindCollectionsToMoleculeComponent extends AbstractPaginatedMultiselectComponent<UiMoleculeCollection>
  implements OnInit, AfterViewInit, OnDestroy {

  private readonly actionOverlayContext = inject(ActionOverlayContextService)
  private readonly bindContext = inject(BindCollectionsToMoleculeContextService)
  private readonly moleculeCollectionService = inject(MoleculeCollectionService)
  private readonly router = inject(Router)


  private suSub?: Subscription

  step = signal<1 | 2>(1)
  step_12_loading = signal<boolean>(false)
  error = signal<boolean>(false)

  @ViewChild('scrollRoot', { static: false })
  protected declare root: ElementRef<HTMLDivElement>

  @ViewChild('sentinel', { static: false })
  protected declare sentinel: ElementRef<HTMLDivElement>

  ngOnInit(): void {
    queueMicrotask(() => this.loadMore())
  }

  ngAfterViewInit(): void {
    queueMicrotask(() => this.startObserver())
  }

  ngOnDestroy(): void {
    this.suSub?.unsubscribe()
    this.observer?.disconnect()
  }

  private _rearmOnStep = effect(() => {
    if (this.step() === 1) {
      queueMicrotask(() => this.startObserver());
    } else {
      this.observer?.disconnect();
    }
  });

  protected override fetch$(page?: number, size?: number, q?: string, excludeJoinedToCollection?: boolean, collectionId?: boolean): Observable<PageModel<UiMoleculeCollection>> {

    return this.moleculeCollectionService.getPaginatedCollections(this.page, 8, this.searchTerm(), true, this.bindContext.moleculeId()).pipe(
      debounceTime(100),
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

  close(): void {
    this.actionOverlayContext.close()
  }

  doSubmit(): void {
    if (this.step() === 1) {
      if (this.isSelectedNothing()) {
        return
      }
      this.step_12_loading.set(true)
      let collectionIds: string[] = []
      if (this.isSelectedAll()) {
        collectionIds = this.multiselectItems().filter(w => !w.isChecked()).map(w => w.item.id)
      } else {
        collectionIds = this.multiselectItems().filter(w => w.isChecked()).map(w => w.item.id)
      }
      this.suSub = this.moleculeCollectionService
        .bindManyCollectionsToMolecule(this.bindContext.moleculeId()!, collectionIds, this.isSelectedAll())
        .subscribe({
          next: ({ ok, moleculeUUID }) => {
            this.step_12_loading.set(false)
            this.bindContext.notifyAdded()
            this.error.set(!ok)
            this.bindContext.clearMoleculeId()
            queueMicrotask(() => {
              this.actionOverlayContext.close()
              if (moleculeUUID) {
                this.router.navigateByUrl(`/molecules/detail/${moleculeUUID}`)
              }
            })
          },
          error: () => {
            this.step_12_loading.set(false)
            this.error.set(true)
            this.step.set(2)
          }
        })
    }
  }

}
