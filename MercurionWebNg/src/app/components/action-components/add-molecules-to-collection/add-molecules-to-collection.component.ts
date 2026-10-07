import {
  AfterViewInit,
  computed,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  OnInit,
  inject,
  signal,
  effect,
  untracked,
  ChangeDetectionStrategy,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PaginationController } from '../../../services/pagination/pagination-controller';
import { debounceTime, map, Subscription, take } from 'rxjs';
import { ActionOverlayContextService } from '../../../services/context/action-context/action-overlay-context.service';
import { MoleculeCollectionItemService } from '../../../services/graphql/molecule-collection-item.service';
import { Helpers } from '../../../helpers';
import {
  MoleculeCardItemModel,
  MoleculeCollection,
} from '../../../Models/graphql/molecule-collection/molecule-collection.types';
import { PageModel } from '../../../Models/graphql/page.models';
import { PmSearchInputComponent } from '../../common/pm-search-input/pm-search-input.component';
import { MoleculeCollectionItemSelectCardComponent } from '../../molecule-detail/molecule-collection-item-select-card/molecule-collection-item-select-card.component';
import { ProgressIndicatorComponent } from '../../common/progress-indicator/progress-indicator.component';
import { SkeletonMoleculeCardComponent } from '../../molecule-detail/skeleton-molecule-card/skeleton-molecule-card.component';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MoleculeSearchResult } from '../../../Models/graphql/molecule-search/molecule-search-result.interface';
import { SearchResultSkeletonLoaderComponent } from '../../search-overlay/search-result-skeleton-loader/search-result-skeleton-loader.component';
import { SearchResultComponent } from '../../search-overlay/search-result/search-result.component';
import { AddMoleculesToCollectionContextService } from '../../../services/context/action-context/add-molecules-to-collection-context.service';
import { DomainInvalidationService } from '../../../services/domain-invalidation.service';
import { MoleculeCollectionService } from '../../../services/graphql/molecule-collection.service';
import { ToastService } from '../../../services/toast.service';
import { Router } from '@angular/router';
import { MoleculeSearchService } from '../../../services/graphql/molecule-search.service';
import {
  AddMoleculesSearchController,
  AddMoleculesPaginationPort,
  AddMoleculesSelectionController,
  AddMoleculesSubmitController,
  type ChipItem,
} from './add-molecules-to-collection.flow';
import { AbstractMultiselectItem } from '../../../Models/abstract.models';
import { ActionCardComponent } from '../../common/action-card/action-card.component';
import { ActionFooterComponent } from '../../common/action-footer/action-footer.component';
import { ButtonComponent } from '../../common/button/button.component';
import { ViewportRuntimeService } from '../../../services/context/viewport-runtime.service';
export type { ChipItem } from './add-molecules-to-collection.flow';

