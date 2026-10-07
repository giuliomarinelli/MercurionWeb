// ============ MoleculeCollectionItemSelectCardComponent =============
import { Component, ChangeDetectionStrategy, model, input, output } from '@angular/core';
import { MoleculeCollectionItemCardComponent } from '../molecule-collection-item-card/molecule-collection-item-card.component';
import { MoleculeCardItemModel } from '../../../Models/graphql/molecule-collection/molecule-collection.types';
import { SelectionControlComponent } from '../../common/selection-control/selection-control.component';

@Component({
  selector: 'm-molecule-collection-item-select-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MoleculeCollectionItemCardComponent,
    SelectionControlComponent
  ],
  host: { class: 'block w-full' },
  template: `
  @if (isSelectAll()) {
    <m-selection-control
      class="font-semibold"
      label="SELEZIONA TUTTI"
      ariaLabel="Seleziona tutte le molecole"
      [checked]="value()"
      [indeterminate]="indeterminate()"
      (changed)="setValue($event)"
    />
  } @else if (molecule(); as item) {
    <div class="group/selection relative mb-3 grid grid-cols-[1.25rem_minmax(0,1fr)] gap-4 items-center w-full transition-transform duration-300 hover:-translate-y-0.5">
      <m-selection-control
        class="absolute inset-0 z-20"
        layout="card"
        [label]="'Seleziona molecola ' + item.name"
        [labelHidden]="true"
        [checked]="value()"
        (changed)="setValue($event)"
      />
      <div class="col-start-2 min-w-0 rounded-2xl" [class.ring-2]="value()" [class.ring-indigo-500]="value()">
        <m-molecule-collection-item-card [molecule]="item" [i]="i()" [isReadonly]="true" [compact]="compact()" />
      </div>
    </div>
  }
  `
})
export class MoleculeCollectionItemSelectCardComponent {
  readonly compact = input(false);
  readonly indeterminate = input(false);                // per lo stato parziale
  readonly molecule = input<MoleculeCardItemModel | null>(null)
  readonly i = input(-1)
  readonly isSelectAll = input(false)

  readonly selectedAll = output<boolean>();

  value = model<boolean>(false)                 // model input per [(value)]
  setValue(value: boolean): void {
    this.value.set(value);
    if (this.isSelectAll()) this.selectedAll.emit(value);
  }

}
