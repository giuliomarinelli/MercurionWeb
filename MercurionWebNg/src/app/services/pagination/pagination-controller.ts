import { signal } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { PageModel } from '../../Models/graphql/page.models';

export interface PaginationControllerOptions<T> {
  fetch: (page: number, query: string) => Observable<PageModel<T>>;
  merge?: (current: T[], incoming: T[]) => T[];
}

/**
 * Pure page/cursor coordination for composition-based consumers.
 *
 * The controller deliberately knows nothing about DOM, observers or domain
 * queries. A generation token makes reset/query changes invalidate late
 * responses, while the in-flight guard prevents duplicate appends.
 */
export class PaginationController<T> {
  readonly query = signal('');
  readonly items = signal<T[]>([]);
  readonly loading = signal(false);
  readonly done = signal(false);
  readonly earlyDone = signal(false);
  readonly empty = signal(true);
  readonly error = signal<string | undefined>(undefined);
  readonly page = signal(1);

  private generation = 0;
  private readonly merge: (current: T[], incoming: T[]) => T[];

  constructor(private readonly options: PaginationControllerOptions<T>) {
    this.merge = options.merge ?? ((current, incoming) => [...current, ...incoming]);
  }

  paginationState() {
    return {
      mode: 'infinite' as const,
      hasMore: !this.done(),
      pending: this.loading(),
      empty: this.empty(),
      error: this.error()
    };
  }

  async loadMore(): Promise<void> {
    if (this.loading() || this.done()) return;
    const generation = this.generation;
    const requestedPage = this.page();
    this.loading.set(true);
    this.error.set(undefined);

    try {
      const result = await firstValueFrom(this.options.fetch(requestedPage, this.query()));
      if (generation !== this.generation) return;

      if (result.items.length === 0) {
        this.done.set(true);
        if (requestedPage === 1) this.earlyDone.set(true);
        return;
      }

      this.empty.set(false);
      this.items.set(this.merge(this.items(), result.items));
      this.page.set(requestedPage + 1);
      this.done.set(result.currentPage >= result.totalPages);
    } catch {
      if (generation === this.generation) this.error.set('Unable to load results.');
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }

  retry(): void {
    this.error.set(undefined);
    void this.loadMore();
  }

  reset(query = this.query()): void {
    this.generation++;
    this.query.set(query);
    this.items.set([]);
    this.page.set(1);
    this.done.set(false);
    this.earlyDone.set(false);
    this.empty.set(true);
    this.error.set(undefined);
    this.loading.set(false);
    void this.loadMore();
  }

  setQuery(query: string): void {
    this.reset(query);
  }

  clear(): void {
    this.reset('');
  }

  replaceItems(items: T[]): void {
    this.items.set(items);
  }

  dispose(): void {
    this.generation++;
  }
}
