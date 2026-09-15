import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MoleculeSearchResult } from '../../../Models/graphql/molecule-search/molecule-search-result.interface';
import { ChipItem } from '../../action-components/add-molecules-to-collection/add-molecules-to-collection.flow';
import { MoleculeSummaryCardComponent } from '../../molecule-detail/molecule-summary-card/molecule-summary-card.component';
import { searchResultToSummary } from '../../molecule-detail/molecule-summary-card/molecule-summary-card.view-model';

@Component({
  selector: 'm-search-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MoleculeSummaryCardComponent],
  template: `<m-molecule-summary-card
    [viewModel]="viewModel()"
    (actionSelected)="doEmitChipItem()"
    (navigate)="navigated.emit()" />`
})
export class SearchResultComponent {
  readonly molecule = input.required<MoleculeSearchResult>();
  readonly query = input('');
  readonly search_excludeAlreadyAdded = input(false);
  readonly onChipItem = output<ChipItem>();
  readonly navigated = output<void>();

  readonly viewModel = computed(() => searchResultToSummary(this.molecule(), {
    actions: this.search_excludeAlreadyAdded()
      ? [{ kind: 'button', label: 'Seleziona', action: 'select' }]
      : [],
    selectable: this.search_excludeAlreadyAdded(),
    compact: true
  }));

  doEmitChipItem(): void {
    const molecule = this.molecule();
    this.onChipItem.emit({
      id: String(molecule.id),
      name: molecule.preferredNameIt ?? molecule.preferredName ?? molecule.synonyms?.find(Boolean) ?? `Lead ${molecule.id}`
    });
  }
}
