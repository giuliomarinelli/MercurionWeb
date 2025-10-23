import { AddMoleculesToCollectionContextService } from './../../../services/context/add-molecules-to-collection-context.service';
import { Component, ElementRef, inject, ViewChild } from '@angular/core';
import { AbstractPaginatedMultiselectComponent } from '../../../abstract/abstract-paginated-multiselect-component';
import { MoleculeCollectionItemCardComponent } from '../../molecule-detail/molecule-collection-item-card/molecule-collection-item-card.component';
import { debounceTime, map, Observable } from 'rxjs';
import { ActionOverlayContextService } from '../../../services/context/action-context/action-overlay-context.service';
import { MoleculeCollectionItemService } from '../../../services/graphql/molecule-collection-item.service';
import { Helpers } from '../../../helpers';
import { MoleculeCardItemModel } from '../../../Models/graphql/molecule-collection/molecule-collection.types';
import { PageModel } from '../../../Models/graphql/page.model';

@Component({
  selector: 'app-add-molecules-to-collection',
  imports: [],
  template: `

    <div class="flex justify-center items-center min-h-screen px-2">
        <div
          class="w-full max-w-lg bg-white dark:bg-dark-surface-main rounded-xl shadow-lg py-6 px-3 max-h-[80vh] overflow-y-auto flex flex-col gap-4"
        >
          <div class="flex items-center justify-between mb-3 px-4 pb-4 border-b border-b-slate-400 ">
            <h2 class="text-lg font-semibold">
              Salva molecola
            </h2>
            <button class="text-2xl hover:text-emerald-600" (click)="close()">
              &times;
            </button>
          </div>
          <div class="overflow-y-auto px-3">
            <h2 class="font-semibold mb-3">
              Scegli la collezione di destinazione:
            </h2>



            <div #scrollRoot>
            <!-- QUI IL CONTENUTO CON LE CARD SELEZIONABILI -->


            </div>

          </div>
          <div class="mt-8 flex justify-end gap-2 sticky">
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
export class AddMoleculesToCollectionComponent extends AbstractPaginatedMultiselectComponent<MoleculeCollectionItemCardComponent> {

  private readonly actionOverlayContext = inject(ActionOverlayContextService)
  private readonly addContext = inject(AddMoleculesToCollectionContextService)
  private readonly moleculeCollectionItemService = inject(MoleculeCollectionItemService)

  @ViewChild('scrollRoot', { static: true })
  protected declare root: ElementRef<HTMLDivElement> | null

  @ViewChild('sentinel', { static: true })
  protected declare sentinel: ElementRef<HTMLDivElement> | undefined

  protected override fetch$(page?: number, size?: number, q?: string, excludeJoinedToCollection?: boolean, collectionId?: boolean): Observable<PageModel<MoleculeCollectionItemCardComponent>> {
    return this.moleculeCollectionItemService.getAllPaginatedItems(this.page, 8, this.searchTerm(), true, this.addContext.collectionId()).pipe(
      debounceTime(200),
      map(page => ({
        ...page,
        items: page.items.map(mol => Helpers.moleculeClientToCardAdapter(mol))
      }))
    ) as unknown as Observable<PageModel<MoleculeCollectionItemCardComponent>>
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

}
