import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CustomDetailsComponent } from '../../components/molecule-detail/my-molecule-custom-details/custom-details.component';
import { PmSearchInputComponent } from '../../components/common/pm-search-input/pm-search-input.component';
import { CustomDetailSaveModel } from '../../Models/custom-detail-save.model';

@Component({
  selector: 'm-molecule-collection-detail-toolbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CustomDetailsComponent, PmSearchInputComponent],
  template: `
    <div class="flex flex-col sm:flex-row sm:flex-wrap justify-between items-start sm:items-center pb-8 pt-2 gap-y-4 sm:gap-y-2 sm:gap-x-4">
      <m-custom-details [itemId]="collectionId()" type="name" [value]="name()" badgeName=""
        (onSaving)="rename.emit($event)" />
      <div class="flex flex-wrap items-center justify-start sm:justify-end gap-3 w-full sm:w-auto">
        <button type="button"
          class="relative p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-150"
          title="Crea una nuova collezione a partire da questa (Duplica)"
          aria-label="Duplica collezione" (click)="duplicate.emit()">
          <svg class="size-7 text-slate-700 dark:text-slate-200" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M4 4a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1h-1V4a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h1v1H6a2 2 0 0 1-2-2V4z" />
            <path d="M8 6a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2V6z" />
          </svg>
        </button>
        <button type="button"
          class="relative p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-150"
          title="Elimina collezione" aria-label="Elimina collezione" (click)="delete.emit()">
          <svg class="size-7 text-light-error dark:text-dark-error" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M4.5 6h11M8 6V4.5h4V6m-6.5 0 .7 10h7.6l.7-10M8 9v4.5m4-4.5v4.5" />
          </svg>
        </button>
        <button type="button"
          class="flex items-center gap-2 relative px-3 py-1 rounded-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-150"
          title="Aggiungi nuove molecole alla collezione" aria-label="Aggiungi nuove molecole alla collezione"
          (click)="add.emit()">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-5 w-auto" aria-hidden="true">
            <path d="M336 112L336 96L304 96L304 304L96 304L96 336L304 336L304 544L336 544L336 336L544 336L544 304L336 304L336 112z" />
          </svg>
          <span>Aggiungi nuove molecole</span>
        </button>
      </div>
    </div>
    <m-search-input [value]="search()" (valueChange)="searchChange.emit($event)"
      (submitted)="searchChange.emit($event)" (cleared)="clear.emit()" />
  `
})
export class MoleculeCollectionDetailToolbarComponent {
  readonly collectionId = input('');
  readonly name = input('');
  readonly search = input('');
  readonly rename = output<CustomDetailSaveModel>();
  readonly duplicate = output<void>();
  readonly delete = output<void>();
  readonly add = output<void>();
  readonly searchChange = output<string>();
  readonly clear = output<void>();
}
