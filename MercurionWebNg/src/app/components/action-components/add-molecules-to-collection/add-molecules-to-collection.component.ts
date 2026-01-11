import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
  effect,
  ChangeDetectionStrategy
} from '@angular/core';
import { AbstractPaginatedMultiselectComponent } from '../../../abstract/abstract-paginated-multiselect-component';
import { debounceTime, map, Observable, Subscription } from 'rxjs';
import { ActionOverlayContextService } from '../../../services/context/action-context/action-overlay-context.service';
import { MoleculeCollectionItemService } from '../../../services/graphql/molecule-collection-item.service';
import { Helpers } from '../../../helpers';
import { MoleculeCardItemModel, MoleculeCollection } from '../../../Models/graphql/molecule-collection/molecule-collection.types';
import { PageModel } from '../../../Models/graphql/page.models';
import { PmSearchInputComponent } from '../../common/pm-search-input/pm-search-input.component';
import { MoleculeCollectionItemSelectCardComponent } from '../../molecule-detail/molecule-collection-item-select-card/molecule-collection-item-select-card.component';
import { ClassicSpinnerComponent } from '../../common/classic-spinner/classic-spinner.component';
import { SkeletonMoleculeCardComponent } from '../../molecule-detail/skeleton-molecule-card/skeleton-molecule-card.component';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SearchInputComponent } from '../../search-overlay/search-input/search-input.component';
import { MoleculeSearchResult } from '../../../Models/graphql/molecule-search/molecule-search-result.interface';
import { SearchResultSkeletonLoaderComponent } from '../../search-overlay/search-result-skeleton-loader/search-result-skeleton-loader.component';
import { SearchResultComponent } from '../../search-overlay/search-result/search-result.component';
import { AddManyChEMBLItemDTO } from '../../../Models/graphql/add-many-chembl-item.dto';
import { AddMoleculesToCollectionContextService } from '../../../services/context/action-context/add-molecules-to-collection-context.service';
import { CloseButtonComponent } from '../../common/close-button/close-button.component';
import { MoleculeCollectionService } from '../../../services/graphql/molecule-collection.service';
import { ToastService } from '../../../services/toast.service';
import { Router } from '@angular/router';

export type ChipItem = {
  id: string;
  name: string;
};

