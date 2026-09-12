import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';

import {
  InfinitePaginationState,
  PagePaginationState,
  PaginationState,
} from '../../../Models/graphql/page.models';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'm-pagination',
  standalone: true,
  imports: [ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (state().mode === 'page') {
      <nav class="m-pagination" aria-label="Pagination">
        <m-button
          variant="outline"
          size="sm"
          [disabled]="!canGoPrevious()"
          ariaLabel="Previous page"
          (pressed)="goPrevious()">
          Previous
        </m-button>
        <div class="m-pagination__pages" aria-label="Pages">
          @for (page of pages(); track page) {
            <m-button
              variant="ghost"
              size="sm"
              [disabled]="isCurrentPage(page)"
              [ariaLabel]="'Page ' + page"
              [ariaCurrent]="isCurrentPage(page) ? 'page' : null"
              (pressed)="goTo(page)">
              {{ page }}
            </m-button>
          }
        </div>
        <m-button
          variant="outline"
          size="sm"
          [disabled]="!canGoNext()"
          ariaLabel="Next page"
          (pressed)="goNext()">
          Next
        </m-button>
      </nav>
    } @else {
      @if (infiniteState().error) {
        <div class="m-pagination__error" role="alert" aria-live="assertive">
          <span>{{ infiniteState().error }}</span>
          <m-button
            variant="outline"
            size="sm"
            ariaLabel="Retry loading results"
            (pressed)="retry.emit()">
            Retry
          </m-button>
        </div>
      } @else if (infiniteState().hasMore) {
        <m-button
          variant="outline"
          [loading]="infiniteState().pending"
          [disabled]="infiniteState().pending"
          ariaLabel="Load more results"
          (pressed)="loadMore()">
          {{ infiniteState().pending ? 'Loading…' : 'Load more' }}
        </m-button>
      } @else if (!infiniteState().empty) {
        <p class="m-pagination__end" role="status" aria-live="polite">End of results</p>
      }
    }
  `,
  styles: `
    :host { display: block; }
    .m-pagination {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      justify-content: center;
      padding: 1rem 0;
    }
    .m-pagination__pages { display: flex; flex-wrap: wrap; gap: 0.25rem; }
    .m-pagination__error {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      justify-content: center;
      padding: 1rem;
      color: #b91c1c;
    }
    .m-pagination__end { margin: 0; text-align: center; }
  `,
})
export class PaginationComponent {
  readonly state = input.required<PaginationState>();
  readonly pageChange = output<number>();
  readonly loadMoreRequested = output<void>();
  readonly retry = output<void>();

  protected readonly pages = computed(() => {
    const state = this.state();
    return state.mode === 'page'
      ? Array.from({ length: state.totalPages }, (_, index) => index + 1)
      : [];
  });

  protected canGoPrevious(): boolean {
    const state = this.pageState();
    return !state.pending && state.currentPage > 1;
  }

  protected canGoNext(): boolean {
    const state = this.pageState();
    return !state.pending && state.currentPage < state.totalPages;
  }

  protected isCurrentPage(page: number): boolean {
    const state = this.pageState();
    return state.currentPage === page;
  }

  protected goPrevious(): void {
    if (this.canGoPrevious()) this.pageChange.emit(this.pageState().currentPage - 1);
  }

  protected goNext(): void {
    if (this.canGoNext()) this.pageChange.emit(this.pageState().currentPage + 1);
  }

  protected goTo(page: number): void {
    const state = this.pageState();
    if (!state.pending && page !== state.currentPage) this.pageChange.emit(page);
  }

  protected loadMore(): void {
    const state = this.infiniteState();
    if (!state.pending && state.hasMore && !state.error) this.loadMoreRequested.emit();
  }

  private pageState(): PagePaginationState {
    const state = this.state();
    if (state.mode !== 'page') throw new Error('Page controls require page pagination state');
    return state;
  }

  protected infiniteState(): InfinitePaginationState {
    const state = this.state();
    if (state.mode !== 'infinite') throw new Error('Load-more controls require infinite pagination state');
    return state;
  }
}
