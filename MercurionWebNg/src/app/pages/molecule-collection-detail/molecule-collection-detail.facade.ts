import { computed, DestroyRef, effect, inject, Injectable, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, distinctUntilChanged, filter, firstValueFrom, map, of, switchMap, tap } from 'rxjs';
import { MoleculeCollectionService } from '../../services/graphql/molecule-collection.service';
import { MoleculeCollectionItemService } from '../../services/graphql/molecule-collection-item.service';
import { DomainInvalidationService } from '../../services/domain-invalidation.service';
import { HistoryContextService } from '../../services/context/history-context.service';
import { ToastService } from '../../services/toast.service';
import { ActionOverlayContextService } from '../../services/context/action-context/action-overlay-context.service';
import { AppTitleService } from '../../services/app-title.service';
import { Helpers } from '../../helpers';
import { MoleculeCardItemModel } from '../../Models/graphql/molecule-collection/molecule-collection.types';
import { PageModel } from '../../Models/graphql/page.models';
import { CustomDetailSaveModel } from '../../Models/custom-detail-save.model';
import { ApplicationErrorCode, hasApplicationErrorCode } from '../../utils/application-error.util';

export type CollectionDetailPageState =
  | 'loading'
  | 'error'
  | 'empty'
  | 'content'
  | 'page-pending';

@Injectable()
export class MoleculeCollectionDetailFacade {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly collections = inject(MoleculeCollectionService);
  private readonly itemsService = inject(MoleculeCollectionItemService);
  private readonly invalidations = inject(DomainInvalidationService);
  private readonly history = inject(HistoryContextService);
  private readonly toast = inject(ToastService);
  private readonly overlay = inject(ActionOverlayContextService);
  private readonly title = inject(AppTitleService);
  private readonly destroyRef = inject(DestroyRef);

  readonly collectionId = signal('');
  readonly collectionName = signal('');
  readonly search = signal('');
  readonly items = signal<readonly MoleculeCardItemModel[]>([]);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly done = signal(false);
  readonly page = signal(1);
  readonly pagePending = computed(() => this.loading() && this.items().length > 0);
  readonly state = computed<CollectionDetailPageState>(() => {
    if (this.error()) return 'error';
    if (this.pagePending()) return 'page-pending';
    if (this.loading()) return 'loading';
    if (!this.items().length && this.done()) return 'empty';
    return 'content';
  });

  private requestVersion = 0;

