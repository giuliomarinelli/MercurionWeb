import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MoleculeSearchResult } from '../../../Models/graphql/molecule-search/molecule-search-result.interface';
import { MoleculeSummaryCardComponent } from '../molecule-summary-card/molecule-summary-card.component';
import { searchResultToSummary } from '../molecule-summary-card/molecule-summary-card.view-model';

@Component({
  selector: 'm-similar-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MoleculeSummaryCardComponent],
  host: { class: 'block w-full' },
  template: `<m-molecule-summary-card [viewModel]="viewModel()" />`
})
export class SimilarItemComponent {
  readonly molecule = input.required<MoleculeSearchResult>();
  readonly i = input.required<number>();

  readonly viewModel = computed(() => searchResultToSummary(this.molecule(), {
    actions: [],
    selectable: false,
    compact: true
  }));
}
