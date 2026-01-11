import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ClassicSpinnerComponent } from '../../common/classic-spinner/classic-spinner.component';
import { ActionOverlayContextService } from '../../../services/context/action-context/action-overlay-context.service';
import { AddMoleculesToCollectionContextService } from '../../../services/context/action-context/add-molecules-to-collection-context.service';
import { ComboSelectComponent } from '../../common/combo-select/combo-select.component';
import { MoleculeCollection } from '../../../Models/graphql/molecule-collection/molecule-collection.types';
import { MoleculeCollectionService } from '../../../services/graphql/molecule-collection.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'm-select-collection-then-route',
  imports: [
    ClassicSpinnerComponent,
    ComboSelectComponent
  ],
  template: `

<div class="flex justify-center items-center min-h-screen px-2 sm:px-4 m-overlay-screen">
  <div
    class="action-card"
    role="region"
    aria-labelledby="selectCollectionHeading"
    [attr.aria-busy]="loadingCombo() || loading()"
  >
    <!-- HEADER -->
    <div class="action-card-header">
      <div class="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 sm:gap-3">
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

      <button
        type="button"
        class="action-card-close-btn"
        (click)="close()"
        aria-label="Chiudi selezione collezione"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current w-5 h-auto">
          <path
            d="M182.9 137.4L160.3 114.7L115 160L137.6 182.6L275 320L137.6 457.4L115 480L160.3 525.3L182.9 502.6L320.3 365.3L457.6 502.6L480.3 525.3L525.5 480L502.9 457.4L365.5 320L502.9 182.6L525.5 160L480.3 114.7L457.6 137.4L320.3 274.7L182.9 137.4z"
          />
        </svg>
      </button>
    </div>

    <!-- BODY -->
    <div class="action-card-body bg-light-surface-secondary dark:bg-dark-surface-secondary">
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
            [attr.aria-label]="importFromChembl() ? 'Seleziona collezione per importazione ChEMBL' : 'Seleziona collezione per aggiungere molecole'"
          />
        </div>
      </div>
    </div>

    <!-- FOOTER -->
    <div class="action-card-footer">
      <button
        type="button"
        class="px-4 py-2 rounded-lg bg-light-surface-secondary text-light-on-surface-main
               dark:bg-slate-200 dark:text-light-on-surface-main
               hover:bg-white dark:hover:bg-slate-300/80
               border border-light-border dark:border-dark-border/80
               shadow-sm
               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-accent-primary-hq
               focus-visible:ring-offset-2 focus-visible:ring-offset-light-surface-secondary
               dark:focus-visible:ring-offset-dark-surface-secondary
               transition-colors duration-200"
        (click)="close()"
        aria-label="Annulla selezione collezione"
      >
        Annulla
      </button>

      <button
        type="button"
        class="relative inline-flex items-center justify-center px-4 py-2 rounded-lg
               bg-light-accent-primary-hq text-white font-semibold shadow-md
               hover:bg-light-accent-primary-hc
               dark:bg-dark-accent-primary-btn dark:hover:bg-dark-accent-primary
               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-accent-primary-hq
               focus-visible:ring-offset-2 focus-visible:ring-offset-light-surface-secondary
               dark:focus-visible:ring-offset-dark-surface-secondary
               disabled:bg-light-accent-primary-hq/50 disabled:cursor-not-allowed
               transition-colors duration-200 dark:shadow-btn-dark disabled:hover:bg-light-accent-primary-hq/50"
        [disabled]="!selectedCollectionId() || loadingCombo() || loading()"
        (click)="routeAction()"
        [attr.aria-busy]="loadingCombo() || loading()"
        [attr.aria-disabled]="!selectedCollectionId() || loadingCombo() || loading()"
        aria-label="Continua con la collezione selezionata"
      >
        <span [class.invisible]="loadingCombo() || loading()">
          Continua
        </span>

        <span
          aria-hidden="true"
          class="absolute inset-0 flex items-center justify-center"
          [class.hidden]="!loadingCombo() && !loading()"
        >
          <m-classic-spinner [size]="24"></m-classic-spinner>
        </span>
      </button>
    </div>
  </div>
</div>

  `
})
export class SelectCollectionThenRouteComponent implements OnInit, OnDestroy {

  private readonly actionContext = inject(ActionOverlayContextService);
  private readonly addToColContext = inject(AddMoleculesToCollectionContextService);
  private readonly collectionService = inject(MoleculeCollectionService);

  private colFetchSub?: Subscription;

  collections = signal<MoleculeCollection[]>([]);
  hasMore = signal<boolean>(true);
  loadingCombo = signal<boolean>(false);
  loading = signal<boolean>(false);
  selectedCollectionId = signal<string>('');
  page = signal<number>(1);
  searchTerm = signal<string>('');
  importFromChembl = signal<boolean>(false);

  ngOnInit(): void {
    queueMicrotask(() => {
      const ifc = this.addToColContext.importFromChembl();
      this.importFromChembl.set(ifc);
      this.loadCollections(true);
    });
  }

  ngOnDestroy(): void {
    this.colFetchSub?.unsubscribe();
  }

  close(): void {
    this.actionContext.close();
  }

  displayCollection(item: Pick<MoleculeCollection, 'name'>) {
    return item.name;
  }

  valueCollection(item: Pick<MoleculeCollection, 'id'>) {
    return item.id;
  }

  loadCollections(reset = false) {
    if (this.loadingCombo()) {
      return;
    }
    this.loadingCombo.set(true);
    const page = reset ? 1 : this.page();
    this.colFetchSub = this.collectionService
      .getPaginatedCollections(page, 12, this.searchTerm())
      .subscribe((res) => {
        if (reset) {
          this.collections.set(res.items);
        } else {
          this.collections.set([...this.collections(), ...res.items]);
        }
        this.hasMore.set(res.currentPage < res.totalPages);
        this.page.set(res.currentPage + 1);
        this.loadingCombo.set(false);
      });
  }

  onSearchChange(term: string) {
    this.searchTerm.set(term);
    this.page.set(1);
    this.loadCollections(true);
  }

  onScrollEnd() {
    if (this.hasMore() && !this.loadingCombo()) {
      this.loadCollections();
    }
  }

  onSelect(item: Pick<MoleculeCollection, 'id'>) {
    this.selectedCollectionId.set(item.id);
  }

  onCreateNew(name: string) {
    this.collectionService.createCollection(name).subscribe((newColl) => {
      this.collections.set([newColl, ...this.collections()]);
      this.selectedCollectionId.set(newColl.id);
    });
  }

  routeAction(): void {
    this.goToAddMoleculesToCollection();
  }

  private goToAddMoleculesToCollection(): void {
    queueMicrotask(() => {
      this.addToColContext.setCollectionId(this.selectedCollectionId());
      this.addToColContext.setRedirectToCollectionPath(this.importFromChembl());
      this.actionContext.switchToScope('AddMoleculesToCollection');
    });
  }
}