@Component({
  selector: 'm-add-molecules-to-collection',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PmSearchInputComponent,
    MoleculeCollectionItemSelectCardComponent,
    ProgressIndicatorComponent,
    SkeletonMoleculeCardComponent,
    ReactiveFormsModule,
    SearchResultSkeletonLoaderComponent,
    SearchResultComponent,
    ActionCardComponent,
    ActionFooterComponent,
    ButtonComponent,
  ],
  styleUrl: './add-molecules-to-collection.component.css',
  template: ` <div
    class="m-overlay-screen flex justify-center items-stretch md:items-center px-2 sm:px-4"
  >
    <m-action-card
      size="wide"
      labelledBy="addMolHeading"
      closeLabel="Chiudi pannello aggiungi molecole"
      [busy]="step_12_loading()"
      [closeDisabled]="step_12_loading()"
      (closed)="close()"
    >
      <h2 action-card-title id="addMolHeading" class="add-heading">
        <svg viewBox="0 0 640 640" aria-hidden="true">
          <path
            d="M288 96L352 144L576 144L576 512L64 512L64 96L288 96zM352 176L341.3 176L332.8 169.6L277.3 128L96 128L96 480L544 480L544 176L352 176zM304 408L304 336L232 336L232 304L304 304L304 232L336 232L336 304L408 304L408 336L336 336L336 408L304 408z"
          /></svg
        >Aggiungi molecole
      </h2>
      <div action-card-body class="add-body" #scrollRoot>
        <div class="add-destination">
          <span class="add-eyebrow">Collezione di destinazione</span
          ><strong>{{
            collection()?.name || 'Caricamento collezione…'
          }}</strong>
        </div>
        <p class="add-intro">
          Le selezioni sono conservate tra le sorgenti. Aggiungi solo quelle
          della sorgente attiva.
        </p>
        <fieldset class="add-source" [disabled]="step_12_loading()">
          <legend class="add-label">Sorgente</legend>
          <label [class.add-source-active]="method() === 'my'"
            ><input
              type="radio"
              name="method"
              value="my"
              [formControl]="methodControl"
            /><span
              ><strong>Le mie molecole</strong
              ><small>Già salvate nel tuo spazio</small></span
            ></label
          >
          <label [class.add-source-active]="method() === 'chembl'"
            ><input
              type="radio"
              name="method"
              value="chembl"
              [formControl]="methodControl"
            /><span
              ><strong>ChEMBL</strong
              ><small>Cerca nel database scientifico</small></span
            ></label
          >
        </fieldset>
        <fieldset
          class="add-workspace"
          [disabled]="step_12_loading()"
          [attr.inert]="step_12_loading() ? '' : null"
        >
          <legend class="sr-only">Ricerca e selezione molecole</legend>
          @if (method() === 'my') {
            <m-search-input
              [value]="searchTerm()"
              ariaLabel="Cerca tra le mie molecole"
              placeholder="Cerca tra le mie molecole…"
              [disabled]="step_12_loading()"
              (valueChange)="doQuery($event)"
              (cleared)="doClear()"
            />
            <details class="add-bulk-tools" [open]="!viewport.overlayCompact()">
              <summary>Selezione multipla</summary>
            <div class="add-selection-bar">
              @if (multiselectItems().length) {
                <m-molecule-collection-item-select-card
                  [isSelectAll]="true"
                  [value]="isSelectedAll()"
                  [indeterminate]="isPartiallySelected()"
                  (selectedAll)="onSelectAllChange($event)"
                />
              }
              @if (!isSelectedNothing()) {
                <button
                  class="add-text-button"
                  type="button"
                  (click)="clearSelections()"
                >
                  Azzera selezione
                </button>
              }
            </div>
            <p class="add-hint">
              “Seleziona tutti” include tutte le molecole disponibili, anche
              fuori dai risultati della ricerca. Quelle già presenti nella
              collezione sono escluse.
            </p>
            </details>
            <div
              class="add-results"
              aria-label="Molecole disponibili"
              [attr.aria-busy]="loading"
            >
              @for (
                row of multiselectItems();
                track row.item.id;
                let i = $index
              ) {
                <m-molecule-collection-item-select-card
                  [molecule]="row.item"
                  [compact]="viewport.overlayCompact()"
                  [i]="i"
                  [value]="row.isChecked()"
                  (valueChange)="row.isChecked.set($event); toggleOne(row)"
                />
              }
              @if (loading) {
                <div role="status">
                  <span class="sr-only">Caricamento molecole…</span>
                  @if (page > 1) {
                    <m-progress-indicator />
                  } @else {
                    @for (i of [0, 1]; track i) {
                      <m-skeleton-molecule-card />
                    }
                  }
                </div>
              } @else if (paginationState().error) {
                <div class="add-state add-error" role="alert">
                  <strong>Impossibile caricare le molecole.</strong>
                  <p>Le selezioni sono conservate. Riprova per continuare.</p>
                  <m-button variant="secondary" (click)="retryPagination()"
                    >Riprova caricamento</m-button
                  >
                </div>
              } @else if (empty() && (earlyDone || done)) {
                <div class="add-state" role="status">
                  <strong>{{
                    searchTerm()
                      ? 'Nessuna molecola corrisponde alla ricerca.'
                      : 'Nessuna molecola da aggiungere.'
                  }}</strong>
                  <p>
                    {{
                      searchTerm()
                        ? 'Prova un altro nome o cancella la ricerca.'
                        : 'Le molecole salvate sono già presenti qui. Puoi cercarne altre su ChEMBL.'
                    }}
                  </p>
                  @if (searchTerm()) {
                    <m-button variant="secondary" (click)="doClear()"
                      >Cancella ricerca</m-button
                    >
                  }
                </div>
              }
            </div>
            <div #sentinel class="add-sentinel"></div>
            @if (
              !done &&
              !loading &&
              !paginationState().error &&
              multiselectItems().length
            ) {
              <m-button variant="secondary" (click)="loadMore()"
                >Carica altre molecole</m-button
              >
            }
          } @else {
            <m-search-input
              [value]="chemblQuery()"
              ariaLabel="Cerca molecole su ChEMBL"
              placeholder="Nome, identificativo o SMILES…"
              [disabled]="step_12_loading()"
              (valueChange)="onChemblQuery($event)"
              (cleared)="onEmpty()"
            />
            <p class="add-hint">
              Scrivi almeno 2 caratteri. Le molecole già presenti nella
              collezione sono escluse dai risultati.
            </p>
            @if (selectedMolecules.length) {
              <details class="add-selected" [open]="!viewport.overlayCompact()">
                <summary>
                  {{ selectedMolecules.length }}
                  {{
                    selectedMolecules.length === 1
                      ? 'molecola selezionata'
                      : 'molecole selezionate'
                  }}
                  su ChEMBL
                </summary>
                <ul class="add-chips" aria-label="Molecole selezionate">
                  @for (m of selectedMolecules; track m.id) {
                    <li>
                      <span>{{ m.name }}</span
                      ><button
                        type="button"
                        (click)="removeChip(m.id)"
                        [attr.aria-label]="'Rimuovi ' + m.name"
                      >
                        <svg viewBox="0 0 20 20" aria-hidden="true">
                          <path d="M6 6l8 8M14 6l-8 8" />
                        </svg>
                      </button>
                    </li>
                  }
                </ul>
                <button
                  type="button"
                  class="add-text-button"
                  (click)="clearChips()"
                >
                  Azzera selezione ChEMBL
                </button>
              </details>
            }
            <div
              class="add-results"
              aria-label="Risultati ricerca ChEMBL"
              [attr.aria-busy]="chemblLoading()"
            >
              @if (chemblLoading()) {
                <div role="status">
                  <span class="sr-only">Ricerca su ChEMBL in corso…</span
                  ><m-search-result-skeleton-loader />
                </div>
              } @else if (chemblError()) {
                <div class="add-state add-error" role="alert">
                  <strong>Ricerca ChEMBL non disponibile.</strong>
                  <p>Le selezioni sono conservate. Riprova tra un momento.</p>
                  <m-button variant="secondary" (click)="retryChembl()"
                    >Riprova ricerca</m-button
                  >
                </div>
              } @else if (chemblEmpty()) {
                <div class="add-state" role="status">
                  <strong>Trova le prossime molecole.</strong>
                  <p>
                    Cerca su ChEMBL, poi seleziona i risultati da aggiungere.
                  </p>
                </div>
              } @else if (!chemblResults().length) {
                <div class="add-state" role="status">
                  <strong>Nessun risultato per “{{ chemblQuery() }}”.</strong>
                  <p>
                    Prova un altro nome, identificativo o una struttura SMILES.
                  </p>
                </div>
              } @else {
                <p class="add-results-count">
                  {{ chemblResults().length }} risultati · Seleziona una scheda
                  per aggiungerla alla selezione
                </p>
                @for (mol of chemblResults(); track mol.id) {
                  <div
                    class="add-result"
                    [class.add-result-selected]="isChemblSelected(mol.id)"
                  >
                    <m-search-result
                      [molecule]="mol"
                      [query]="chemblQuery()"
                      [search_excludeAlreadyAdded]="true"
                      [selected]="isChemblSelected(mol.id)"
                      (onChipItem)="addChip($event)"
                    />
                  </div>
                }
              }
            </div>
          }
        </fieldset>
      </div>
      <div action-card-footer class="add-footer">
        <div
          action-footer-info
          class="add-footer-info"
          role="status"
          aria-live="polite"
        >
          {{
            step_12_loading()
              ? 'Aggiunta in corso. Attendi la conferma…'
              : selectionSummary()
          }}
        </div>
        @if (error()) {
          <p action-footer-info class="add-error-message" role="alert">
            Non è stato possibile aggiungere le molecole. Le selezioni sono
            conservate: puoi riprovare.
          </p>
        }
        <m-action-footer
          ><m-button
            action-footer-secondary
            variant="secondary"
            [disabled]="step_12_loading()"
            (click)="close()"
            >Annulla</m-button
          >
          <m-button
            action-footer-primary
            variant="primary"
            [disabled]="!canSubmit()"
            [loading]="step_12_loading()"
            ariaLabel="Aggiungi molecole selezionate"
            (click)="dispatchSubmit()"
            >{{ error() ? 'Riprova aggiunta' : 'Aggiungi molecole' }}</m-button
          >
        </m-action-footer>
      </div>
    </m-action-card>
  </div>`,
})
export class AddMoleculesToCollectionComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  private readonly actionOverlayContext = inject(ActionOverlayContextService);
  private readonly addContext = inject(AddMoleculesToCollectionContextService);
  protected readonly viewport = inject(ViewportRuntimeService);
  private readonly sessionId =
    this.actionOverlayContext.session('AddMoleculesToCollection')?.id ?? -1;
  private readonly invalidation = inject(DomainInvalidationService);
  private readonly moleculeCollectionItemService = inject(
    MoleculeCollectionItemService,
  );
  private readonly moleculeCollectionService = inject(
    MoleculeCollectionService,
  );
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly moleculeSearchService = inject(MoleculeSearchService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly selection = new AddMoleculesSelectionController();
  private readonly pageController =
    new PaginationController<MoleculeCardItemModel>({
      fetch: (page, query) =>
        this.moleculeCollectionItemService
          .getAllPaginatedItems(
            page,
            20,
            query,
            true,
            this.addContext.collectionId(),
          )
          .pipe(
            debounceTime(100),
            map((result) => ({
              ...result,
              items: result.items.map((mol) =>
                Helpers.moleculeClientToCardConverter(mol),
              ),
            })),
          ),
    });
  private readonly submitController = new AddMoleculesSubmitController();
  private readonly chemblSearch = new AddMoleculesSearchController((query) => {
    const collectionId = this.addContext.collectionId();
    return collectionId
      ? this.moleculeCollectionItemService.searchChemblMolecules_excludeAlreadyAdded(
          query,
          collectionId,
          100,
        )
      : this.moleculeSearchService.searchMolecule(query, 100);
  });
  readonly pagination: AddMoleculesPaginationPort = {
    loadMore: () => this.loadMore(),
    reset: () => this.resetPagination(),
    query: (query) => this.query(query),
    clear: () => this.clear(),
  };
  readonly multiselectItems = signal<
    AbstractMultiselectItem<MoleculeCardItemModel>[]
  >([]);
  readonly isSelectedAll = computed(
    () =>
      this.selection.mode() === 'all' &&
      this.selection.excludedIds().size === 0,
  );
  readonly isSelectedNothing = computed(() =>
    this.selection.isNothingSelected(),
  );
  readonly isPartiallySelected = computed(() =>
    this.selection.isPartiallySelected(),
  );
  get items(): MoleculeCardItemModel[] {
    return this.pageController.items();
  }
  get loading(): boolean {
    return this.pageController.loading();
  }
  get done(): boolean {
    return this.pageController.done();
  }
  get earlyDone(): boolean {
    return this.pageController.earlyDone();
  }
  get page(): number {
    return this.pageController.page();
  }
  get empty(): ReturnType<typeof signal<boolean>> {
    return this.pageController.empty;
  }
  get searchTerm(): ReturnType<typeof signal<string>> {
    return this.pageController.query;
  }

  private ctrlSub?: Subscription;
  private suSub1?: Subscription;
  private suSub2?: Subscription;
  private metCtrlSub?: Subscription;
  private colSub?: Subscription;

  step = signal<1 | 2>(1);
  step_12_loading = signal<boolean>(false);
  error = signal<boolean>(false);
  methodControl = new FormControl<'my' | 'chembl'>('my', { nonNullable: true });
  method = signal<'my' | 'chembl'>('my');
  collection = signal<MoleculeCollection | null>(null);

  protected readonly root = viewChild<ElementRef<HTMLDivElement>>('scrollRoot');
  protected readonly sentinel =
    viewChild<ElementRef<HTMLDivElement>>('sentinel');
  private observer?: IntersectionObserver;

  constructor() {
    effect(() => {
      this.pageController.items();
      queueMicrotask(() => {
        if (!this.destroyRef.destroyed && this.method() === 'my')
          this.loadRows();
      });
    });
    effect(() => {
      const method = this.method();
      untracked(() => {
        this.observer?.disconnect();
        this.chemblSearch.clear();
        this.step.set(1);
        if (method === 'my') {
          queueMicrotask(() => {
            if (this.destroyRef.destroyed || this.method() !== 'my') return;
            this.pagination.reset();
            this.startObserver();
          });
        } else {
          this.multiselectItems.set([]);
          this.pageController.suspend();
        }
      });
    });
  }

  private readonly _rearmOnStep = effect(() => {
    this.viewport.visualWidth();
    this.viewport.overlayCompact();
    if (this.step() === 1) {
      queueMicrotask(() => this.startObserver());
    } else {
      this.observer?.disconnect();
    }
  });

  ngOnInit(): void {
    const ifc = this.addContext.importFromChembl();
    const defaultMethod = ifc ? 'chembl' : 'my';
    this.method.set(defaultMethod);
    this.methodControl = new FormControl<'my' | 'chembl'>(defaultMethod, {
      nonNullable: true,
    });
    this.metCtrlSub = this.methodControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((val) => this.method.set(val));
    queueMicrotask(() => {
      const collectionId = this.addContext.collectionId();
      if (!collectionId) {
        this.close();
        return;
      }
      this.colSub = this.moleculeCollectionService
        .getCollectionById(collectionId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (col) => this.collection.set(col),
          error: () =>
            queueMicrotask(() => {
              this.close();
              this.toast.trigger(
                'Si è verificato un errore. Se si ripete, contatta il supporto',
                'error',
                3000,
              );
            }),
        });
    });
  }

  ngAfterViewInit(): void {
    queueMicrotask(() => this.startObserver());
  }

  ngOnDestroy(): void {
    this.ctrlSub?.unsubscribe();
    this.suSub1?.unsubscribe();
    this.suSub2?.unsubscribe();
    this.observer?.disconnect();
    this.pageController.dispose();
    this.colSub?.unsubscribe();
    this.metCtrlSub?.unsubscribe();
    this.chemblSearch.destroy();
    this.selection.reset();
  }

  toggleOne(visibleItem: AbstractMultiselectItem<MoleculeCardItemModel>): void {
    if (this.step_12_loading()) return;
    this.selection.toggle(visibleItem.item.id, visibleItem.isChecked());
  }

  onSelectAllChange(checked: boolean): void {
    if (this.step_12_loading()) return;
    if (checked) {
      this.selection.selectAll();
    } else {
      this.selection.clearVisibleSelection();
    }
    this.multiselectItems().forEach((row) => row.isChecked.set(checked));
  }

  clearSelections(): void {
    if (this.step_12_loading()) return;
    this.selection.clearVisibleSelection();
    this.multiselectItems().forEach((row) => row.isChecked.set(false));
  }

  doQuery(q: string): void {
    if (this.step_12_loading() || q === this.searchTerm()) return;
    this.multiselectItems.set([]);
    this.pageController.setQuery(q);
  }
  doClear(): void {
    if (this.step_12_loading() || !this.searchTerm()) return;
    this.multiselectItems.set([]);
    this.pageController.clear();
  }
  private loadRows(): void {
    const existing = new Map(
      this.multiselectItems().map((row) => [row.item.id, row]),
    );
    this.multiselectItems.set(
      this.items.map(
        (item) =>
          existing.get(item.id) ?? {
            item,
            isChecked: signal(this.selection.isSelected(item.id)),
          },
      ),
    );
  }
  loadMore(): Promise<void> {
    return this.pageController.loadMore().then(() => {
      if (!this.destroyRef.destroyed && this.method() === 'my') this.loadRows();
    });
  }
  resetPagination(): void {
    this.pageController.reset();
    this.multiselectItems.set([]);
  }
  query(q: string): void {
    this.doQuery(q);
  }
  clear(): void {
    this.doClear();
  }
  paginationState() {
    return this.pageController.paginationState();
  }
  retryPagination(): void {
    this.pageController.retry();
  }
  private startObserver(): void {
    if (
      this.destroyRef.destroyed ||
      this.step_12_loading() ||
      this.method() !== 'my' ||
      this.step() !== 1
    )
      return;
    const sentinel = this.sentinel()?.nativeElement;
    if (!sentinel) return;
    this.observer?.disconnect();
    this.observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0]?.isIntersecting &&
          this.method() === 'my' &&
          this.step() === 1 &&
          !this.pageController.error()
        ) {
          void this.loadMore();
        }
      },
      { root: this.paginationScrollRoot(), rootMargin: '0px 0px 500px 0px' },
    );
    this.observer.observe(sentinel);
  }

  private paginationScrollRoot(): HTMLElement | null {
    const root = this.root()?.nativeElement;
    const state = this.viewport.state();
    return state.visualWidth < 768 || this.viewport.overlayCompact()
      ? (root?.closest<HTMLElement>('.m-action-card') ?? null)
      : (root?.closest<HTMLElement>('.m-action-card__body') ?? null);
  }

  close(): void {
    if (!this.step_12_loading())
      this.actionOverlayContext.close(this.sessionId);
  }

  // ============= ChEMBL search selection

  chemblQuery = this.chemblSearch.query;
  chemblLoading = this.chemblSearch.loading;
  chemblResults = this.chemblSearch.results;
  chemblError = this.chemblSearch.error;
  chemblEmpty = this.chemblSearch.empty;

  get selectedMolecules(): ChipItem[] {
    return this.selection.chips();
  }

  get selectedIds(): string[] {
    return this.selection.selectedChemblIds;
  }

  // TODO: Medium priority - Safari/iOS quirks can break keyboard overlay layout and suppress realtime search.
  // When time permits, revisit with dedicated viewport/keyboard handling and stricter input event capture.
  onSearchHit(hit: { id: string; name: string }) {
    this.addChip(hit);
  }

  addChip(chip: ChipItem) {
    if (!this.step_12_loading()) this.selection.addChip(chip);
  }

  onChemblQuery(raw: string) {
    if (!this.step_12_loading()) this.chemblSearch.setQuery(raw);
  }

  removeChip(id: string) {
    if (!this.step_12_loading()) this.selection.removeChip(id);
  }

  clearChips() {
    if (!this.step_12_loading()) this.selection.clearChips();
  }

  onEmpty(): void {
    this.chemblSearch.clear();
  }

  handleResults(
    results: MoleculeSearchResult[] | PageModel<MoleculeCardItemModel>,
  ): void {
    if (Array.isArray(results)) {
      this.chemblSearch.setResults(results);
      return;
    }
    this.chemblSearch.setResults([]);
  }

  handleError(err: unknown): void {
    this.chemblSearch.setError(err);
  }

  readonly canSubmit = computed(
    () =>
      !this.step_12_loading() &&
      !!this.collection() &&
      (this.method() === 'my'
        ? !this.isSelectedNothing()
        : this.selectedIds.length > 0),
  );
  readonly selectionSummary = computed(() => {
    if (this.method() === 'chembl')
      return `${this.selectedIds.length} ${this.selectedIds.length === 1 ? 'molecola selezionata' : 'molecole selezionate'} su ChEMBL`;
    if (this.selection.mode() === 'all') {
      const excluded = this.selection.excludedIds().size;
      return excluded
        ? `Tutte le molecole disponibili, tranne ${excluded}`
        : 'Tutte le molecole disponibili selezionate';
    }
    const count = this.selection.selectedIds().size;
    return `${count} ${count === 1 ? 'molecola selezionata' : 'molecole selezionate'} tra le mie molecole`;
  });
  isChemblSelected(id: string | number): boolean {
    return this.selectedIds.includes(String(id));
  }
  retryChembl(): void {
    if (!this.step_12_loading()) this.chemblSearch.retry();
  }
  dispatchSubmit(): void {
    if (!this.canSubmit()) return;
    const collectionId = this.addContext.collectionId();
    if (!collectionId) return;
    const redirect = this.addContext.redirectToCollectionPath();
    this.error.set(false);
    this.step_12_loading.set(true);
    this.methodControl.disable({ emitEvent: false });
    this.actionOverlayContext.beginSubmit(this.sessionId);
    this.observer?.disconnect();
    const request =
      this.method() === 'my'
        ? this.submitController.submitExisting(
            this.moleculeCollectionItemService,
            collectionId,
            this.selection,
          )
        : this.submitController.submitChembl(
            this.moleculeCollectionItemService,
            collectionId,
            this.selection,
          );
    this.suSub1 = request
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (ok) => {
          if (!ok) {
            this.submissionFailed();
            return;
          }
          this.actionOverlayContext.submitSucceeded(this.sessionId);
          this.invalidation.publish({
            domain: 'molecule-collection',
            action: 'molecules-added',
            collectionId,
          });
          this.toast.trigger('Molecole aggiunte alla collezione.', 'success');
          queueMicrotask(() => {
            if (this.destroyRef.destroyed) return;
            this.actionOverlayContext.close(this.sessionId);
            if (redirect)
              void this.router.navigateByUrl(
                `/molecules/collections/detail/${collectionId}`,
              );
          });
        },
        error: () => this.submissionFailed(),
      });
  }
  private submissionFailed(): void {
    this.step_12_loading.set(false);
    this.methodControl.enable({ emitEvent: false });
    this.error.set(true);
    this.actionOverlayContext.submitFailed(this.sessionId);
    queueMicrotask(() => this.startObserver());
  }
}
