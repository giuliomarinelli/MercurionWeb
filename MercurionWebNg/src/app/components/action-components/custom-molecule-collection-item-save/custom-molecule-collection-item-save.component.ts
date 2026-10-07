import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, OnDestroy, OnInit, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ChemistryRendererService } from '../../../chemistry/chemistry-renderer.service';
import { MoleculeEditorDraftService } from '../../../chemistry/molecule-editor-draft.service';
import { MoleculeCollection } from '../../../Models/graphql/molecule-collection/molecule-collection.types';
import { MoleculeProperties } from '../../../Models/graphql/molecule-properties.model';
import { ActionOverlayContextService } from '../../../services/context/action-context/action-overlay-context.service';
import { CustomMoleculeCollectionItemSaveContextService } from '../../../services/context/action-context/custom-molecule-collection-item-save-context.service';
import { DomainInvalidationService } from '../../../services/domain-invalidation.service';
import { MoleculeJoinService } from '../../../services/graphql/molecule-collection-join.service';
import { ToastService } from '../../../services/toast.service';
import { ApplicationErrorCode, getApplicationErrorCode } from '../../../utils/application-error.util';
import { ActionCardComponent } from '../../common/action-card/action-card.component';
import { ActionFooterComponent } from '../../common/action-footer/action-footer.component';
import { ButtonComponent } from '../../common/button/button.component';
import { SelectCoreComponent } from '../../common/select-core/select-core.component';
import { SelectSelectionChange } from '../../common/select-core/select-core.types';
import { TextareaComponent } from '../../common/textarea/textarea.component';
import { CollectionPickerFacade } from '../collection-picker/collection-picker.facade';
import { validateCollectionName } from '../collection-picker/collection-rules';

