import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, EMPTY, defer, of, throwError } from 'rxjs';
import { catchError, distinctUntilChanged, filter, map, mergeMap, switchMap, tap } from 'rxjs/operators';
import { MoleculeService } from '../../services/graphql/molecule.service';
import { MoleculeCollectionItemService } from '../../services/graphql/molecule-collection-item.service';
import { MoleculeCollectionService } from '../../services/graphql/molecule-collection.service';
import { MoleculeDetailItem, MoleculeCollectionItemEntityShort } from '../../Models/graphql/molecule-collection/molecule-collection.types';
import { MoleculeDetailSystem } from '../../Models/graphql/molecule.detail.models';
import { MoleculeSearchResult } from '../../Models/graphql/molecule-search/molecule-search-result.interface';
import { TypeGuardsService } from '../../services/type-guards.service';
import { UserContextService } from '../../services/context/user-context.service';
import { MercurionAiService } from '../../services/mercurion-ai.service';
import { EmbeddingService } from '../../services/embedding.service';
import { AppTitleService } from '../../services/app-title.service';
import { AuthSessionPersistenceService } from '../../services/auth-session-persistence.service';
import { DomainInvalidationService } from '../../services/domain-invalidation.service';
import { HistoryContextService } from '../../services/context/history-context.service';
import { ActionOverlayContextService } from '../../services/context/action-context/action-overlay-context.service';
import { ToastService } from '../../services/toast.service';
import { LoggerService } from '../../services/logger.service';
import { CustomDetailSaveModel } from '../../Models/custom-detail-save.model';
import { ApplicationErrorCode, hasApplicationErrorCode } from '../../utils/application-error.util';

export type MoleculeDetailViewModel = Readonly<{
  item: MoleculeDetailItem;
  kind: 'system' | 'chembl' | 'custom';
  id: string;
  name: string;
  smiles: string;
  chemblId: string | number | null;
  properties: unknown;
  administrationRoutes: unknown;
  synonyms: unknown;
  joins: unknown;
  label: string | null;
  notes: string | null;
}>;

