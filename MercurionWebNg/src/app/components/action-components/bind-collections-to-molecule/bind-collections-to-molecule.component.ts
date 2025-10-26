import { BindCollectionsToMoleculeContextService } from './../../../services/context/action-context/bind-collections-to-molecule-context.service';
import { AfterViewInit, Component, ElementRef, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { AbstractPaginatedMultiselectComponent } from '../../../abstract/abstract-paginated-multiselect-component';
import { UiMoleculeCollection } from '../../../Models/graphql/molecule-collection/molecule-collection.types';
import { ActionOverlayContextService } from '../../../services/context/action-context/action-overlay-context.service';
import { MoleculeCollectionService } from '../../../services/graphql/molecule-collection.service';
import { debounceTime, map, Observable } from 'rxjs';
import { PageModel } from '../../../Models/graphql/page.model';
import { ClassicSpinnerComponent } from '../../common/classic-spinner/classic-spinner.component';
import { PmSearchInputComponent } from '../../common/pm-search-input/pm-search-input.component';

@Component({
  selector: 'app-bind-collections-to-molecule',
  imports: [ClassicSpinnerComponent, PmSearchInputComponent],
  template: `
<div class="flex justify-center items-center min-h-screen px-2">
  <div class="w-full max-w-5xl bg-white dark:bg-dark-surface-main rounded-xl shadow-lg">

    <!-- Header sticky fuori dallo scroll -->
    <div class="flex items-center justify-between px-4 py-4 border-b border-b-slate-400 sticky top-0 z-50 rounded-t-xl bg-white dark:bg-dark-surface-main">
      <h2 class="text-lg font-semibold">Collega molecola a nuove collezioni</h2>
      <button class="text-2xl hover:text-emerald-600" (click)="close()">&times;</button>
    </div>
    <div #scrollRoot class="py-6 px-3 overflow-y-auto flex flex-col gap-4 min-h-[60vh] max-h-[60vh]">
      @switch (step()) {
        @case (1) {
          <div class="px-3">
            <h2 class="font-semibold mb-3">Scegli le collezioni a cui aggiungere la molecola:</h2>
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
          [class.hidden]="!step_12_loading()"
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
    this.observer?.disconnect()
  }

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

  }

}
