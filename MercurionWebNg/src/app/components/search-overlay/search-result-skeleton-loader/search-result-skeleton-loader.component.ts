import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SkeletonMoleculeCardComponent } from '../../molecule-detail/skeleton-molecule-card/skeleton-molecule-card.component';

@Component({
  selector: 'm-search-result-skeleton-loader',
  imports: [SkeletonMoleculeCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-2">
      @for (i of [0, 1, 2, 3, 4]; track i) {
        <m-skeleton-molecule-card [compact]="true" [footer]="false" [selectionHint]="selectionHint()" />
      }
    </div>
    <span class="sr-only">Caricamento risultati della ricerca...</span>
  `
})
export class SearchResultSkeletonLoaderComponent {
  readonly selectionHint = input(false);
}
