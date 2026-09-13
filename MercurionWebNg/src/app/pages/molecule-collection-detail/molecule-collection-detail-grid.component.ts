import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MoleculeCardItemModel } from '../../Models/graphql/molecule-collection/molecule-collection.types';
import { MoleculeCollectionItemCardComponent } from '../../components/molecule-detail/molecule-collection-item-card/molecule-collection-item-card.component';

@Component({
  selector: 'm-molecule-collection-detail-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MoleculeCollectionItemCardComponent],
  template: `
    <div class="mt-px relative -top-8">
      @for (item of items(); track item.id; let i = $index) {
        <m-molecule-collection-item-card [molecule]="item" [i]="i" [collectionId]="collectionId()"
          (onDelete)="delete.emit($event)" (onRemoveFromCollection)="remove.emit($event)" />
      }
    </div>
  `
})
export class MoleculeCollectionDetailGridComponent {
  readonly items = input<readonly MoleculeCardItemModel[]>([]);
  readonly collectionId = input('');
  readonly delete = output<string>();
  readonly remove = output<string>();
}
