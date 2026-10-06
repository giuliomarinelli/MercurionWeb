import { Component, ChangeDetectionStrategy, computed, DestroyRef, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActionOverlayContextService } from '../../../services/context/action-context/action-overlay-context.service';
import { SelectCoreComponent } from '../../common/select-core/select-core.component';
import { SelectSelectionChange } from '../../common/select-core/select-core.types';
import { MoleculeCollection } from '../../../Models/graphql/molecule-collection/molecule-collection.types';
import { ActionCardComponent } from '../../common/action-card/action-card.component';
import { ActionFooterComponent } from '../../common/action-footer/action-footer.component';
import { ButtonComponent } from '../../common/button/button.component';
import { CollectionPickerFacade } from '../collection-picker/collection-picker.facade';
import { validateCollectionName } from '../collection-picker/collection-rules';

@Component({
  selector: 'm-select-collection-then-route',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SelectCoreComponent, ActionCardComponent, ActionFooterComponent, ButtonComponent],
  styleUrl: '../collection-picker/collection-action.css',
  template: `
    <div class="flex justify-center items-start md:items-center px-2 sm:px-4 m-overlay-screen">
      <m-action-card size="compact" labelledBy="selectCollectionHeading"
        closeLabel="Chiudi selezione collezione" [busy]="loadingCombo() || loading()"
        [closeDisabled]="loading()" (closed)="close()">
        <h2 action-card-title id="selectCollectionHeading" class="text-lg font-semibold">{{ importFromChembl() ? 'Importa da ChEMBL' : 'Aggiungi molecole' }}</h2>
        <div action-card-body class="collection-action-body">
          <p class="collection-action-intro">Scegli dove salvare le molecole. Nel prossimo passaggio {{ importFromChembl() ? 'potrai cercarle in ChEMBL.' : 'potrai scegliere come aggiungerle.' }}</p>
          <m-select-core [items]="collections()" [displayFn]="displayCollection" [valueFn]="valueCollection"
            label="Collezione di destinazione" ariaLabel="Collezione di destinazione"
            [hasMore]="hasMore()" [loading]="loadingCombo()" [disabled]="loading()"
            [canCreateNew]="!loadError()" searchPlaceholder="Cerca una collezione…" listMaxHeight="12rem"
            [selected]="selectedCollectionId()" (searchChange)="onSearchChange($event)"
            (loadMore)="onScrollEnd()" (selectionChange)="onSelectionChange($event)" (createNew)="onCreateNew($event)" />
          @if (loadError()) {
            <div class="collection-action-error" role="alert"><p>Non è stato possibile caricare le collezioni.</p>
              <m-button variant="outline" (click)="loadCollections(!collections().length)">Riprova caricamento</m-button>
            </div>
          }
          @if (creationError()) {
            <div class="collection-action-error" role="alert"><p>{{ creationError() }}</p>
              @if (failedCreationName()) { <strong>{{ failedCreationName() }}</strong><m-button variant="outline" (click)="onCreateNew(failedCreationName())" [disabled]="loading()">Riprova creazione</m-button> }
            </div>
          }
          <div class="collection-action-summary" role="status">
            <span class="collection-action-eyebrow">{{ loading() ? 'Creazione in corso…' : 'Destinazione' }}</span>
            <strong>{{ selectedCollectionName() || 'Nessuna collezione selezionata' }}</strong>
            <p class="collection-action-help">{{ selectedCollectionId() ? 'Continua per scegliere le molecole da aggiungere.' : 'Scegli una collezione oppure creane una nuova nell’elenco.' }}</p>
          </div>
        </div>
        <m-action-footer action-card-footer>
          <m-button action-footer-secondary variant="outline" [disabled]="loading()" (click)="close()">Annulla</m-button>
          <m-button action-footer-primary [disabled]="!selectedCollectionId() || loadingCombo() || routing()"
            [loading]="loading()" (click)="routeAction()">Continua</m-button>
        </m-action-footer>
      </m-action-card>
    </div>
  `
})
export class SelectCollectionThenRouteComponent implements OnInit, OnDestroy {
  private readonly actionContext = inject(ActionOverlayContextService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sessionId = this.actionContext.session('SelectCollectionThenRoute')?.id ?? -1;
  private readonly picker = new CollectionPickerFacade({ mode: { kind: 'single', operation: 'route', allowCreate: true } });
  readonly collections = this.picker.collections;
  readonly hasMore = this.picker.hasMore;
  readonly loadingCombo = this.picker.loading;
  readonly loadError = computed(() => Boolean(this.picker.error()));
  readonly loading = signal(false);
  readonly routing = signal(false);
  readonly selectedCollectionId = signal('');
  readonly selectedCollectionName = signal('');
  readonly importFromChembl = signal(false);
  readonly creationError = signal('');
  readonly failedCreationName = signal('');

  ngOnInit(): void {
    this.importFromChembl.set(this.actionContext.session('SelectCollectionThenRoute')?.input.importFromChembl ?? false);
    queueMicrotask(() => { if (!this.destroyRef.destroyed) this.picker.load(true); });
  }
  ngOnDestroy(): void { this.picker.destroy(); }
  close(): void { if (!this.loading()) this.actionContext.close(this.sessionId); }
  displayCollection(item: Pick<MoleculeCollection, 'name'>): string { return item.name; }
  valueCollection(item: Pick<MoleculeCollection, 'id'>): string { return item.id; }
  loadCollections(reset = false): void { this.picker.load(reset); }
  onSearchChange(term: string): void { if (!this.loading()) this.picker.search(term); }
  onScrollEnd(): void { if (this.hasMore() && !this.loadingCombo()) this.picker.load(); }
  onSelect(item: Pick<MoleculeCollection, 'id' | 'name'>): void {
    if (this.loading()) return;
    this.picker.setSingleSelection(item.id);
    this.selectedCollectionId.set(item.id);
    this.selectedCollectionName.set(item.name);
  }
  onSelectionChange(change: SelectSelectionChange<MoleculeCollection, string>): void {
    if (change.item) this.onSelect(change.item);
  }
  onCreateNew(name: string): void {
    if (this.loading()) return;
    const result = validateCollectionName(name);
    if (!result.ok) { this.failedCreationName.set(''); this.creationError.set(result.message ?? 'Controlla il nome della collezione.'); return; }
    this.creationError.set('');
    this.failedCreationName.set('');
    this.loading.set(true);
    this.actionContext.beginSubmit(this.sessionId);
    this.picker.create(result.normalized).subscribe({
      next: collection => {
        this.loading.set(false);
        this.actionContext.submitSucceeded(this.sessionId);
        this.onSelect(collection);
      },
      error: () => {
        this.loading.set(false);
        this.actionContext.submitFailed(this.sessionId);
        this.failedCreationName.set(result.normalized);
        this.creationError.set('La collezione non è stata creata. Puoi riprovare senza riscrivere il nome.');
      }
    });
  }
  routeAction(): void {
    if (!this.selectedCollectionId() || this.loading() || this.loadingCombo() || this.routing()) return;
    this.routing.set(true);
    const input = { collectionId: this.selectedCollectionId(), redirectToCollectionPath: this.importFromChembl(), importFromChembl: this.importFromChembl() };
    queueMicrotask(() => {
      if (!this.destroyRef.destroyed && this.actionContext.session('SelectCollectionThenRoute')?.id === this.sessionId) {
        this.actionContext.switchToScope('AddMoleculesToCollection', input);
      }
    });
  }
}
