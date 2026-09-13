import { Component, ChangeDetectionStrategy, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActionOverlayContextService } from '../../../services/context/action-context/action-overlay-context.service';
import { ComboSelectComponent } from '../../common/combo-select/combo-select.component';
import { MoleculeCollection } from '../../../Models/graphql/molecule-collection/molecule-collection.types';
import { MoleculeCollectionService } from '../../../services/graphql/molecule-collection.service';
import { Subscription } from 'rxjs';
import { ActionCardComponent } from '../../common/action-card/action-card.component';
import { ActionFooterComponent } from '../../common/action-footer/action-footer.component';
import { ButtonComponent } from '../../common/button/button.component';
import { CollectionPickerFacade } from '../collection-picker/collection-picker.facade';

@Component({
  selector: 'm-select-collection-then-route',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ComboSelectComponent,
    ActionCardComponent,
    ActionFooterComponent,
    ButtonComponent
  ],
  template: `

<div class="flex justify-center items-start md:items-center min-h-screen px-2 sm:px-4 pt-1 md:pt-6 m-overlay-screen">
  <m-action-card
      size="standard"
      labelledBy="selectCollectionHeading"
      closeLabel="Chiudi selezione collezione"
      [busy]="loadingCombo() || loading()"
      (closed)="close()"
    >
    <!-- HEADER -->
    <div action-card-title class="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 sm:gap-3">
        @if (importFromChembl()) {
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 640 640"
            class="fill-current size-5 text-blue-700 dark:text-dark-accent-primary-btn-hc"
          >
            <path
              d="M552.1 320L590.7 320C578.7 308 548 277.3 498.7 228L579.4 147.3L590.7 136L579.4 124.7L515.4 60.7L504.1 49.4L492.8 60.7L412.1 141.4C362.7 92 332.1 61.4 320.1 49.4L320.1 320L49.5 320C61.5 332 92.2 362.7 141.5 412L60.8 492.7L49.5 504L60.8 515.3L124.8 579.3L136.1 590.6L147.4 579.3L228.1 498.6C277.5 548 308.1 578.6 320.1 590.6L320.1 320L552.1 320zM464.8 239.3L513.5 288L352.1 288L352.1 126.6C390.8 165.3 410.8 185.3 412.1 186.6L423.4 175.3L504.1 94.6L545.5 136L464.8 216.7L453.5 228L464.8 239.3zM175.4 400.7L126.7 352L288.1 352L288.1 513.4C249.4 474.7 229.4 454.7 228.1 453.4L216.8 464.7L136.1 545.4L94.7 504L175.4 423.3L186.7 412L175.4 400.7z"
            />
          </svg>
          <h2
            id="selectCollectionHeading"
            class="text-lg font-semibold text-light-on-surface-main dark:text-dark-on-surface-main"
          >
            Importa da ChEMBL: seleziona la collezione
          </h2>
        } @else {
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 640 640"
            class="fill-current size-7 text-blue-700 dark:text-dark-accent-primary-btn-hc"
          >
            <path
              d="M288 96L352 144L576 144L576 512L64 512L64 96L288 96zM352 176L341.3 176L332.8 169.6L277.3 128L96 128L96 480L544 480L544 176L352 176zM304 408L304 336L232 336L232 304L304 304L304 232L336 232L336 304L408 304L408 336L336 336L336 408L304 408z"
            />
          </svg>
          <h2
            id="selectCollectionHeading"
            class="text-lg font-semibold text-light-on-surface-main dark:text-dark-on-surface-main"
          >
            Aggiungi nuove molecole: seleziona la collezione
          </h2>
        }
    </div>
    <!-- BODY -->
    <div action-card-body class="bg-light-surface-secondary dark:bg-dark-surface-secondary">
      <div class="flex flex-col gap-6 min-h-[50vh]">
        <p
          class="my-4 px-2 sm:px-4 flex flex-col sm:flex-row sm:flex-wrap justify-center items-center gap-3 sm:gap-4 text-sm
                 text-light-on-surface-secondary dark:text-dark-on-surface-secondary text-center sm:text-left"
          role="status"
          aria-live="polite"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current size-10 shrink-0 text-blue-800/80 dark:text-dark-accent-primary-btn-hc">
            <path
              d="M288 96L352 144L544 144L544 224L512 224L512 176L341.3 176L332.8 169.6L277.3 128L96 128L96 413.2L141.7 272L608 272L597.6 304L530.2 512L63.9 512L63.9 96L287.9 96zM320 480L507 480L564 304L165 304L108 480L320 480z"
            />
          </svg>
          <span>
            Seleziona la collezione a cui vuoi aggiungere nuove molecole e clicca su
            <span class="font-semibold">Continua</span>. Se vuoi, puoi anche crearne una al volo.
          </span>
        </p>

        <div class="w-full max-w-3xl mx-auto">
          <m-combo-select
            [items]="collections()"
            [displayFn]="displayCollection"
            [valueFn]="valueCollection"
            [hasMore]="hasMore()"
            [canCreateNew]="true"
            [searchPlaceholder]="'Cerca collezione...'"
            [selected]="selectedCollectionId()"
            (searchChange)="onSearchChange($event)"
            (loadMore)="onScrollEnd()"
            (select)="onSelect($event)"
            (createNew)="onCreateNew($event)"
            [ariaLabel]="importFromChembl() ? 'Seleziona collezione per importazione ChEMBL' : 'Seleziona collezione per aggiungere molecole'"
          />
        </div>
      </div>
    </div>

    <!-- FOOTER -->
    <m-action-footer action-card-footer>
      <m-button
        action-footer-secondary
        variant="neutral"
        (click)="close()"
        aria-label="Annulla selezione collezione"
      >
        Annulla
      </m-button>

      <m-button
        action-footer-primary
        [disabled]="!selectedCollectionId() || loadingCombo() || loading()"
        [loading]="loadingCombo() || loading()"
        (click)="routeAction()"
        aria-label="Continua con la collezione selezionata"
      >
        Continua
      </m-button>
    </m-action-footer>
  </m-action-card>
</div>

  `
})
export class SelectCollectionThenRouteComponent implements OnInit, OnDestroy {

