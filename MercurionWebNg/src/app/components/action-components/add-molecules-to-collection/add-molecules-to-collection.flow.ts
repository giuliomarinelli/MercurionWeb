import { signal } from '@angular/core';
import { Observable, Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';
import { AddManyChEMBLItemDTO } from '../../../Models/graphql/add-many-chembl-item.dto';
import { MoleculeSearchResult } from '../../../Models/graphql/molecule-search/molecule-search-result.interface';

export type ChipItem = { id: string; name: string };
export type SelectionMode = 'none' | 'all' | 'unselect';

export interface AddMoleculesToCollectionViewState {
  query: string;
  page: number;
  loading: boolean;
  done: boolean;
  selectedIds: string[];
  chips: ChipItem[];
  pending: boolean;
  error: unknown | null;
  result: boolean | null;
}

/** Stable seam for replacing the inherited paginator in the follow-up task. */
export interface AddMoleculesPaginationPort {
  loadMore(): Promise<void>;
  reset(): void;
  query(query: string): void;
  clear(): void;
}

/**
 * Owns identity-based selection independently of the rendered page. The
 * component can therefore replace page results without losing the selection.
 */
export class AddMoleculesSelectionController {
  readonly selectedIds = signal<Set<string>>(new Set());
  readonly excludedIds = signal<Set<string>>(new Set());
  readonly mode = signal<SelectionMode>('none');
  readonly chips = signal<ChipItem[]>([]);

  reset(): void {
    this.selectedIds.set(new Set());
    this.excludedIds.set(new Set());
    this.mode.set('none');
    this.chips.set([]);
  }

  toggle(id: string, checked: boolean): void {
    if (!id) return;
    const next = new Set(this.mode() === 'all' ? this.excludedIds() : this.selectedIds());
    if (this.mode() === 'all') {
      checked ? next.delete(id) : next.add(id);
      this.excludedIds.set(next);
    } else {
      checked ? next.add(id) : next.delete(id);
      this.selectedIds.set(next);
      this.mode.set('none');
    }
  }

  selectAll(): void {
    this.mode.set('all');
    this.excludedIds.set(new Set());
  }

  clearVisibleSelection(): void {
    this.mode.set('unselect');
    this.selectedIds.set(new Set());
    this.excludedIds.set(new Set());
  }

  isSelected(id: string): boolean {
    return this.mode() === 'all'
      ? !this.excludedIds().has(id)
      : this.selectedIds().has(id);
  }

  isNothingSelected(): boolean {
    return this.mode() !== 'all' && this.selectedIds().size === 0;
  }

  isPartiallySelected(ids: string[]): boolean {
    if (ids.length === 0) return false;
    const checked = ids.filter(id => this.isSelected(id)).length;
    return checked > 0 && checked < ids.length;
  }

  addChip(chip: ChipItem): void {
    if (!chip?.id || this.chips().some(item => item.id === chip.id)) return;
    this.chips.update(items => [...items, chip]);
  }

  removeChip(id: string): void {
    this.chips.update(items => items.filter(item => item.id !== id));
  }

  clearChips(): void {
    this.chips.set([]);
  }

  get selectedChemblIds(): string[] {
    return this.chips().map(chip => chip.id);
  }

  buildExistingMoleculePayload(visibleIds: string[]): { itemIds: string[]; selectAll: boolean } {
    if (this.mode() === 'all') {
      return {
        itemIds: visibleIds.filter(id => this.excludedIds().has(id)),
        selectAll: true
      };
    }
    return { itemIds: [...this.selectedIds()], selectAll: false };
  }

  buildChemblPayload(): AddManyChEMBLItemDTO[] {
    return this.chips().map(chip => ({
      chemblMolregno: Number(chip.id),
      name: chip.name
    }));
  }
}

/**
 * Keeps search debounce/concurrency out of the presentational action.
 * switchMap cancels stale requests when the user types a new query.
 */
export class AddMoleculesSearchController {
  readonly query = signal('');
  readonly loading = signal(false);
  readonly results = signal<MoleculeSearchResult[]>([]);
  readonly error = signal<unknown | null>(null);
  readonly empty = signal(true);

  private readonly query$ = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly search: (query: string) => Observable<MoleculeSearchResult[]>
  ) {
    this.query$.pipe(
      debounceTime(100),
      distinctUntilChanged(),
      switchMap(query => {
        if (query.trim().length < 2) {
          this.loading.set(false);
          this.results.set([]);
          this.empty.set(true);
          this.error.set(null);
          return of<MoleculeSearchResult[] | null>(null);
        }
        this.loading.set(true);
        this.empty.set(false);
        this.error.set(null);
        return this.search(query).pipe(
          catchError(error => {
            this.error.set(error);
            return of<MoleculeSearchResult[]>([]);
          })
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(results => {
      if (results === null) return;
      this.results.set(results ?? []);
      this.loading.set(false);
    });
  }

  setQuery(query: string): void {
    this.query.set(query ?? '');
    this.query$.next(query ?? '');
  }

  setResults(results: MoleculeSearchResult[]): void {
    this.error.set(null);
    this.empty.set(false);
    this.results.set(results ?? []);
  }

  setError(error: unknown): void {
    this.empty.set(false);
    this.error.set(error);
    this.results.set([]);
    this.loading.set(false);
  }

  clear(): void {
    this.setQuery('');
    this.loading.set(false);
    this.results.set([]);
    this.empty.set(true);
    this.error.set(null);
  }

  destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.query$.complete();
  }
}

export interface AddMoleculesSubmitPort {
  addManyMoleculesToCollection(collectionId: string, itemIds: string[], selectAll: boolean): Observable<boolean>;
  addManyChEMBLItemsToCollection(collectionId: string, items: AddManyChEMBLItemDTO[]): Observable<boolean>;
}

/** Isolates backend command construction from overlay navigation and rendering. */
export class AddMoleculesSubmitController {
  submitExisting(
    service: AddMoleculesSubmitPort,
    collectionId: string,
    selection: AddMoleculesSelectionController,
    visibleIds: string[]
  ): Observable<boolean> {
    const payload = selection.buildExistingMoleculePayload(visibleIds);
    return service.addManyMoleculesToCollection(collectionId, payload.itemIds, payload.selectAll);
  }

  submitChembl(
    service: AddMoleculesSubmitPort,
    collectionId: string,
    selection: AddMoleculesSelectionController
  ): Observable<boolean> {
    return service.addManyChEMBLItemsToCollection(collectionId, selection.buildChemblPayload());
  }
}
