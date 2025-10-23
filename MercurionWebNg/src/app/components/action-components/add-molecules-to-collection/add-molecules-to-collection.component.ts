// ================== AddMoleculesToCollectionComponent ==================
import { AddMoleculesToCollectionContextService } from './../../../services/context/add-molecules-to-collection-context.service';
import { AfterViewInit, Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { AbstractPaginatedMultiselectComponent } from '../../../abstract/abstract-paginated-multiselect-component';
import { debounceTime, map, Observable } from 'rxjs';
import { ActionOverlayContextService } from '../../../services/context/action-context/action-overlay-context.service';
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
        <div #sentinel class="h-px w-full"></div>

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
    </div>

    <!-- Footer azioni (fuori dallo scroll) -->
    <div class="my-4 mr-8 flex justify-end gap-2">
      <button
        type="button"
        class="px-4 py-2 rounded bg-slate-200 text-light-on-surface-main dark:bg-slate-100 dark:text-neutral-950 hover:bg-gray-300"
        (click)="close()"
      >
        Annulla
      </button>
      <button
        type="submit"
        class="px-4 py-2 rounded bg-emerald-600 text-white font-semibold shadow hover:bg-emerald-700 disabled:bg-emerald-300 disabled:cursor-not-allowed"
        [disabled]="isSelectedNothing()"
      >
        Salva
      </button>
    </div>
  </div>
</div>
`
})
export class AddMoleculesToCollectionComponent
  extends AbstractPaginatedMultiselectComponent<MoleculeCardItemModel>
  implements OnInit, AfterViewInit {

  private readonly actionOverlayContext = inject(ActionOverlayContextService);
  private readonly addContext = inject(AddMoleculesToCollectionContextService);
  private readonly moleculeCollectionItemService = inject(MoleculeCollectionItemService);

  @ViewChild('scrollRoot', { static: true })
  protected declare root: ElementRef<HTMLDivElement>;

  @ViewChild('sentinel', { static: true })
  protected declare sentinel: ElementRef<HTMLDivElement>;

  ngOnInit(): void {
    this.loadMore();            // prima pagina
  }

  ngAfterViewInit(): void {
    this.startObserver();       // attiva l’osservatore sul root reale
  }

  // usa il servizio reale
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

  protected override doQuery(q: string): void {
    this.query(q);              // reset + loadMore
  }

  protected override doClear(): void {
    this.clear();               // reset + loadMore
  }

  onSelectAllChange(checked: boolean): void {
    if (checked) this.selectAll();
    else this.unselectAll();
  }

  close(): void {
    this.actionOverlayContext.close();
  }
}
