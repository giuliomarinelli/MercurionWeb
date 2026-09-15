import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MoleculeCardItemModel } from '../../../Models/graphql/molecule-collection/molecule-collection.types';
import { MoleculeSummaryCardComponent } from '../molecule-summary-card/molecule-summary-card.component';
import { moleculeCardToSummary } from '../molecule-summary-card/molecule-summary-card.view-model';

@Component({
  selector: 'm-molecule-collection-item-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MoleculeSummaryCardComponent],
  host: { class: 'block w-full' },
  template: `<m-molecule-summary-card
    [viewModel]="viewModel()"
    (actionSelected)="handleAction($event)"
    (navigate)="onNavigate.emit()" />`
})
export class MoleculeCollectionItemCardComponent {
  readonly molecule = input.required<MoleculeCardItemModel>();
  readonly i = input.required<number>();
  readonly collectionId = input<string | null>(null);
  readonly isReadonly = input(false);
  readonly hideActions = input(false);
  readonly triggerDisappear = input(false);
  readonly collapse = input(false);

  readonly onDelete = output<string>();
  readonly onRemoveFromCollection = output<string>();
  readonly onNavigate = output<void>();

  readonly viewModel = computed(() => moleculeCardToSummary(this.molecule(), {
    actions: this.hideActions() || this.isReadonly() ? [] : [
      { kind: 'link', label: 'Duplica', href: '/molecules/editor', queryParams: { mode: 'duplicate', smiles: this.molecule().smiles } },
      { kind: 'button', label: 'Elimina', action: 'delete' },
      ...(this.collectionId() ? [{ kind: 'button' as const, label: 'Rimuovi dalla collezione', action: 'remove' as const }] : [])
    ],
    selectable: this.isReadonly(),
    compact: false
  }));

  handleAction(action: 'delete' | 'remove' | 'select'): void {
    if (action === 'delete') this.onDelete.emit(this.molecule().id);
    if (action === 'remove') this.onRemoveFromCollection.emit(this.molecule().id);
  }
}
