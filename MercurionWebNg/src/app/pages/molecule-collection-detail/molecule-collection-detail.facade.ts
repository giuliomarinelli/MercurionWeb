import { computed, DestroyRef, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, distinctUntilChanged, filter, firstValueFrom, map, of, switchMap, tap } from 'rxjs';
import { MoleculeCollectionService } from '../../services/graphql/molecule-collection.service';
import { MoleculeCollectionItemService } from '../../services/graphql/molecule-collection-item.service';
import { DomainInvalidationService } from '../../services/domain-invalidation.service';
import { RealtimeSyncStatusService } from '../../services/realtime-sync-status.service';
import { HistoryContextService } from '../../services/context/history-context.service';
import { ToastService } from '../../services/toast.service';
import { ActionOverlayContextService } from '../../services/context/action-context/action-overlay-context.service';
import { AppTitleService } from '../../services/app-title.service';
import { Helpers } from '../../helpers';
import { MoleculeCardItemModel } from '../../Models/graphql/molecule-collection/molecule-collection.types';
import { PageModel } from '../../Models/graphql/page.models';
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
  private readonly syncStatus = inject(RealtimeSyncStatusService);
  private readonly history = inject(HistoryContextService);
  private readonly toast = inject(ToastService);
  private readonly overlay = inject(ActionOverlayContextService);
  private readonly title = inject(AppTitleService);
  private readonly destroyRef = inject(DestroyRef);

  readonly renamePending = signal(false);
  readonly renameError = signal('');
  readonly renameRevision = signal(0);
  readonly actionPending = signal(false);
  readonly actionError = signal('');
  readonly collectionId = signal('');
  readonly collectionName = signal('');
  readonly search = signal('');
  readonly items = signal<readonly MoleculeCardItemModel[]>([]);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly pageError = signal<string | undefined>(undefined);
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
        this.search.set('');
        this.renameError.set('');
        this.items.set([]);
        this.page.set(1);
        this.done.set(false);
        this.error.set(false);
        this.pageError.set(undefined);
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
      const collectionId = this.collectionId();
      if (!event || event.domain !== 'molecule-collection' ||
          (event.action !== 'molecules-added' && event.action !== 'items-changed') ||
          event.collectionId !== collectionId) return;
      queueMicrotask(() => void this.reload(collectionId));
    });

    effect(() => {
      const event = this.invalidations.last();
      const collectionId = this.collectionId();
      if (!event || !collectionId) return;

      const reconnect = event.domain === 'realtime' && event.action === 'reconcile';
      const remoteCollectionChanged =
        event.domain === 'molecule-collection' &&
        event.action === 'changed' &&
        event.remote === true &&
        (!event.resourceId || event.resourceId === collectionId);
      const remoteDisplayedMoleculeChanged =
        event.domain === 'molecule' &&
        event.action === 'changed' &&
        event.remote === true &&
        // Membership is a snapshot; replacing the list must not replay this event.
        (!event.resourceId || untracked(() => this.items().some(item => item.id === event.resourceId)));

      if (remoteCollectionChanged && event.change === 'deleted') {
        this.toast.trigger('Questa collezione è stata eliminata da un’altra sessione.', 'info', 4500);
        void this.router.navigateByUrl('/molecules/collections');
        return;
      }

      if (remoteCollectionChanged || reconnect) {
        if (remoteCollectionChanged) this.syncStatus.markSynchronized()
        queueMicrotask(() => void this.refreshCollection(collectionId));
        return;
      }
      if (remoteDisplayedMoleculeChanged) {
        this.syncStatus.markSynchronized()
        queueMicrotask(() => void this.reload(collectionId));
      }
    });
  }

  private async refreshCollection(expectedId = this.collectionId()): Promise<void> {
    if (this.destroyRef.destroyed || !expectedId || expectedId !== this.collectionId()) return
    try {
      const collection = await firstValueFrom(this.collections.getCollectionById(expectedId).pipe(takeUntilDestroyed(this.destroyRef)))
      if (this.destroyRef.destroyed || expectedId !== this.collectionId()) return
      if (!collection) {
        this.toast.trigger('Questa collezione non è più disponibile.', 'info', 4500)
        void this.router.navigateByUrl('/molecules/collections')
        return
      }
      this.collectionName.set(collection.name)
      this.title.setSection('Dettaglio Collezione', collection.name)
      await this.reload(expectedId)
    } catch {
      if (!this.destroyRef.destroyed && expectedId === this.collectionId()) this.error.set(true)
    }
  }

  async reload(expectedId = this.collectionId()): Promise<void> {
    if (this.destroyRef.destroyed || !expectedId || expectedId !== this.collectionId()) return;
    const version = ++this.requestVersion;
    this.items.set([]);
    this.page.set(1);
    this.done.set(false);
    this.error.set(false);
    this.pageError.set(undefined);
    this.loading.set(false);
    await this.loadMore(expectedId, version);
  }

  async loadMore(expectedId = this.collectionId(), version = this.requestVersion): Promise<void> {
    if (this.destroyRef.destroyed || !expectedId || expectedId !== this.collectionId() || this.done() || this.loading()) return;
    const requestedPage = this.page();
    this.loading.set(true);
    this.pageError.set(undefined);
    try {
      const result = await firstValueFrom(this.fetchPage(expectedId, requestedPage).pipe(takeUntilDestroyed(this.destroyRef)));
      if (version !== this.requestVersion || expectedId !== this.collectionId()) return;
      if (!result.items.length) {
        this.done.set(true);
        return;
      }
      this.items.update(current => [...current, ...result.items]);
      this.done.set(result.currentPage >= result.totalPages);
      this.page.update(value => value + 1);
    } catch {
      if (!this.destroyRef.destroyed && version === this.requestVersion && expectedId === this.collectionId()) {
        this.pageError.set('Impossibile caricare le molecole. Riprova.');
      }
    } finally {
      if (!this.destroyRef.destroyed && version === this.requestVersion && expectedId === this.collectionId()) this.loading.set(false);
    }
  }

  retryPage(): void {
    this.pageError.set(undefined);
    void this.loadMore();
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
    const query = value.trim();
    if (query === this.search()) return;
    this.search.set(query);
    void this.reload();
  }

  clearSearch(): void {
    this.setSearch('');
  }

  async deleteItem(id: string): Promise<boolean> {
    return this.runAction(async () => {
      const ok = await firstValueFrom(this.itemsService.deleteItem(id).pipe(takeUntilDestroyed(this.destroyRef)));
      if (!ok) throw new Error('Delete failed');
      this.history.triggerRemoveItemFromHistoryView(id);
      this.animateRemoval(id);
      this.toast.trigger('Molecola eliminata.', 'success', 3000);
    });
  }

  async removeItem(id: string): Promise<boolean> {
    const collectionId = this.collectionId();
    return this.runAction(async () => {
      const ok = await firstValueFrom(this.itemsService.removeMoleculeFromCollection(collectionId, id).pipe(takeUntilDestroyed(this.destroyRef)));
      if (!ok) throw new Error('Remove failed');
      this.history.triggerRemoveItemFromHistoryView(id);
      if (collectionId === this.collectionId()) this.animateRemoval(id);
      this.toast.trigger('Molecola rimossa dalla collezione.', 'success', 3000);
    });
  }

  async renameCollection(value: string): Promise<void> {
    const name = value.trim();
    if (this.renamePending() || !name || name === this.collectionName()) return;
    const id = this.collectionId();
    this.renamePending.set(true);
    this.renameError.set('');
    try {
      const result = await firstValueFrom(this.collections.updateCollectionName(id, name).pipe(takeUntilDestroyed(this.destroyRef)));
      if (this.destroyRef.destroyed || id !== this.collectionId()) return;
      this.collectionName.set(result.name);
      this.title.setSection('Dettaglio Collezione', result.name);
      this.renameRevision.update(revision => revision + 1);
      this.toast.trigger('Nome della collezione aggiornato.', 'success', 3000);
      this.history.pollNewItem().pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef)).subscribe();
    } catch (error) {
      if (!this.destroyRef.destroyed && id === this.collectionId()) {
        this.renameError.set(hasApplicationErrorCode(error, ApplicationErrorCode.MOLECULE_COLLECTION_NAME_CONFLICT)
          ? 'Esiste già una collezione con questo nome. Scegli un nome diverso.'
          : 'Impossibile salvare il nome. La modifica resta disponibile: riprova.');
      }
    } finally {
      if (!this.destroyRef.destroyed) this.renamePending.set(false);
    }
  }

  retryCollection(): void {
    this.error.set(false);
    this.loading.set(true);
    void this.refreshCollection().finally(() => {
      if (!this.destroyRef.destroyed) this.loading.set(false);
    });
  }

  private async runAction(action: () => Promise<void>): Promise<boolean> {
    if (this.actionPending()) return false;
    this.actionPending.set(true);
    this.actionError.set('');
    try {
      await action();
      return true;
    } catch {
      if (!this.destroyRef.destroyed) this.actionError.set('Operazione non completata. Riprova.');
      return false;
    } finally {
      if (!this.destroyRef.destroyed) this.actionPending.set(false);
    }
  }

  async duplicateCollection(): Promise<void> {
    if (this.actionPending()) return;
    const id = this.collectionId();
    const ok = await this.runAction(async () => {
      const result = await firstValueFrom(this.collections.duplicateCollection(id).pipe(takeUntilDestroyed(this.destroyRef)));
      this.toast.trigger(`Collezione duplicata: '${result.name}'.`, 'success');
      await this.router.navigateByUrl('/molecules/collections');
    });
    if (!ok && !this.destroyRef.destroyed) this.toast.trigger('Impossibile duplicare la collezione. Riprova.', 'error', 3000);
  }

  async deleteCollection(): Promise<boolean> {
    const id = this.collectionId();
    return this.runAction(async () => {
      const ok = await firstValueFrom(this.collections.deleteCollection(id).pipe(takeUntilDestroyed(this.destroyRef)));
      if (!ok) throw new Error('Delete failed');
      this.history.triggerRemoveItemFromHistoryView(id);
      this.invalidations.publish({ domain: 'molecule-collection', action: 'deleted', collectionId: id });
      this.toast.trigger('Collezione eliminata.', 'success', 3000);
      await this.router.navigateByUrl('/molecules/collections');
    });
  }

  addToCollection(): void {
    queueMicrotask(() => this.overlay.open('AddMoleculesToCollection', {
      collectionId: this.collectionId(), redirectToCollectionPath: false, importFromChembl: false
    }));
  }

  private animateRemoval(id: string): void {
    const item = this.items().find(candidate => candidate.id === id);
    if (!item) return;
    item.triggerDisappear.set(true);
    setTimeout(() => item.collapse.set(true), 120);
    setTimeout(() => {
      this.items.update(current => current.filter(candidate => candidate.id !== id));
    }, 500);
  }
}
