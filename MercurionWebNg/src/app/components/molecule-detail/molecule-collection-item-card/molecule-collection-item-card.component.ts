import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { MoleculeCardItemModel } from '../../../Models/graphql/molecule-collection/molecule-collection.types';
import { MoleculeSummaryCardComponent } from '../molecule-summary-card/molecule-summary-card.component';
import { moleculeCardToSummary } from '../molecule-summary-card/molecule-summary-card.view-model';
import { DesignService } from '../../../services/design.service';
import { SearchContextService } from '../../../services/context/search-context.service';
import { ShellLayoutService } from '../../../services/context/shell-layout.service';

@Component({
  selector: 'm-molecule-collection-item-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MoleculeSummaryCardComponent],
  host: { class: 'block w-full' },
  template: `<m-molecule-summary-card
    [viewModel]="viewModel()"
    [detailQueryParams]="{ c_id: collectionId() }"
    [disappearing]="triggerDisappear()"
    [collapsed]="collapse()"
    (actionSelected)="handleAction($event)"
    (navigate)="handleNavigate()" />`
})
export class MoleculeCollectionItemCardComponent {
  private readonly design = inject(DesignService);
  private readonly searchContext = inject(SearchContextService);
  private readonly shellLayout = inject(ShellLayoutService);
  readonly molecule = input.required<MoleculeCardItemModel>();
  readonly i = input.required<number>();
  readonly collectionId = input<string | null>(null);
  readonly isReadonly = input(false);
  readonly hideActions = input(false);
  readonly triggerDisappear = input(false);
  readonly collapse = input(false);

  readonly onDelete = output<string>();
  readonly onRemoveFromCollection = output<string>();

  readonly viewModel = computed(() => moleculeCardToSummary(this.molecule(), {
    actions: this.hideActions() || this.isReadonly() ? [] : [
      { kind: 'link', label: 'Duplica', icon: 'duplicate', href: '/molecules/editor', queryParams: { mode: 'duplicate', smiles: this.molecule().smiles } },
      { kind: 'button', label: 'Elimina', icon: 'delete', action: 'delete' },
      ...(this.collectionId() ? [{ kind: 'button' as const, label: 'Rimuovi dalla collezione', icon: 'remove' as const, action: 'remove' as const }] : [])
    ],
    selectable: this.isReadonly(),
    compact: false
  }));

  handleAction(action: 'delete' | 'remove' | 'select'): void {
    if (action === 'delete') this.onDelete.emit(this.molecule().id);
    if (action === 'remove') this.onRemoveFromCollection.emit(this.molecule().id);
  }

  handleNavigate(): void {
    queueMicrotask(() => {
      if (this.design.maxBk('sm')()) this.shellLayout.requestCloseOffCanvas();
      this.searchContext.close();
    });
  }
}
