import { computed, inject, signal } from '@angular/core';
import { Observable, Subject, map, takeUntil } from 'rxjs';
import { MoleculeCollection } from '../../../Models/graphql/molecule-collection/molecule-collection.types';
import { PageModel } from '../../../Models/graphql/page.models';
import { MoleculeCollectionService } from '../../../services/graphql/molecule-collection.service';
import { CollectionPickerInput, CollectionPickerSelection } from './collection-picker.models';
import { addIdentity, removeIdentity } from './collection-rules';

/**
 * Shared collection discovery and identity selection state for action overlays.
 * Domain mutations intentionally remain in the caller.
 */
export class CollectionPickerFacade {
  private readonly collectionService = inject(MoleculeCollectionService);
  private readonly destroyed$ = new Subject<void>();
  private readonly input: CollectionPickerInput;

  readonly query = signal('');
  readonly page = signal(1);
  readonly collections = signal<MoleculeCollection[]>([]);
  readonly loading = signal(false);
  readonly error = signal<unknown | null>(null);
  readonly hasMore = signal(true);
  readonly selectedIds = signal<Set<string>>(new Set());
  readonly excludedIds = signal<Set<string>>(new Set());
  readonly selectAll = signal(false);

  readonly selected = computed<CollectionPickerSelection>(() => {
    const selected = this.selectedIds();
    const excluded = this.excludedIds();
    return {
      ids: [...selected],
      collections: this.collections().filter(collection => selected.has(collection.id)),
      selectAll: this.selectAll(),
      excludedIds: [...excluded]
    };
  });

  constructor(input: CollectionPickerInput) {
    this.input = input;
    this.selectedIds.set(new Set(input.initialSelection ?? []));
  }

  load(reset = false): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    const requestedPage = reset ? 1 : this.page();
    this.fetchPage$(requestedPage, this.query()).subscribe({
      next: result => {
        const previous = reset ? [] : this.collections();
        const seen = new Set<string>();
        this.collections.set([...previous, ...result.items].filter(item => {
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        }));
        this.page.set(result.currentPage + 1);
        this.hasMore.set(result.currentPage < result.totalPages);
      },
      error: error => this.error.set(error),
      complete: () => this.loading.set(false)
    });
  }

  search(query: string): void {
    this.query.set(query ?? '');
    this.page.set(1);
    this.load(true);
  }

  clearSearch(): void {
    this.search('');
  }

  toggle(id: string, checked: boolean): void {
    if (!id) return;
    if (this.selectAll()) {
      this.excludedIds.update(ids => {
        const next = checked
          ? [...ids].filter(existingId => existingId !== id)
          : addIdentity([...ids], id);
        return new Set(next);
      });
      return;
    }
    this.selectedIds.update(ids => {
      const next = checked
        ? addIdentity([...ids], id)
        : removeIdentity([...ids], id);
      return new Set(next);
    });
  }

  setSingleSelection(id: string | null): void {
    this.selectedIds.set(id ? new Set([id]) : new Set());
    this.selectAll.set(false);
  }

  selectAllVisible(): void {
    this.selectAll.set(true);
    this.excludedIds.set(new Set());
  }

  clearSelection(): void {
    this.selectedIds.set(new Set());
    this.excludedIds.set(new Set());
    this.selectAll.set(false);
  }

  create(name: string): Observable<MoleculeCollection> {
    return this.collectionService.createCollection(name).pipe(
      takeUntil(this.destroyed$),
      map(collection => {
        this.collections.update(items => [
          collection,
          ...items.filter(item => item.id !== collection.id)
        ]);
        this.setSingleSelection(collection.id);
        return collection;
      })
    );
  }

  fetchPage$(page: number, query: string): Observable<PageModel<MoleculeCollection>> {
    const mode = this.input.mode;
    const exclude = mode.kind === 'multi';
    const moleculeId = mode.kind === 'multi' ? mode.moleculeId : null;
    return this.collectionService.getPaginatedCollections(
      page,
      this.input.pageSize ?? 12,
      query,
      exclude,
      moleculeId
    ).pipe(takeUntil(this.destroyed$));
  }

  destroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }
}