  constructor() {
    this.route.paramMap.pipe(
      map(params => params.get('colId') ?? ''),
      filter(Boolean),
      distinctUntilChanged(),
      tap(id => {
        this.requestVersion++;
        this.collectionId.set(id);
        this.collectionName.set('');
        this.items.set([]);
        this.page.set(1);
        this.done.set(false);
        this.error.set(false);
        this.loading.set(true);
      }),
      switchMap(id => this.collections.getCollectionById(id).pipe(
        map(collection => ({ id, collection })),
        catchError(() => of({ id, collection: null }))
      )),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(({ id, collection }) => {
      if (id !== this.collectionId()) return;
      if (!collection) {
        this.error.set(true);
        this.loading.set(false);
        return;
      }
      this.collectionName.set(collection.name);
      this.title.setSection('Dettaglio Collezione', collection.name);
      void this.reload(id);
    });

    this.route.paramMap.pipe(
      map(params => params.get('colId') ?? ''),
      filter(Boolean),
      distinctUntilChanged(),
      switchMap(id => this.collections.markMoleculeCollectionAsTouched(id).pipe(
        switchMap(result => result ? this.history.pollNewItem() : of(null)),
        map(result => ({ id, result }))
      )),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(({ result }) => {
      if (result == null) void this.router.navigateByUrl('/404-not-found');
    });

    effect(() => {
      const event = this.invalidations.last();
      if (!event || event.domain !== 'molecule-collection' ||
          event.collectionId !== this.collectionId() ||
          (event.action !== 'molecules-added' && event.action !== 'items-changed')) return;
      void this.reload();
    });
  }

  async reload(expectedId = this.collectionId()): Promise<void> {
    if (!expectedId || expectedId !== this.collectionId()) return;
    const version = ++this.requestVersion;
    this.items.set([]);
    this.page.set(1);
    this.done.set(false);
    this.error.set(false);
    await this.loadMore(expectedId, version);
  }

  async loadMore(expectedId = this.collectionId(), version = this.requestVersion): Promise<void> {
    if (!expectedId || expectedId !== this.collectionId() || this.done() || (this.loading() && this.items().length > 0)) return;
    const requestedPage = this.page();
    this.loading.set(true);
    try {
      const result = await firstValueFrom(this.fetchPage(expectedId, requestedPage));
      if (version !== this.requestVersion || expectedId !== this.collectionId()) return;
      if (!result.items.length) {
        this.done.set(true);
        return;
      }
      this.items.update(current => [...current, ...result.items]);
      this.page.update(value => value + 1);
    } catch {
      if (version === this.requestVersion && expectedId === this.collectionId()) this.error.set(true);
    } finally {
      if (version === this.requestVersion && expectedId === this.collectionId()) this.loading.set(false);
    }
  }

  private fetchPage(id: string, page: number) {
    return this.itemsService.getPaginatedItemsForCollection(id, page, 25, this.search()).pipe(
      map(result => ({
        ...result,
        items: result.items.map(item => Helpers.moleculeClientToCardConverter(item))
      } as PageModel<MoleculeCardItemModel>))
    );
  }

  setSearch(value: string): void {
    this.search.set(value);
    void this.reload();
  }

  clearSearch(): void {
    this.setSearch('');
  }

  deleteItem(id: string): void {
    this.itemsService.deleteItem(id).subscribe({
      next: ok => {
        if (!ok) return;
        this.history.triggerRemoveItemFromHistoryView(id);
        this.publishItemsChanged();
      },
      error: () => this.toast.trigger('Si è verificato un errore.', 'error', 2500)
    });
  }

  removeItem(id: string): void {
    const collectionId = this.collectionId();
    this.itemsService.removeMoleculeFromCollection(collectionId, id).subscribe({
      next: ok => {
        if (!ok) {
          this.toast.trigger('Si è verificato un errore', 'error', 3000);
          return;
        }
        this.history.triggerRemoveItemFromHistoryView(id);
        this.publishItemsChanged();
      },
      error: () => this.toast.trigger('Si è verificato un errore', 'error', 3000)
    });
  }

  renameCollection(detail: CustomDetailSaveModel): void {
    this.collections.updateCollectionName(this.collectionId(), detail.value).pipe(
      tap(() => this.collectionName.set(detail.value)),
      switchMap(() => this.history.pollNewItem()),
      catchError(error => {
        if (hasApplicationErrorCode(error, ApplicationErrorCode.MOLECULE_COLLECTION_NAME_CONFLICT)) {
          this.toast.trigger('Questo nome esiiste già. Impossibile rinominare!', 'error', 3000);
          return of(null);
        }
        this.toast.trigger('Si è verificato un errore.', 'error', 2500);
        return of(null);
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();
  }

  duplicateCollection(): void {
    this.collections.duplicateCollection(this.collectionId()).subscribe({
      next: result => {
        void this.router.navigateByUrl('molecules/collections');
        this.toast.trigger(`Collezione duplicata con successo. Nuova collezione: '${result.name}'`, 'success');
      },
      error: () => this.toast.trigger('Si è verificato un errore inaspettato. Se si ripete, contatta il supporto.', 'error')
    });
  }

  deleteCollection(): void {
    this.collections.deleteCollection(this.collectionId()).subscribe({
      next: ok => {
        if (!ok) {
          this.toast.trigger('Si è verificato un errore.', 'error', 3000);
          return;
        }
        this.history.triggerRemoveItemFromHistoryView(this.collectionId());
        this.invalidations.publish({ domain: 'molecule-collection', action: 'deleted', collectionId: this.collectionId() });
        this.toast.trigger('Collezione eliminata con successo.', 'success', 3000);
        void this.router.navigateByUrl('/molecules/collections');
      },
      error: () => this.toast.trigger('Si è verificato un errore.', 'error', 3000)
    });
  }

  addToCollection(): void {
    queueMicrotask(() => this.overlay.open('AddMoleculesToCollection', {
      collectionId: this.collectionId(), redirectToCollectionPath: false, importFromChembl: false
    }));
  }

  private publishItemsChanged(): void {
    this.invalidations.publish({
      domain: 'molecule-collection',
      action: 'items-changed',
      collectionId: this.collectionId()
    });
  }
}