  private readonly actionContext = inject(ActionOverlayContextService);
  private readonly sessionId = this.actionContext.session('SelectCollectionThenRoute')?.id ?? -1;
  private readonly collectionService = inject(MoleculeCollectionService);
  private readonly picker = new CollectionPickerFacade({
    mode: { kind: 'single', operation: 'route', allowCreate: true }
  });

  private colFetchSub?: Subscription;

  collections = this.picker.collections;
  hasMore = this.picker.hasMore;
  loadingCombo = this.picker.loading;
  loading = signal<boolean>(false);
  selectedCollectionId = signal<string>('');
  importFromChembl = signal<boolean>(false);

  ngOnInit(): void {
    queueMicrotask(() => {
      const ifc = this.actionContext.session('SelectCollectionThenRoute')?.input.importFromChembl ?? false;
      this.importFromChembl.set(ifc);
      this.picker.load(true);
    });
  }

  ngOnDestroy(): void {
    this.colFetchSub?.unsubscribe();
    this.picker.destroy();
  }

  close(): void {
    this.actionContext.close(this.sessionId);
  }

  displayCollection(item: Pick<MoleculeCollection, 'name'>) {
    return item.name;
  }

  valueCollection(item: Pick<MoleculeCollection, 'id'>) {
    return item.id;
  }

  loadCollections(reset = false) {
    this.picker.load(reset);
  }

  onSearchChange(term: string) {
    this.picker.search(term);
  }

  onScrollEnd() {
    if (this.hasMore() && !this.loadingCombo()) this.picker.load();
  }

  onSelect(item: Pick<MoleculeCollection, 'id'>) {
    this.picker.setSingleSelection(item.id);
    this.selectedCollectionId.set(this.picker.selected().ids[0] ?? '');
  }

  onCreateNew(name: string) {
    this.picker.create(name).subscribe(newColl => this.selectedCollectionId.set(newColl.id));
  }

  routeAction(): void {
    this.goToAddMoleculesToCollection();
  }

  private goToAddMoleculesToCollection(): void {
    queueMicrotask(() => {
      const importFromChembl = this.importFromChembl();
      this.actionContext.switchToScope('AddMoleculesToCollection', {
        collectionId: this.selectedCollectionId(),
        redirectToCollectionPath: importFromChembl,
        importFromChembl
      });
    });
  }
}