@Component({
  selector: 'm-custom-molecule-collection-item-save',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, FormsModule, ActionCardComponent, ActionFooterComponent, ButtonComponent, SelectCoreComponent, TextareaComponent],
  styleUrl: './custom-molecule-collection-item-save.component.css',
  template: `
    <div class="flex justify-center items-start md:items-center px-2 sm:px-4 m-overlay-screen">
      <form class="save-form" autocomplete="off" novalidate aria-labelledby="saveMoleculeHeading" (ngSubmit)="onConfirm()">
        <m-action-card size="standard" labelledBy="saveMoleculeHeading" closeLabel="Chiudi salvataggio molecola"
          [busy]="busy() || propertiesLoading()" [closeDisabled]="busy()" (closed)="close()">
          <h2 action-card-title id="saveMoleculeHeading" class="text-lg font-semibold">Salva come nuova molecola</h2>
          <div action-card-body class="save-body">
            <p class="save-help">{{ saveCtx.mode() === 'edit' ? 'Crea una nuova molecola senza modificare quella di origine.' : 'Scegli una destinazione e dai un nome alla tua molecola.' }} Nome e collezione sono obbligatori.</p>
            <fieldset [disabled]="busy()" class="save-fields">
              <legend class="sr-only">Destinazione e dati della nuova molecola</legend>
              <section class="save-destination" aria-label="Destinazione del salvataggio">
                <span class="save-eyebrow">{{ creatingCollection() ? 'Creazione collezione in corso…' : 'Destinazione' }}</span>
                <strong class="save-destination-name" role="status">{{ selectedCollectionName() || 'Nessuna collezione selezionata' }}</strong>
                <details [open]="destinationExpanded()" (toggle)="onDestinationToggle($event)">
                  <summary #destinationSummary>{{ saveCtx.selectedCollectionId() ? 'Cambia collezione' : 'Scegli o crea una collezione' }}</summary>
                  <m-select-core [items]="collections()" [displayFn]="displayCollection" [valueFn]="valueCollection"
                    label="Collezione di destinazione" ariaLabel="Collezione di destinazione" [required]="true"
                    [hasMore]="hasMore()" [loading]="loading()" [disabled]="busy()" [canCreateNew]="!loadError()"
                    searchPlaceholder="Cerca una collezione…" listMaxHeight="10rem" [selected]="saveCtx.selectedCollectionId()"
                    (searchChange)="onSearchChange($event)" (loadMore)="onScrollEnd()"
                    (selectionChange)="onSelectionChange($event)" (createNew)="onCreateNew($event)" />
                  @if (loadError()) {
                    <div class="save-error" role="alert"><p>Non è stato possibile caricare le collezioni.</p>
                      <m-button variant="outline" (click)="loadCollections(!collections().length)" [disabled]="busy()">Riprova caricamento</m-button>
                    </div>
                  }
                  @if (creationError()) {
                    <div class="save-error" role="alert"><p>{{ creationError() }}</p>
                      @if (failedCreationName()) {
                        <strong>{{ failedCreationName() }}</strong>
                        <m-button variant="outline" (click)="onCreateNew(failedCreationName())" [disabled]="busy()">Riprova creazione</m-button>
                      }
                    </div>
                  }
                </details>
              </section>
              <div class="save-metadata">
                <div class="save-field">
                  <label for="save-molecule-name">Nome molecola <span aria-hidden="true">*</span></label>
                  <input id="save-molecule-name" name="name" type="text" required aria-required="true"
                    [(ngModel)]="nameModel" (blur)="nameTouched = true" [attr.aria-invalid]="nameTouched && !nameModel.trim()"
                    [attr.aria-describedby]="nameTouched && !nameModel.trim() ? 'save-name-error' : 'save-name-hint'" />
                  @if (nameTouched && !nameModel.trim()) { <p id="save-name-error" class="save-validation" role="alert">Inserisci un nome per la molecola.</p> }
                  @else { <p id="save-name-hint" class="save-help">Il nome con cui la ritroverai nella collezione.</p> }
                </div>
                <div class="save-field">
                  <label for="save-molecule-label">Etichetta <span class="save-optional">(facoltativa)</span></label>
                  <input id="save-molecule-label" name="label" type="text" [(ngModel)]="labelModel" aria-describedby="save-label-hint" />
                  <p id="save-label-hint" class="save-help">Un riferimento breve per riconoscerla.</p>
                </div>
              </div>
              <m-textarea [id]="'save-molecule-notes'" name="notes" label="Note (facoltative)" [(ngModel)]="notesModel"
                [disabled]="busy()" [rows]="2" resizeMode="vertical" />
              <section class="save-properties" aria-labelledby="save-properties-heading" [attr.aria-busy]="propertiesLoading()">
                <div class="save-properties-header">
                  <h3 id="save-properties-heading">Proprietà calcolate</h3>
                  <m-button variant="ghost" size="sm" [disabled]="busy()" [loading]="propertiesLoading()" (click)="computeProps()">{{ properties() ? 'Ricalcola' : 'Calcola' }}</m-button>
                </div>
                <div class="save-properties-content">
                  @if (propertiesLoading()) { <p class="save-help" role="status">Calcolo delle proprietà in corso…</p> }
                  @else if (propertiesError()) { <p class="save-help" role="status">Proprietà non disponibili. Puoi riprovare il calcolo oppure salvare senza questi valori.</p> }
                  @else {
                    <dl class="save-property-grid">
                      <div><dt>Peso molecolare</dt><dd>{{ (properties()?.mwFreebase | number:'1.0-2') ?? 'N/D' }} <span>g/mol</span></dd></div>
                      <div><dt>LogP</dt><dd>{{ (properties()?.alogp | number:'1.0-2') ?? 'N/D' }}</dd></div>
                      <div><dt>Superficie polare</dt><dd>{{ (properties()?.psa | number:'1.0-2') ?? 'N/D' }} <span>Å²</span></dd></div>
                      <div><dt>Accettori H (HBA)</dt><dd>{{ properties()?.hba ?? 'N/D' }}</dd></div>
                      <div><dt>Donatori H (HBD)</dt><dd>{{ properties()?.hbd ?? 'N/D' }}</dd></div>
                      <div><dt>Legami rotabili</dt><dd>{{ properties()?.rtb ?? 'N/D' }}</dd></div>
                    </dl>
                  }
                </div>
                <details class="save-structure"><summary>Struttura da salvare (SMILES)</summary><code>{{ saveCtx.smiles() }}</code></details>
              </section>
            </fieldset>
            @if (saveError()) { <div class="save-error" role="alert"><p>{{ saveError() }}</p></div> }
            <p class="save-help save-outcome" role="status">{{ saving() ? 'Salvataggio in corso. Attendi la conferma…' : 'Dopo il salvataggio aprirai il dettaglio della nuova molecola nella collezione scelta.' }}</p>
          </div>
          <m-action-footer action-card-footer>
            <m-button action-footer-secondary variant="outline" [disabled]="busy()" (click)="close()">Annulla</m-button>
            <m-button action-footer-primary type="submit" [disabled]="!canSave()" [loading]="saving()">{{ saving() ? 'Salvataggio…' : 'Salva molecola' }}</m-button>
          </m-action-footer>
        </m-action-card>
      </form>
    </div>
  `
})
export class CustomMoleculeCollectionItemSaveComponent implements OnInit, OnDestroy {
  protected readonly overlayCtx = inject(ActionOverlayContextService);
  protected readonly saveCtx = inject(CustomMoleculeCollectionItemSaveContextService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly destinationSummary = viewChild.required<ElementRef<HTMLElement>>('destinationSummary');
  private readonly sessionId = this.overlayCtx.session('MoleculeCollectionItemSave')?.id ?? -1;
  private readonly picker = new CollectionPickerFacade({ mode: { kind: 'single', operation: 'save', allowCreate: true } });
  private readonly moleculeJoinService = inject(MoleculeJoinService);
  private readonly toast = inject(ToastService);
  private readonly chemistryRenderer = inject(ChemistryRendererService);
  private readonly editorDrafts = inject(MoleculeEditorDraftService);
  private readonly router = inject(Router);
  private readonly invalidations = inject(DomainInvalidationService);
  readonly collections = this.picker.collections;
  readonly hasMore = this.picker.hasMore;
  readonly loading = this.picker.loading;
  readonly loadError = computed(() => Boolean(this.picker.error()));
  readonly selectedCollectionName = signal('');
  readonly destinationExpanded = signal(true);
  readonly creatingCollection = signal(false);
  readonly saving = signal(false);
  readonly busy = computed(() => this.creatingCollection() || this.saving());
  readonly creationError = signal('');
  readonly failedCreationName = signal('');
  readonly saveError = signal('');
  readonly properties = signal<MoleculeProperties | null>(null);
  readonly propertiesLoading = signal(false);
  readonly propertiesError = signal(false);
  nameModel = '';
  nameTouched = false;
  labelModel = '';
  notesModel = '';
  ngOnInit(): void {
    queueMicrotask(() => {
      if (!this.destroyRef.destroyed) { this.picker.load(true); void this.loadProperties(); }
    });
  }
  ngOnDestroy(): void { this.picker.destroy(); }
  async loadProperties(): Promise<void> {
    if (this.propertiesLoading() || this.busy() || this.destroyRef.destroyed) return;
    this.propertiesLoading.set(true);
    this.propertiesError.set(false);
    try {
      const properties = await this.chemistryRenderer.getMoleculeProperties(this.saveCtx.smiles());
      if (!this.destroyRef.destroyed) { this.properties.set(properties); this.propertiesError.set(!properties); }
    } catch {
      if (!this.destroyRef.destroyed) { this.properties.set(null); this.propertiesError.set(true); }
    } finally {
      if (!this.destroyRef.destroyed) this.propertiesLoading.set(false);
    }
  }
  computeProps(): void { void this.loadProperties(); }
  displayCollection(item: Pick<MoleculeCollection, 'name'>): string { return item.name; }
  valueCollection(item: Pick<MoleculeCollection, 'id'>): string { return item.id; }
  loadCollections(reset = false): void { if (!this.busy()) this.picker.load(reset); }
  onSearchChange(term: string): void {
    if (this.busy()) return;
    this.saveCtx.searchTerm.set(term);
    this.picker.search(term);
  }
  onScrollEnd(): void { if (!this.busy() && this.hasMore() && !this.loading()) this.picker.load(); }
  onDestinationToggle(event: Event): void { this.destinationExpanded.set((event.target as HTMLDetailsElement).open); }
  onSelect(item: Pick<MoleculeCollection, 'id' | 'name'>): void {
    if (this.busy()) return;
    this.picker.setSingleSelection(item.id);
    this.saveCtx.selectedCollectionId.set(item.id);
    this.selectedCollectionName.set(item.name);
    this.destinationExpanded.set(false);
    queueMicrotask(() => { if (!this.destroyRef.destroyed) this.destinationSummary().nativeElement.focus(); });
  }
  onSelectionChange(change: SelectSelectionChange<MoleculeCollection, string>): void {
    if (this.busy()) return;
    if (change.item) this.onSelect(change.item);
    else { this.picker.setSingleSelection(null); this.saveCtx.selectedCollectionId.set(null); this.selectedCollectionName.set(''); }
  }
  onCreateNew(name: string): void {
    if (this.busy()) return;
    const result = validateCollectionName(name);
    this.destinationExpanded.set(true);
    if (!result.ok) { this.creationError.set(result.message ?? 'Controlla il nome della collezione.'); this.failedCreationName.set(''); return; }
    this.creationError.set('');
    this.failedCreationName.set('');
    this.creatingCollection.set(true);
    this.overlayCtx.beginSubmit(this.sessionId);
    this.picker.create(result.normalized).subscribe({
      next: collection => {
        this.creatingCollection.set(false);
        this.overlayCtx.submitSucceeded(this.sessionId);
        this.onSelect(collection);
        this.invalidations.publish({ domain: 'molecule-collection', action: 'created', collectionId: collection.id });
        this.toast.trigger('Collezione “' + collection.name + '” creata e selezionata.', 'success');
      },
      error: () => {
        this.creatingCollection.set(false);
        this.overlayCtx.submitFailed(this.sessionId);
        this.failedCreationName.set(result.normalized);
        this.creationError.set('La collezione non è stata creata. Puoi riprovare senza riscrivere il nome.');
      }
    });
  }
  canSave(): boolean {
    return Boolean(this.saveCtx.selectedCollectionId() && this.nameModel.trim() && this.saveCtx.smiles().trim()) && !this.busy() && !this.propertiesLoading();
  }
  onConfirm(): void {
    if (this.busy() || this.propertiesLoading()) return;
    this.nameTouched = true;
    if (!this.canSave()) return;
    const collectionId = this.saveCtx.selectedCollectionId()!;
    const destination = this.selectedCollectionName();
    this.saveError.set('');
    this.saving.set(true);
    this.overlayCtx.beginSubmit(this.sessionId);
    this.moleculeJoinService.addCustomMoleculeToCollection({ collectionId, input: {
      canonicalSmiles: this.saveCtx.smiles(), propertiesJson: JSON.stringify(this.properties()),
      name: this.nameModel.trim(), label: this.labelModel.trim() || undefined, notes: this.notesModel.trim() || undefined
    } }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: reply => {
        this.saving.set(false);
        this.overlayCtx.submitSucceeded(this.sessionId);
        this.editorDrafts.clearCurrent();
        this.invalidations.publish({ domain: 'molecule-collection', action: 'molecules-added', collectionId });
        this.toast.trigger('Molecola salvata in “' + destination + '”.', 'success');
        void this.router.navigate(['/molecules/detail/' + reply.id], { queryParams: { c_id: collectionId } });
        this.overlayCtx.close(this.sessionId);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.overlayCtx.submitFailed(this.sessionId);
        const code = getApplicationErrorCode(error);
        this.saveError.set(code === ApplicationErrorCode.MOLECULE_SMILES_CONFLICT
          ? 'Questa struttura è già presente tra le tue molecole. Puoi associarla a un’altra collezione dal suo dettaglio. I dati inseriti sono conservati.'
          : 'La molecola non è stata salvata. I dati inseriti sono ancora qui: riprova il salvataggio.');
      }
    });
  }
  close(): void { if (!this.busy()) this.overlayCtx.close(this.sessionId); }
}