@Injectable({ providedIn: 'root' })
export class MoleculeDetailFacade {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly moleculeService = inject(MoleculeService);
  private readonly itemService = inject(MoleculeCollectionItemService);
  private readonly collectionService = inject(MoleculeCollectionService);
  private readonly typeGuards = inject(TypeGuardsService);
  private readonly userContext = inject(UserContextService);
  private readonly ai = inject(MercurionAiService);
  private readonly embedding = inject(EmbeddingService);
  private readonly title = inject(AppTitleService);
  private readonly persistence = inject(AuthSessionPersistenceService);
  private readonly history = inject(HistoryContextService);
  private readonly overlay = inject(ActionOverlayContextService);
  private readonly toast = inject(ToastService);
  private readonly logger = inject(LoggerService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly uuidV7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  private cached?: MoleculeDetailItem;
  private currentId = '';
  private currentType: 'system' | 'chembl' | 'custom' | undefined;

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly similar = signal<MoleculeSearchResult[]>([]);
  readonly similarLoading = signal(false);
  readonly collectionId = signal('');

  readonly molecule$: Observable<MoleculeDetailItem | null> = this.route.paramMap.pipe(
    map(params => params.get('molId')),
    distinctUntilChanged(),
    tap(id => {
      this.currentId = id ?? '';
      this.loading.set(true);
      this.error.set(false);
    }),
    filter((id): id is string => !!id),
    switchMap(id => this.resolveDetail(id)),
    switchMap(item => item ? this.withInference(item) : of(null)),
    tap(item => {
      this.loading.set(false);
      if (!item) this.error.set(true);
    }),
    catchError((error) => {
      this.error.set(true);
      this.loading.set(false);
      return of(null);
    }),
    takeUntilDestroyed()
  );

  constructor() {
    this.molecule$.subscribe(item => {
      if (!item) return;
      this.currentType = item.type;
      this.loadSimilar(item);
    });

    this.route.queryParamMap.pipe(
      map(params => params.get('c_id') ?? ''),
      distinctUntilChanged(),
      tap(id => this.collectionId.set(id)),
      filter(id => !!id && this.userContext.isLoggedIn()),
      switchMap(id => this.collectionService.getCollectionById(id)),
      takeUntilDestroyed()
    ).subscribe();

  }

  toViewModel(item: MoleculeDetailItem): MoleculeDetailViewModel {
    if (this.typeGuards.isSystemMolecule(item)) {
      return Object.freeze({
        item, kind: 'system', id: String(item.id),
        name: item.preferredNameIt ?? item.preferredName ?? '',
        smiles: item.canonicalSmiles ?? '', chemblId: item.cmbId,
        properties: item.properties, administrationRoutes: item.administrationRoutes,
        synonyms: item.synonyms, joins: [], label: null, notes: null
      });
    }
    if (this.typeGuards.isChemblMolecule(item)) {
      return Object.freeze({
        item, kind: 'chembl', id: item.id,
        name: item.chemblDetails.preferredNameIt ?? item.chemblDetails.preferredName ?? '',
        smiles: item.chemblDetails.canonicalSmiles ?? '', chemblId: item.chemblDetails.cmbId,
        properties: item.chemblDetails.properties, administrationRoutes: item.chemblDetails.administrationRoutes,
        synonyms: item.chemblDetails.synonyms, joins: item.joins, label: item.label ?? null, notes: item.notes ?? null
      });
    }
    const custom = item as any;
    return Object.freeze({
      item, kind: 'custom', id: custom.id, name: custom.name ?? '<Lead sconosciuto>',
      smiles: custom.canonicalSmiles, chemblId: null, properties: custom.properties,
      administrationRoutes: [], synonyms: [], joins: item.joins,
      label: custom.label ?? null, notes: custom.notes ?? null
    });
  }

  private resolveDetail(id: string): Observable<MoleculeDetailItem | null> {
    const uuid = this.uuidV7.test(id);
    if (uuid && !this.userContext.isLoggedIn()) {
      return this.itemService.existsChEMBLMoleculeByUUIDThenGetMolregno(id).pipe(
        tap(molregno => {
          if (molregno) {
            const url = `/molecules/detail/${molregno}`;
            this.persistence.setRedirectState(url);
            void this.router.navigateByUrl(url);
          }
        }),
        mergeMap(molregno => molregno ? EMPTY : defer(() => this.itemService.getItemById(id)))
      );
    }
    if (!uuid && this.userContext.isLoggedIn()) {
      return this.itemService.hasUserChEMBLMoleculeByMolregnoThenGetUUID(Number(id)).pipe(
        switchMap(molUUID => molUUID ? this.router.navigateByUrl(`/molecules/detail/${molUUID}`).then(() => null) : this.fetchByMolregno(id))
      );
    }
    return uuid ? defer(() => this.itemService.getItemById(id)) : this.fetchByMolregno(id);
  }

  private fetchByMolregno(id: string): Observable<MoleculeDetailItem | null> {
    if (this.cached?.id === Number(id)) return of(this.cached);
    return this.moleculeService.getMoleculeByMolregno(id).pipe(
      map(molecule => {
        const item: MoleculeDetailSystem = { ...molecule, type: 'system' };
        this.cached = item;
        return item;
      }),
      catchError(error => {
        if (hasApplicationErrorCode(error, ApplicationErrorCode.MOLECULE_NOT_FOUND)) {
          void this.router.navigateByUrl('/404-not-found');
          return EMPTY;
        }
        this.error.set(true);
        return of(null);
      })
    );
  }

  private withInference(item: MoleculeDetailItem): Observable<MoleculeDetailItem> {
    const vm = this.toViewModel(item);
    this.title.setSection('Molecole', vm.name);
    if (!this.userContext.isLoggedIn()) return of(item);
    return this.ai.t1Inference({ smiles: vm.smiles }).pipe(
      map(t1Inference => ({ ...item, t1Inference }) as MoleculeDetailItem),
      catchError(() => of(item))
    );
  }

  private loadSimilar(item: MoleculeDetailItem): void {
    this.similarLoading.set(true);
    const vm = this.toViewModel(item);
    const molregno = vm.kind === 'system' ? this.currentId :
      vm.kind === 'chembl' ? String((item as any).chemblMolregno) : null;
    if (!molregno) {
      this.similar.set([]);
      this.similarLoading.set(false);
      return;
    }
    this.embedding.getSimilarMolregnos(molregno, 65).pipe(
      switchMap(results => this.moleculeService.getMoleculePreviewsByMolregnos(
        results.map(result => typeof result === 'number' ? String(result) : String(result.molregno))
      )),
      catchError(error => {
        this.logger.error('Failed to load similar molecules', error);
        return of([] as MoleculeSearchResult[]);
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(results => {
      this.similar.set(results);
      this.similarLoading.set(false);
    });
  }

  save(detail: CustomDetailSaveModel): void {
    if (!this.currentId || !this.currentType || this.currentType === 'system') return;
    const request: Observable<unknown> = detail.type === 'label'
      ? this.itemService.updateItemLabel(this.currentId, detail.value, this.currentType as any)
      : detail.type === 'notes'
        ? this.itemService.updateItemNotes(this.currentId, detail.value, this.currentType as any)
        : this.itemService.updateItemName(this.currentId, detail.value, this.currentType as any).pipe(
          switchMap(() => this.history.pollNewItem())
        );
    request.subscribe({
      next: () => this.toast.trigger('Aggiornato correttamente', 'success', 1500),
      error: () => this.toast.trigger('Si è verificato un errore', 'error', 1500)
    });
  }

  delete(id: string): void {
    this.itemService.deleteItem(id).subscribe({
      next: ok => {
        if (!ok) return;
        this.history.triggerRemoveItemFromHistoryView(id);
        this.toast.trigger('Molecola eliminata con successo.', 'success', 2500);
        void this.router.navigateByUrl('/molecules/collections');
      },
      error: () => this.toast.trigger('Si è verificato un errore.', 'error', 2500)
    });
  }

  bindCollections(): void {
    queueMicrotask(() => this.overlay.open('BindCollectionsToMolecule', { moleculeId: this.currentId }));
  }

  markTouched(): void {
    if (!this.currentId || !this.userContext.isLoggedIn()) return;
    this.itemService.markItemAsTouched(this.currentId, '{}').pipe(
      filter(Boolean),
      switchMap(() => this.history.pollNewItem()),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();
  }
}
