import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ClassicSpinnerComponent } from '../../components/common/classic-spinner/classic-spinner.component';
import { SkeletonMoleculeCardComponent } from '../../components/molecule-detail/skeleton-molecule-card/skeleton-molecule-card.component';

@Component({
  selector: 'm-molecule-collection-detail-pagination',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ClassicSpinnerComponent, SkeletonMoleculeCardComponent],
  template: `
    @if (loading()) {
      @if (hasItems()) {
        <div class="flex justify-center" role="status" aria-live="polite"><m-classic-spinner [size]="60" /></div>
      } @else {
        <div class="relative -top-20">@for (i of [0,1,2,3,4]; track i) { <m-skeleton-molecule-card /> }</div>
      }
    } @else if (empty()) {
      <p class="relative -top-8 text-slate-700 dark:text-slate-200" role="status" aria-live="polite">
        Nessuna molecola in questa collezione.
      </p>
    }
    @if (!done() && !loading()) {
      <button type="button" class="mt-4 rounded-md border px-3 py-1" (click)="loadMore.emit()">
        Carica altre molecole
      </button>
    }
  `
})
export class MoleculeCollectionDetailPaginationComponent {
  readonly loading = input(false);
  readonly hasItems = input(false);
  readonly empty = input(false);
  readonly done = input(false);
  readonly loadMore = output<void>();
}
