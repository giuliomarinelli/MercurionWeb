import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CustomDetailsComponent } from '../../components/molecule-detail/my-molecule-custom-details/custom-details.component';
import { PmSearchInputComponent } from '../../components/common/pm-search-input/pm-search-input.component';
import { CustomDetailSaveModel } from '../../Models/custom-detail-save.model';

@Component({
  selector: 'm-molecule-collection-detail-toolbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CustomDetailsComponent, PmSearchInputComponent],
  template: `
    <div class="flex flex-col sm:flex-row sm:flex-wrap justify-between items-start sm:items-center pb-8 pt-2 relative -top-14 gap-y-4 sm:gap-y-2 sm:gap-x-4">
      <m-custom-details [itemId]="collectionId()" type="name" [value]="name()" badgeName=""
        (onSaving)="rename.emit($event)" />
      <div class="flex flex-wrap items-center justify-start sm:justify-end gap-3 w-full sm:w-auto">
        <button type="button" class="relative p-1 rounded-md" title="Duplica collezione"
          aria-label="Duplica collezione" (click)="duplicate.emit()">⧉</button>
        <button type="button" class="relative p-1 rounded-md text-light-error dark:text-dark-error"
          title="Elimina collezione" aria-label="Elimina collezione" (click)="delete.emit()">⌫</button>
        <button type="button" class="px-3 py-1 rounded-md border" aria-label="Aggiungi nuove molecole alla collezione"
          (click)="add.emit()">＋ <span>Aggiungi nuove molecole</span></button>
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
