// ================== AddMoleculesToCollectionComponent ==================
import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal, effect } from '@angular/core';
import { AbstractPaginatedMultiselectComponent } from '../../../abstract/abstract-paginated-multiselect-component';
import { debounceTime, map, Observable } from 'rxjs';
import { ActionOverlayContextService } from '../../../services/context/action-context/action-overlay-context.service';
import { AddMoleculesToCollectionContextService } from './../../../services/context/add-molecules-to-collection-context.service';
import { MoleculeCollectionItemService } from '../../../services/graphql/molecule-collection-item.service';
import { Helpers } from '../../../helpers';
import { MoleculeCardItemModel } from '../../../Models/graphql/molecule-collection/molecule-collection.types';
import { PageModel } from '../../../Models/graphql/page.model';

import { PmSearchInputComponent } from '../../common/pm-search-input/pm-search-input.component';
import { MoleculeCollectionItemSelectCardComponent } from '../../molecule-detail/molecule-collection-item-select-card/molecule-collection-item-select-card.component';
import { ClassicSpinnerComponent } from '../../common/classic-spinner/classic-spinner.component';
import { SkeletonMoleculeCardComponent } from '../../molecule-detail/skeleton-molecule-card/skeleton-molecule-card.component';

@Component({
  selector: 'app-add-molecules-to-collection',
  standalone: true,
  imports: [
    PmSearchInputComponent,
    MoleculeCollectionItemSelectCardComponent,
    ClassicSpinnerComponent,
    SkeletonMoleculeCardComponent
  ],
  template: `
<div class="flex justify-center items-center min-h-screen px-2">
  <div class="w-full max-w-5xl bg-white dark:bg-dark-surface-main rounded-xl shadow-lg">

    <!-- Header sticky fuori dallo scroll -->
    <div class="flex items-center justify-between px-4 py-4 border-b border-b-slate-400 sticky top-0 z-50 rounded-t-xl bg-white dark:bg-dark-surface-main">
      <h2 class="text-lg font-semibold">Aggiungi molecole alla collezione</h2>
      <button class="text-2xl hover:text-emerald-600" (click)="close()">&times;</button>
    </div>

    <!-- Root scrollabile -->
    <div #scrollRoot class="py-6 px-3 overflow-y-auto flex flex-col gap-4 min-h-[60vh] max-h-[60vh]">
      @switch (step()) {
        @case (1) {
          <div class="px-3">
            <h2 class="font-semibold mb-3">Scegli le molecole da aggiungere alla collezione:</h2>

            <!-- 🔎 Search: sempre visibile -->
            <pm-search-input
              class="block"
              [value]="searchTerm()"
              (valueChange)="doQuery($event)"
              (submitted)="doQuery($event)"
              (cleared)="doClear()"
            />

            <!-- Lista -->
            <div class="mt-6">
              <!-- Riga "Seleziona tutti" -->
              <app-molecule-collection-item-select-card class="block mb-6"
                [isSelectAll]="true"
                [value]="isSelectedAll()"
                [indeterminate]="isPartiallySelected()"
                (selectedAll)="onSelectAllChange($event)"
              />

              <!-- Righe elementi -->
              @for (row of multiselectItems(); track row.item.id; let i = $index) {
                <app-molecule-collection-item-select-card
                  [molecule]="row.item"
                  [i]="i"
                  [(value)]="row.isChecked"
                />
              }
            </div>

            <!-- Sentinel per IntersectionObserver (figlio del root) -->
            <div #sentinel class="h-1 w-full"></div>

            <!-- Loading / Skeleton / Empty -->
            @if (loading) {
              @if (page > 1) {
                <div class="flex justify-center py-4">
                  <app-classic-spinner [size]="60" />
                </div>
              } @else {
                <div class="space-y-4">
                  @for (i of [0,1,2,3,4]; track i) {
                    <app-skeleton-molecule-card />
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
            <span class="text-light-accent-secondary dark:text-dark-accent-secondary">Molecole aggiunte con successo!</span>
          }
        }
      }
    </div>

    <!-- Footer azioni (fuori dallo scroll) -->
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
        class="px-4 py-2 rounded bg-emerald-600 text-white font-semibold shadow hover:bg-emerald-700 disabled:bg-emerald-300 disabled:cursor-not-allowed"
        [disabled]="isSelectedNothing()"
        (click)="doSubmit()"
      >
        @if (step() === 1) { <span>Aggiungi</span> }
        @else if (step() === 2) { <span>Ok</span> }
      </button>
    </div>
  </div>
</div>
`
})
export class AddMoleculesToCollectionComponent
  extends AbstractPaginatedMultiselectComponent<MoleculeCardItemModel>
  implements OnInit, AfterViewInit, OnDestroy {

  private readonly actionOverlayContext = inject(ActionOverlayContextService);
  private readonly addContext = inject(AddMoleculesToCollectionContextService);
  private readonly moleculeCollectionItemService = inject(MoleculeCollectionItemService);

  step = signal<1 | 2>(1);
  step_12_loading = signal<boolean>(false);
  error = signal<boolean>(false);

  // ⚠️ non statici: il sentinel entra/esce con @switch
  @ViewChild('scrollRoot', { static: false }) protected declare root: ElementRef<HTMLDivElement>;
  @ViewChild('sentinel', { static: false }) protected declare sentinel: ElementRef<HTMLDivElement>;

  // Ri-arma l'observer quando torni allo step 1 (dopo che il DOM è pronto)
  private _rearmOnStep = effect(() => {
    if (this.step() === 1) {
      queueMicrotask(() => this.startObserver());
    } else {
      this.observer?.disconnect();
    }
  });

  ngOnInit(): void {
    this.loadMore(); // prima pagina
  }

  ngAfterViewInit(): void {
    this.startObserver();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  // datasource
  protected override fetch$(page?: number, size?: number, q?: string, excludeJoinedToCollection?: boolean, collectionId?: boolean): Observable<PageModel<MoleculeCardItemModel>> {
    return this.moleculeCollectionItemService
      .getAllPaginatedItems(this.page, 8, this.searchTerm(), true, this.addContext.collectionId())
      .pipe(
        debounceTime(200),
        map(p => ({
          ...p,
          items: p.items.map(mol => Helpers.moleculeClientToCardAdapter(mol))
        }))
      );
  }

  protected override doQuery(q: string): void { this.query(q); }
  protected override doClear(): void { this.clear(); }

  onSelectAllChange(checked: boolean): void {
    if (checked) this.selectAll();
    else this.unselectAll();
  }

  close(): void {
    this.actionOverlayContext.close();
  }

  doSubmit(): void {
    if (this.step() === 1) {
      if (this.isSelectedNothing()) return;

      let itemIds: string[] = [];
      if (this.isSelectedAll()) {
        itemIds = this.multiselectItems().filter(w => !w.isChecked()).map(w => w.item.id);
      } else {
        itemIds = this.multiselectItems().filter(w => w.isChecked()).map(w => w.item.id);
      }

      this.step_12_loading.set(true);
      this.moleculeCollectionItemService
        .addManyMoleculesToCollection(this.addContext.collectionId()!, itemIds, this.isSelectedAll())
        .subscribe({
          next: ok => {
            this.step_12_loading.set(false);
            this.addContext.notifyAdded()
            this.error.set(!ok);
            this.step.set(2);
          },
          error: () => {
            this.step_12_loading.set(false);
            this.error.set(true);
            this.step.set(2);
          }
        });
    } else {
      this.actionOverlayContext.close();
    }
  }
}
