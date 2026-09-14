import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { InfinitePaginationState } from '../../Models/graphql/page.models';
import { PaginationComponent } from '../../components/common/pagination/pagination.component';
import { SkeletonMoleculeCardComponent } from '../../components/molecule-detail/skeleton-molecule-card/skeleton-molecule-card.component';

@Component({
  selector: 'm-molecule-collection-detail-pagination',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PaginationComponent, SkeletonMoleculeCardComponent],
  template: `
    @if (loading() && !hasItems()) {
      <div class="relative -top-20">@for (i of [0,1,2,3,4]; track i) { <m-skeleton-molecule-card /> }</div>
    } @else {
      <m-pagination
        [state]="paginationState()"
        (loadMoreRequested)="loadMore.emit()"
        (retry)="retry.emit()" />
    }
    @if (empty()) {
      <p class="relative -top-8 text-slate-700 dark:text-slate-200" role="status" aria-live="polite">
        Nessuna molecola in questa collezione.
      </p>
    }
  `
})
export class MoleculeCollectionDetailPaginationComponent {
  readonly loading = input(false);
  readonly hasItems = input(false);
  readonly empty = input(false);
  readonly done = input(false);
  readonly error = input<string | undefined>(undefined);
  readonly loadMore = output<void>();
  readonly retry = output<void>();
  readonly paginationState = computed<InfinitePaginationState>(() => ({
    mode: 'infinite',
    hasMore: !this.done(),
    pending: this.loading(),
    empty: this.empty(),
    error: this.error()
  }));
}