@Component({
  selector: 'm-add-molecules-to-collection',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PmSearchInputComponent,
    MoleculeCollectionItemSelectCardComponent,
    ClassicSpinnerComponent,
    SkeletonMoleculeCardComponent,
    ReactiveFormsModule,
    SearchInputComponent,
    SearchResultSkeletonLoaderComponent,
    SearchResultComponent
  ],
  styles: [
    `
    /* Scrollbar sottile cross-browser */

    .m-scroll-thin {
      scrollbar-width: thin; /* Firefox */
      scrollbar-color: #64748b transparent; /* thumb, track */
    }

    :host-context(.dark) .m-scroll-thin {
      scrollbar-color: #94a3b8 transparent;
    }

    .m-scroll-thin::-webkit-scrollbar {
      width: 6px;
    }

    .m-scroll-thin::-webkit-scrollbar-track {
      background: transparent;
    }

    .m-scroll-thin::-webkit-scrollbar-thumb {
      background-color: #cbd5e1; /* slate-300-ish */
      border-radius: 9999px;
    }

    :host-context(.dark) .m-scroll-thin::-webkit-scrollbar-thumb {
      background-color: #475569; /* slate-600-ish */
    }

    .m-scroll-thin::-webkit-scrollbar-thumb:hover {
      background-color: #94a3b8;
    }

    :host-context(.dark) .m-scroll-thin::-webkit-scrollbar-thumb:hover {
      background-color: #e2e8f0;
    }
    `
  ],
  template: `
<div class="flex justify-center items-center min-h-screen px-2 sm:px-4 m-overlay-screen">
  <div
    class="action-card max-w-5xl"
    role="region"
    aria-labelledby="addMolHeading"
    [attr.aria-busy]="step_12_loading()"
  >
    <!-- HEADER -->
    <div class="action-card-header">
      <h2
        id="addMolHeading"
        class="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 items-start sm:items-center text-lg font-semibold text-light-on-surface-main dark:text-dark-on-surface-main"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current size-8">
          <path
            d="M288 96L352 144L576 144L576 512L64 512L64 96L288 96zM352 176L341.3 176L332.8 169.6L277.3 128L96 128L96 480L544 480L544 176L352 176zM304 408L304 336L232 336L232 304L304 304L304 232L336 232L336 304L408 304L408 336L336 336L336 408L304 408z"
          />
        </svg>
        <span>
          Aggiungi nuove molecole alla collezione
          <em>{{ collection()?.name }}</em>
        </span>
      </h2>

      <button
            type="button"
            class="action-card-close-btn"
            (click)="close()"
            aria-label="Chiudi pannello aggiungi molecole"
            [attr.aria-describedby]="step() === 2 ? 'addMolStatus' : null"
            [attr.aria-disabled]="false"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current w-5 h-auto">
          <path
            d="M182.9 137.4L160.3 114.7L115 160L137.6 182.6L275 320L137.6 457.4L115 480L160.3 525.3L182.9 502.6L320.3 365.3L457.6 502.6L480.3 525.3L525.5 480L502.9 457.4L365.5 320L502.9 182.6L525.5 160L480.3 114.7L457.6 137.4L320.3 274.7L182.9 137.4z"
          />
        </svg>
      </button>
    </div>

    <!-- BODY -->
    <div class="action-card-body bg-white dark:bg-dark-surface-main">
      <!-- Scelta metodo -->
      <div class="mx-auto">
        <div
          class="mt-6 space-y-6 sm:flex sm:items-center sm:space-x-10 sm:space-y-0
                 px-6 pb-6 border-b border-light-border dark:border-dark-border"
          role="radiogroup"
          aria-label="Scegli il metodo per aggiungere molecole"
          aria-live="polite"
        >
          @if (step() === 1) {
            <div class="flex items-center">
              <input
                id="my"
                type="radio"
                name="method"
                value="my"
                [formControl]="methodControl"
                aria-label="Usa le mie molecole"
                [attr.aria-checked]="method() === 'my'"
                class="cursor-pointer relative size-4 appearance-none rounded-full
                       border border-gray-300 bg-white
                       before:absolute before:inset-1 before:rounded-full before:bg-white
                       checked:border-indigo-600 checked:bg-indigo-600
                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600
                       disabled:border-gray-300 disabled:bg-gray-100 disabled:before:bg-gray-400
                       dark:border-white/10 dark:bg-white/5
                       dark:checked:border-indigo-500 dark:checked:bg-indigo-500
                       dark:focus-visible:outline-indigo-500
                       dark:disabled:border-white/5 dark:disabled:bg-white/10 dark:disabled:before:bg-white/20
                       forced-colors:appearance-auto forced-colors:before:hidden
                       [&:not(:checked)]:before:hidden"
              />
              <label
                for="my"
                class="cursor-pointer ml-3 block text-sm/6 font-medium text-gray-900 dark:text-white"
              >
                Seleziona da <span class="italic">Le mie molecole</span>
              </label>
            </div>
            <div class="flex items-center">
              <input
                id="chembl"
                type="radio"
                name="method"
                value="chembl"
                [formControl]="methodControl"
                aria-label="Cerca e seleziona da ChEMBL DB"
                [attr.aria-checked]="method() === 'chembl'"
                class="cursor-pointer relative size-4 appearance-none rounded-full
                       border border-gray-300 bg-white
                       before:absolute before:inset-1 before:rounded-full before:bg-white
                       checked:border-indigo-600 checked:bg-indigo-600
                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600
                       disabled:border-gray-300 disabled:bg-gray-100 disabled:before:bg-gray-400
                       dark:border-white/10 dark:bg:white/5
                       dark:checked:border-indigo-500 dark:checked:bg-indigo-500
                       dark:focus-visible:outline-indigo-500
                       dark:disabled:border-white/5 dark:disabled:bg-white/10 dark:disabled:before:bg-white/20
                       forced-colors:appearance-auto forced-colors:before:hidden
                       [&:not(:checked)]:before:hidden"
              />
              <label
                for="chembl"
                class="cursor-pointer ml-3 block text-sm/6 font-medium text-gray-900 dark:text-white"
              >
                Cerca e seleziona da ChEMBL DB
              </label>
            </div>
          } @else if (step() === 2) {
            <div class="flex items-center">
              <input
                [attr.disabled]="true"
                id="my"
                type="radio"
                name="method"
                value="my"
                [formControl]="methodControl"
                aria-label="Usa le mie molecole"
                [attr.aria-checked]="method() === 'my'"
                aria-disabled="true"
                class="cursor-not-allowed relative size-4 appearance-none rounded-full
                       border border-gray-300 bg-white
                       before:absolute before:inset-1 before:rounded-full before:bg-white
                       checked:border-indigo-600 checked:bg-indigo-600
                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600
                       disabled:border-gray-300 disabled:bg-gray-100 disabled:before:bg-gray-400
                       dark:border-white/10 dark:bg-white/5
                       dark:checked:border-indigo-500 dark:checked:bg-indigo-500
                       dark:focus-visible:outline-indigo-500
                       dark:disabled:border-white/5 dark:disabled:bg-white/10 dark:disabled:before:bg-white/20
                       forced-colors:appearance-auto forced-colors:before:hidden
                       [&:not(:checked)]:before:hidden"
              />
              <label
                for="my"
                class="cursor-not-allowed ml-3 block text-sm/6 font-medium text-gray-900 dark:text-white"
              >
                Seleziona da <span class="italic">Le mie molecole</span>
              </label>
            </div>
            <div class="flex items-center">
              <input
                [attr.disabled]="true"
                id="chembl"
                type="radio"
                name="method"
                value="chembl"
                [formControl]="methodControl"
                aria-label="Cerca e seleziona da ChEMBL DB"
                [attr.aria-checked]="method() === 'chembl'"
                aria-disabled="true"
                class="cursor-not-allowed relative size-4 appearance-none rounded-full
                       border border-gray-300 bg-white
                       before:absolute before:inset-1 before:rounded-full before:bg-white
                       checked:border-indigo-600 checked:bg-indigo-600
                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600
                       disabled:border-gray-300 disabled:bg-gray-100 disabled:before:bg-gray-400
                       dark:border-white/10 dark:bg-white/5
                       dark:checked:border-indigo-500 dark:checked:bg-indigo-500
                       dark:focus-visible:outline-indigo-500
                       dark:disabled:border-white/5 dark:disabled:bg-white/10 dark:disabled:before:bg-white/20
                       forced-colors:appearance-auto forced-colors:before:hidden
                       [&:not(:checked)]:before:hidden"
              />
              <label
                for="chembl"
                class="cursor-not-allowed ml-3 block text-sm/6 font-medium text-gray-900 dark:text-white"
              >
                Cerca e seleziona da ChEMBL DB
              </label>
            </div>
          }
        </div>
      </div>

      <!-- CONTENUTO STEP / METODO -->
      @switch (method()) {
        @case ('my') {
          <div
            #scrollRoot
            class="py-6 px-3 overflow-y-auto flex flex-col gap-4 m-scroll-thin m-overscroll-touch m-overlay-body"
          >
            @switch (step()) {
              @case (1) {
                <div class="px-3">
                  <h2 class="font-semibold mb-3">
                    Scegli le molecole da aggiungere alla collezione:
                  </h2>

                  <m-search-input
                    class="block"
                    [value]="searchTerm()"
                    [useAltDarkStyle]="true"
                    (valueChange)="doQuery($event)"
                    (submitted)="doQuery($event)"
                    (cleared)="doClear()"
                  />

                  <div class="mt-6">
                    @if (multiselectItems().length !== 0) {
                      <m-molecule-collection-item-select-card
                        class="block mb-6"
                        [isSelectAll]="true"
                        [value]="isSelectedAll()"
                        [indeterminate]="isPartiallySelected()"
                        (selectedAll)="onSelectAllChange($event)"
                      />
                    }

                    @for (row of multiselectItems(); track row.item.id; let i = $index) {
                      <m-molecule-collection-item-select-card
                        [molecule]="row.item"
                        [i]="i"
                        [value]="row.isChecked()"
                        (valueChange)="row.isChecked.set($event); toggleOne(row)"
                      />
                    }
                  </div>

                  <div #sentinel class="h-1 w-full"></div>

                  @if (loading) {
                    @if (page > 1) {
                      <div class="flex justify-center py-4" role="status" aria-live="polite" aria-busy="true">
                        <m-classic-spinner [size]="60" />
                      </div>
                    } @else {
                      <div class="space-y-4" role="status" aria-live="polite" aria-busy="true">
                        @for (i of [0,1,2,3,4]; track i) {
                          <m-skeleton-molecule-card />
                        }
                      </div>
                    }
                  } @else if (empty() && (earlyDone || done)) {
                    <p class="text-slate-700 dark:text-slate-200 py-6" role="status" aria-live="polite">
                      Nessuna molecola disponibile tra
                      <em>Le mie molecole</em>.
                    </p>
                  }
                </div>
              }
              @case (2) {
                @if (error()) {
                  <span
                    id="addMolStatus"
                    class="text-light-error dark:text-dark-error"
                    role="alert"
                    aria-live="assertive"
                  >
                    Si è verificato un errore
                  </span>
                } @else {
                  <span
                    id="addMolStatus"
                    class="text-light-accent-primary-hq dark:text-dark-accent-secondary"
                    role="status"
                    aria-live="polite"
                  >
                    Molecole aggiunte con successo!
                  </span>
                }
              }
            }
          </div>
        }
        @case ('chembl') {
          @switch (step()) {
            @case (1) {
              <div class="py-6 px-3 flex flex-col gap-4 transition duration-150 m-overlay-body">
                <div>Cerca su ChEMBL e seleziona:</div>

                <m-molecule-search-input
                  [search_excludeAlreadyAdded]="true"
                  (onLoading)="chemblLoading.set($event)"
                  (onResult)="handleResults($event)"
                  (onError)="handleError($event)"
                  (onQuery)="chemblQuery.set($event)"
                  (onEmpty)="chemblEmpty.set(true)"
                />

                <div class="border-b min-h-24 relative">
                  @if (selectedMolecules.length === 0) {
                    <div
                      class="absolute inset-0 flex justify-center items-center text-sm text-slate-700 dark:text-slate-200"
                      role="status"
                      aria-live="polite"
                    >
                      Qui vedrai le molecole selezionate.
                    </div>
                  }

                  <div
                    class="relative flex flex-col xs:flex-row xs:flex-wrap items-start xs:items-center gap-2 xs:gap-3 py-3"
                    role="list"
                    aria-label="Molecole selezionate"
                    aria-live="polite"
                  >
                    @for (m of selectedMolecules; track m.id) {
                      <span
                        role="listitem"
                        class="group inline-flex items-center gap-2 max-w-full
                               rounded-full px-3 py-1.5
                               bg-indigo-50 text-light-accent-primary-hq ring-1 ring-inset ring-light-accent-primary-hq/70
                               dark:bg-indigo-500/20 dark:text-indigo-100 dark:ring-indigo-400/40
                               shadow-sm"
                        title="{{ m.name }}"
                      >
                        <span class="truncate max-w-[16rem] text-sm font-medium">
                          {{ m.name }}
                        </span>

                        <button
                          type="button"
                          (click)="removeChip(m.id)"
                          class="shrink-0 inline-flex size-5 items-center justify-center rounded-full
                                 hover:bg-indigo-100 dark:hover:bg-indigo-400/30
                                 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1
                                 dark:focus:ring-offset-gray-900"
                          aria-label="Rimuovi {{ m.name }}"
                        >
                          <svg viewBox="0 0 20 20" fill="none" class="size-3.5">
                            <path
                              d="M6 6l8 8M14 6l-8 8"
                              stroke="currentColor"
                              stroke-width="1.8"
                              stroke-linecap="round"
                            />
                          </svg>
                        </button>
                      </span>
                    }

                    @if (selectedMolecules.length > 0) {
                      <span class="grow"></span>
                      <button
                        type="button"
                        (click)="clearChips()"
                        class="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm
                               ring-1 ring-inset ring-indigo-300 text-indigo-700 hover:bg-indigo-50
                               dark:ring-indigo-400/40 dark:text-indigo-100 dark:hover:bg-indigo-500/20
                               focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1
                               dark:focus:ring-offset-gray-900"
                      >
                        Pulisci tutto
                        <svg viewBox="0 0 20 20" fill="none" class="size-3.5">
                          <path
                            d="M5 10h10M10 5v10"
                            stroke="currentColor"
                            stroke-width="1.6"
                            stroke-linecap="round"
                          />
                        </svg>
                      </button>
                    }
                  </div>
                </div>

              <div
                  class="overflow-y-auto relative m-scroll-thin m-overscroll-touch"
                  role="region"
                  aria-label="Risultati ricerca ChEMBL"
                  [attr.aria-busy]="chemblLoading()"
                  aria-live="polite"
                >
                  @if (chemblLoading()) {
                    <div role="status" aria-live="polite" aria-busy="true">
                      <m-search-result-skeleton-loader />
                    </div>
                  } @else if (chemblResults().length) {
                    @for (molecule of chemblResults(); track molecule.id) {
                      <m-search-result
                        [molecule]="molecule"
                        [query]="chemblQuery()"
                        [search_excludeAlreadyAdded]="true"
                        (onChipItem)="addChip($event)"
                      />
                    }
                  } @else if (!chemblResults().length && !chemblError() && !chemblEmpty()) {
                    <div class="text-sm text-slate-700 dark:text-slate-200 text-center py-8" role="status" aria-live="polite">
                      Nessun risultato trovato.
                    </div>
                  } @else if (chemblError()) {
                    <div
                      class="text-sm text-red-500 bg-red-50 dark:bg-red-950 rounded px-4 py-2 text-center"
                      role="alert"
                      aria-live="assertive"
                    >
                      Errore nella ricerca. Riprova.
                    </div>
                  }
                </div>
              </div>
            }
            @case (2) {
              <div class="py-6 px-3 flex flex-col gap-4 min-h-[60vh] max-h-[60vh]">
                @if (error()) {
                  <span
                    id="addMolStatus"
                    class="text-light-error dark:text-dark-error"
                    role="alert"
                    aria-live="assertive"
                  >
                    Si è verificato un errore
                  </span>
                } @else {
                  <span
                    id="addMolStatus"
                    class="text-light-accent-primary-hq dark:text-dark-accent-secondary"
                    role="status"
                    aria-live="polite"
                  >
                    Molecole aggiunte con successo!
                  </span>
                }
              </div>
            }
          }
        }
      }
    </div>

    <!-- FOOTER -->
    <div class="action-card-footer">
      @if (step() === 1) {
        <button
          type="button"
          class="px-4 py-2 rounded-lg bg-light-surface-secondary text-light-on-surface-main
                 dark:bg-slate-200 dark:text-light-on-surface-main
                 hover:bg-white dark:hover:bg-slate-300/80
                 border border-light-border dark:border-dark-border/80
                 shadow-sm
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-accent-primary
                 focus-visible:ring-offset-2 focus-visible:ring-offset-light-surface-secondary
                 dark:focus-visible:ring-offset-dark-surface-secondary
                 transition-colors duration-200"
          (click)="close()"
        >
          Annulla
        </button>
      }

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
        [disabled]="(isSelectedNothing() && this.method() === 'my') || (this.selectedIds.length === 0 && this.method() === 'chembl' || step_12_loading())"
        (click)="step() === 1 ? dispatchSubmit() : close()"
        [attr.aria-busy]="step_12_loading()"
        [attr.aria-disabled]="(isSelectedNothing() && this.method() === 'my') || (this.selectedIds.length === 0 && this.method() === 'chembl' || step_12_loading())"
        [attr.aria-live]="step_12_loading() ? 'assertive' : 'polite'"
        [attr.aria-label]="step() === 1 ? 'Aggiungi molecole' : 'Chiudi conferma'"
      >
        <span [class.invisible]="step_12_loading()">
          @if (step() === 1) {
            <span>Aggiungi</span>
          } @else if (step() === 2) {
            <span>Ok</span>
          }
        </span>

        <span
          aria-hidden="true"
          class="absolute inset-0 flex items-center justify-center"
          [class.hidden]="!step_12_loading()"
        >
          <m-classic-spinner [size]="24"></m-classic-spinner>
        </span>
      </button>
    </div>
  </div>
</div>
`
})
export class AddMoleculesToCollectionComponent
  extends AbstractPaginatedMultiselectComponent<MoleculeCardItemModel>
  implements OnInit, AfterViewInit, OnDestroy {

  private readonly actionOverlayContext = inject(ActionOverlayContextService);
  private readonly addContext = inject(AddMoleculesToCollectionContextService);
  private readonly moleculeCollectionItemService = inject(MoleculeCollectionItemService);
  private readonly moleculeCollectionService = inject(MoleculeCollectionService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  private ctrlSub?: Subscription;
  private suSub1?: Subscription;
  private suSub2?: Subscription;
  private metCtrlSub?: Subscription;
  private colSub?: Subscription;

  step = signal<1 | 2>(1);
  step_12_loading = signal<boolean>(false);
  error = signal<boolean>(false);
  methodControl!: FormControl<'my' | 'chembl'>;
  method = signal<'my' | 'chembl'>('my');
  collection = signal<MoleculeCollection | null>(null);

  @ViewChild('scrollRoot', { static: false }) protected declare root: ElementRef<HTMLDivElement>;
  @ViewChild('sentinel', { static: false }) protected declare sentinel: ElementRef<HTMLDivElement>;

  constructor() {
    super();
    effect(() => {
      if (this.method() === 'my') {
        queueMicrotask(() => {
          this.step.set(1);
          this.clearChips();
          this.resetPagination();
          this.startObserver();
          this.loadMore();
          this.cdr.markForCheck();
        });
      } else if (this.method() === 'chembl') {
        this.clearSelections();
        this.clearChips();
        this.multiselectItems.set([]);
        this.items = [];
        this.done = false;
        this.earlyDone = false;
        this.empty.set(true);
        this.loading = false;
        this.bulkIntent.set('none');
        this.step.set(1);
        this.chemblEmpty.set(true);
        this.chemblError.set(null);
        this.chemblLoading.set(false);
        this.chemblQuery.set('');
        this.chemblResults.set([]);
      }
    });
  }

  private _rearmOnStep = effect(() => {
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
    this.methodControl = new FormControl<'my' | 'chembl'>(defaultMethod, { nonNullable: true });
    this.metCtrlSub = this.methodControl.valueChanges.subscribe(val => this.method.set(val));
    queueMicrotask(() => {
      this.colSub = this.moleculeCollectionService.getCollectionById(this.addContext.collectionId()!).subscribe({
        next: col => this.collection.set(col),
        error: () =>
          queueMicrotask(() => {
            this.close();
            this.addContext.clearCollectionId();
            this.toast.trigger('Si è verificato un errore. Se si ripete, contatta il supporto', 'error', 3000);
          })
      });
      this.loadMore();
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
    this.colSub?.unsubscribe();
    this.metCtrlSub?.unsubscribe();
  }

  protected override fetch$(
    page?: number,
    size?: number,
    q?: string,
    excludeJoinedToCollection?: boolean,
    collectionId?: boolean
  ): Observable<PageModel<MoleculeCardItemModel>> {
    return this.moleculeCollectionItemService
      .getAllPaginatedItems(this.page, 20, this.searchTerm(), true, this.addContext.collectionId())
      .pipe(
        debounceTime(100),
        map(p => ({
          ...p,
          items: p.items.map(mol => Helpers.moleculeClientToCardConverter(mol))
        }))
      );
  }

  protected override doQuery(q: string): void {
    this.query(q);
  }

  protected override doClear(): void {
    this.clear();
  }

  close(): void {
    this.actionOverlayContext.close();
  }

  private doSubmit(): void {
    if (this.step() === 1) {
      if (this.isSelectedNothing()) {
        return;
      }

      this.step_12_loading.set(true);

      let itemIds: string[] = [];
      if (this.isSelectedAll()) {
        itemIds = this.multiselectItems()
          .filter(w => !w.isChecked())
          .map(w => w.item.id);
      } else {
        itemIds = Array.from(this.selectedIdSet());
      }

      this.suSub1 = this.moleculeCollectionItemService
        .addManyMoleculesToCollection(this.addContext.collectionId()!, itemIds, this.isSelectedAll())
        .subscribe({
          next: ok => {
            this.step_12_loading.set(false);
            this.addContext.notifyAdded();
            this.error.set(!ok);
            const cId = this.addContext.collectionId();
            this.addContext.clearCollectionId();
            if (this.addContext.redirectToCollectionPath()) {
              this.addContext.setRedirectToCollectionPath(false);
              this.router.navigateByUrl(`/molecules/collections/detail/${cId}`);
            }
            this.actionOverlayContext.close();
          },
          error: () => {
            this.step_12_loading.set(false);
            this.error.set(true);
            this.step.set(2);
          }
        });
    } else {
      this.actionOverlayContext.close();
    }
  }

  // ============= ChEMBL search selection

  chemblQuery = signal<string>('');
  chemblLoading = signal<boolean>(false);
  chemblResults = signal<MoleculeSearchResult[]>([]);
  chemblError = signal<unknown | null>(null);
  chemblEmpty = signal<boolean>(true);

  selectedMolecules: ChipItem[] = [];

  get selectedIds(): string[] {
    return this.selectedMolecules.map(c => c.id);
  }

  onSearchHit(hit: { id: string; name: string }) {
    this.addChip(hit);
  }

  addChip(chip: ChipItem) {
    if (!chip?.id) return;
    if (this.selectedMolecules.some(c => c.id === chip.id)) return;
    this.selectedMolecules = [...this.selectedMolecules, chip];
  }

  removeChip(id: string) {
    this.selectedMolecules = this.selectedMolecules.filter(c => c.id !== id);
  }

  clearChips() {
    this.selectedMolecules = [];
  }

  onEmpty(): void {
    this.chemblEmpty.set(true);
    this.chemblQuery.set('');
    this.chemblResults.set([]);
  }

  handleResults(results: MoleculeSearchResult[] | PageModel<MoleculeCardItemModel>): void {
    this.chemblEmpty.set(false);
    this.chemblError.set(null);
    if (Array.isArray(results)) {
      this.chemblResults.set(results);
      return;
    }
    this.chemblResults.set([]);
  }

  handleError(err: unknown): void {
    this.chemblEmpty.set(false);
    this.chemblError.set(err);
    this.chemblResults.set([]);
  }

  private doSubmitChembl(): void {
    const dtos: AddManyChEMBLItemDTO[] = this.selectedMolecules.map(chip => {
      const dto: AddManyChEMBLItemDTO = {
        chemblMolregno: Number(chip.id),
        name: chip.name
      };
      return dto;
    });
    this.suSub2 = this.moleculeCollectionItemService
      .addManyChEMBLItemsToCollection(this.addContext.collectionId()!, dtos)
      .subscribe({
        next: ok => {
          this.step_12_loading.set(false);
          this.addContext.notifyAdded();
          this.error.set(!ok);
          const cId = this.addContext.collectionId();
          const shouldRedirect = this.addContext.redirectToCollectionPath();
          this.addContext.clearCollectionId();
          if (shouldRedirect) {
            this.addContext.setRedirectToCollectionPath(false);
            this.router.navigateByUrl(`/molecules/collections/detail/${cId}`);
          }
          this.actionOverlayContext.close();
        },
        error: () => {
          this.step_12_loading.set(false);
          this.error.set(true);
          this.step.set(2);
        }
      });
  }

  dispatchSubmit(): void {
    if (this.method() === 'my') {
      queueMicrotask(() => this.doSubmit());
    } else if (this.method() === 'chembl') {
      queueMicrotask(() => this.doSubmitChembl());
    }
  }
}
