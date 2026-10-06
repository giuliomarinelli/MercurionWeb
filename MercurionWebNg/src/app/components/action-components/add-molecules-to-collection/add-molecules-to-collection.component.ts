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
  viewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PaginationController } from '../../../services/pagination/pagination-controller';
import { debounceTime, map, Observable, Subscription } from 'rxjs';
import { ActionOverlayContextService } from '../../../services/context/action-context/action-overlay-context.service';
import { MoleculeCollectionItemService } from '../../../services/graphql/molecule-collection-item.service';
import { Helpers } from '../../../helpers';
import { MoleculeCardItemModel, MoleculeCollection } from '../../../Models/graphql/molecule-collection/molecule-collection.types';
import { PageModel } from '../../../Models/graphql/page.models';
import { PmSearchInputComponent } from '../../common/pm-search-input/pm-search-input.component';
import { MoleculeCollectionItemSelectCardComponent } from '../../molecule-detail/molecule-collection-item-select-card/molecule-collection-item-select-card.component';
import { ProgressIndicatorComponent } from '../../common/progress-indicator/progress-indicator.component';
import { SkeletonMoleculeCardComponent } from '../../molecule-detail/skeleton-molecule-card/skeleton-molecule-card.component';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SearchInputComponent } from '../../search-overlay/search-input/search-input.component';
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
  type ChipItem
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
    SearchInputComponent,
    SearchResultSkeletonLoaderComponent,
    SearchResultComponent,
    ActionCardComponent,
    ActionFooterComponent,
    ButtonComponent
  ],
  styles: [
    `
    .m-add-heading-compact { display: none; }
    :host-context(.m-dialog--compact) { --m-action-card-header-height: 4.5rem; }
    :host-context(.m-dialog--compact) .m-add-heading-full { display: none; }
    :host-context(.m-dialog--compact) .m-add-heading-compact { display: block; }
    :host-context(.m-dialog--compact) .m-add-chembl-content { padding-block: 0.5rem; gap: 0.25rem; }
    :host-context(.m-dialog--compact) .m-add-search { padding-bottom: 0; }
    :host-context(.m-dialog--compact) .m-add-instructions { display: none; }
    :host-context(.m-dialog--compact) .m-add-selections .m-chip-stack { max-height: 4rem; }

    :host-context(.m-dialog--compact) .m-add-body,
    :host-context(.m-dialog--compact) .m-add-content,
    :host-context(.m-dialog--compact) .m-add-list,
    :host-context(.m-dialog--compact) .m-add-results,
    :host-context(.m-dialog--compact) .m-add-chembl-content { flex: 0 0 auto; height: auto; overflow: visible; }
    :host-context(.m-dialog--compact) .m-add-search { position: sticky; top: 4.5rem; z-index: 2; }
    @media (max-width: 767px) {
      .m-add-body, .m-add-content, .m-add-list, .m-add-results, .m-add-chembl-content { flex: 0 0 auto; height: auto; overflow: visible; }
    }

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

    /* Shared layout utilities for action components */
    .m-ac-pad {
      padding-left: 0.75rem;
      padding-right: 0.75rem;
    }
    @media (min-width: 640px) {
      .m-ac-pad {
        padding-left: 0.75rem;
        padding-right: 0.75rem;
      }
    }
    .m-search-center {
      display: flex;
      justify-content: center;
      width: 100%;
    }
    @media (min-width: 640px) {
      .m-search-center {
        justify-content: flex-start;
      }
    }
    .m-chip-stack {
      max-height: 5rem;
      overflow-y: auto;
      overflow-x: hidden;
      padding-right: 0.5rem;
    }
    @media (min-width: 640px) {
      .m-chip-stack {
        height: auto;
        max-height: 7rem;
      }
    }
    .m-chip {
      padding: 1px 4px;
      font-size: 12px;
      gap: 2px;
      border-radius: 9999px;
      line-height: 1.1;
    }
    .m-chip button {
      width: 28px;
      height: 28px;
    }
    @media (min-width: 640px) {
      .m-chip {
        padding: 6px 12px;
        font-size: 14px;
        gap: 8px;
      }
      .m-chip button {
        width: 20px;
        height: 20px;
      }
    }
    .m-chip-text {
      max-width: 6.5rem;
    }
    @media (min-width: 640px) {
      .m-chip-text {
        max-width: 16rem;
      }
    }
    .m-chip-clear {
      padding: 1px 5px;
      font-size: 12px;
      border-radius: 9999px;
      line-height: 1.1;
    }
    @media (min-width: 640px) {
      .m-chip-clear {
        padding: 6px 12px;
        font-size: 14px;
      }
    }
    `
  ],
  template: `
<div class="flex justify-center items-stretch md:items-center px-2 sm:px-4 m-overlay-screen">
  <m-action-card
    size="wide"
    [bodyScroll]="false"
    style="--m-action-card-height: min(40rem, var(--m-action-card-available-height, calc(100dvh - 2rem)))"
    labelledBy="addMolHeading"
    closeLabel="Chiudi pannello aggiungi molecole"
    [busy]="step_12_loading()"
    (closed)="close()"
  >
    <!-- HEADER -->
      <h2 action-card-title
        id="addMolHeading"
        class="flex items-center gap-3 text-lg font-semibold text-light-on-surface-main dark:text-dark-on-surface-main"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current size-8 shrink-0">
          <path
            d="M288 96L352 144L576 144L576 512L64 512L64 96L288 96zM352 176L341.3 176L332.8 169.6L277.3 128L96 128L96 480L544 480L544 176L352 176zM304 408L304 336L232 336L232 304L304 304L304 232L336 232L336 304L408 304L408 336L336 336L336 408L304 408z"
          />
        </svg>
        <span class="m-add-heading-full">
          Aggiungi nuove molecole alla collezione
          <em>{{ collection()?.name }}</em>
        </span>
        <span class="m-add-heading-compact min-w-0">Aggiungi molecole<em class="block truncate text-base font-normal">{{ collection()?.name }}</em></span>
      </h2>

    <!-- BODY -->
    <div action-card-body class="m-add-body bg-white dark:bg-dark-surface-main flex flex-col flex-1 min-h-0 overflow-hidden">
      <!-- Scelta metodo -->
      <div class="mx-auto shrink-0 w-full">
        <div
          class="m-overlay-methods mt-6 space-y-6 sm:flex sm:items-center sm:space-x-10 sm:space-y-0
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
                       focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600
                       disabled:border-gray-300 disabled:bg-gray-100 disabled:before:bg-gray-400
                       dark:border-white/10 dark:bg-white/5
                       dark:checked:border-indigo-500 dark:checked:bg-indigo-500
                       dark:focus-visible:outline-indigo-500
                       dark:disabled:border-white/5 dark:disabled:bg-white/10 dark:disabled:before:bg-white/20
                       forced-colors:appearance-auto forced-colors:before:hidden
                       not-checked:before:hidden"
              />
              <label for="my" aria-label="Seleziona da Le mie molecole" class="cursor-pointer ml-3 block text-base/6 font-medium text-gray-900 dark:text-white">
                <span class="m-overlay-method-full">Seleziona da <span class="italic">Le mie molecole</span></span><span class="m-overlay-method-short">Le mie</span>
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
                       focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600
                       disabled:border-gray-300 disabled:bg-gray-100 disabled:before:bg-gray-400
                       dark:border-white/10 dark:bg-white/5
                       dark:checked:border-indigo-500 dark:checked:bg-indigo-500
                       dark:focus-visible:outline-indigo-500
                       dark:disabled:border-white/5 dark:disabled:bg-white/10 dark:disabled:before:bg-white/20
                       forced-colors:appearance-auto forced-colors:before:hidden
                       not-checked:before:hidden"
              />
              <label for="chembl" aria-label="Cerca e seleziona da ChEMBL DB" class="cursor-pointer ml-3 block text-base/6 font-medium text-gray-900 dark:text-white">
                <span class="m-overlay-method-full">Cerca e seleziona da ChEMBL DB</span><span class="m-overlay-method-short">ChEMBL</span>
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
                       focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600
                       disabled:border-gray-300 disabled:bg-gray-100 disabled:before:bg-gray-400
                       dark:border-white/10 dark:bg-white/5
                       dark:checked:border-indigo-500 dark:checked:bg-indigo-500
                       dark:focus-visible:outline-indigo-500
                       dark:disabled:border-white/5 dark:disabled:bg-white/10 dark:disabled:before:bg-white/20
                       forced-colors:appearance-auto forced-colors:before:hidden
                       not-checked:before:hidden"
              />
              <label for="my" aria-label="Seleziona da Le mie molecole" class="cursor-not-allowed ml-3 block text-base/6 font-medium text-gray-900 dark:text-white">
                <span class="m-overlay-method-full">Seleziona da <span class="italic">Le mie molecole</span></span><span class="m-overlay-method-short">Le mie</span>
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
                       focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600
                       disabled:border-gray-300 disabled:bg-gray-100 disabled:before:bg-gray-400
                       dark:border-white/10 dark:bg-white/5
                       dark:checked:border-indigo-500 dark:checked:bg-indigo-500
                       dark:focus-visible:outline-indigo-500
                       dark:disabled:border-white/5 dark:disabled:bg-white/10 dark:disabled:before:bg-white/20
                       forced-colors:appearance-auto forced-colors:before:hidden
                       not-checked:before:hidden"
              />
              <label for="chembl" aria-label="Cerca e seleziona da ChEMBL DB" class="cursor-not-allowed ml-3 block text-base/6 font-medium text-gray-900 dark:text-white">
                <span class="m-overlay-method-full">Cerca e seleziona da ChEMBL DB</span><span class="m-overlay-method-short">ChEMBL</span>
              </label>
            </div>
          }
        </div>
      </div>

      <!-- AREA CONTENUTO (deve poter restringersi con tastiera) -->
      <div class="m-add-content flex-1 min-h-0 overflow-hidden">
        @switch (method()) {

          @case ('my') {
            <div
              #scrollRoot
              class="m-add-list h-full min-h-0 overflow-y-auto py-6 m-ac-pad flex flex-col gap-4 m-scroll-thin"
            >
              @switch (step()) {

                @case (1) {
                  <div class="m-ac-pad space-y-3 sm:space-y-4">
                    <h2 class="font-semibold text-center sm:text-left">
                      Scegli le molecole da aggiungere alla collezione:
                    </h2>

                    <div class="m-search-center">
                      <m-search-input
                        class="block w-full max-w-[20rem] sm:max-w-none"
                        [value]="searchTerm()"
                        [useAltDarkStyle]="true"
                        (valueChange)="doQuery($event)"
                        (submitted)="doQuery($event)"
                        (cleared)="doClear()"
                      />
                    </div>

                    <div class="pt-2 sm:pt-4">
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
                          <m-progress-indicator />
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
                  <div class="px-6 py-6">
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
                        class="text-light-accent-primary-hc dark:text-dark-accent-secondary"
                        role="status"
                        aria-live="polite"
                      >
                        Molecole aggiunte con successo!
                      </span>
                    }
                  </div>
                }

              }
            </div>
          }

          @case ('chembl') {
            @switch (step()) {

              @case (1) {
                <div class="m-add-chembl-content h-full min-h-0 flex flex-col py-4 m-ac-pad gap-3">
                  <!-- SEARCH (fuori dallo scroll risultati, così sticky è stabile) -->
                  <div class="m-add-search shrink-0 bg-white dark:bg-dark-surface-main pb-2 space-y-2 text-center sm:text-left m-ac-pad">
                    <div class="m-add-instructions font-medium">Cerca su ChEMBL e seleziona:</div>
                    <div class="m-search-center">
                      <m-molecule-search-input
                        class="block w-full max-w-[20rem] sm:max-w-none"
                        [search_excludeAlreadyAdded]="true"
                        (onLoading)="chemblLoading.set($event)"
                        (onResult)="handleResults($event)"
                        (onError)="handleError($event)"
                        (onQuery)="onChemblQuery($event)"
                        (onEmpty)="chemblEmpty.set(true)"
                      />
                    </div>
                  </div>

                  <!-- CHIPS -->
                  @if (selectedMolecules.length) {
                  <details class="m-add-selections shrink-0 border-b" [open]="!viewport.overlayCompact()">
                    <summary class="cursor-pointer py-1 text-sm" aria-live="polite">{{ selectedMolecules.length }} molecole selezionate</summary>

                    <div
                      class="relative flex flex-col xs:flex-row xs:flex-wrap items-start xs:items-center gap-1 sm:gap-3 py-1 sm:py-3 px-1 m-chip-stack m-scroll-thin m-overscroll-touch"
                      role="list"
                      aria-label="Molecole selezionate"
                      aria-live="polite"
                    >
                      @for (m of selectedMolecules; track m.id) {
                        <span
                          role="listitem"
                          class="group inline-flex items-center max-w-full m-chip
                                 rounded-full
                                 bg-indigo-50 text-light-accent-primary-hc ring-1 ring-inset ring-light-accent-primary-hq/70
                                 dark:bg-indigo-500/20 dark:text-indigo-100 dark:ring-indigo-400/40
                                 shadow-sm"
                          title="{{ m.name }}"
                        >
                          <span class="truncate m-chip-text text-xs sm:text-sm font-medium">
                            {{ m.name }}
                          </span>

                          <button
                            type="button"
                            (click)="removeChip(m.id)"
                            class="shrink-0 inline-flex items-center justify-center rounded-full
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
                          class="inline-flex items-center m-chip-clear gap-1 sm:gap-2 rounded-full
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
                  </details>
                  }

                  <!-- RESULTS (unico scroll “vero”) -->
                  <div
                    class="m-add-results relative flex-1 min-h-0 overflow-y-auto overscroll-contain"
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
                <div class="flex-1 min-h-0 py-6 px-3 flex flex-col gap-4">
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
                      class="text-light-accent-primary-hc dark:text-dark-accent-secondary"
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
    </div>

    <!-- FOOTER -->
    <m-action-footer action-card-footer>
      @if (step() === 1) {
        <m-button
          action-footer-secondary
          variant="outline"
          (click)="close()"
        >
          Annulla
        </m-button>
      }

      <m-button
        action-footer-primary
        [disabled]="(isSelectedNothing() && this.method() === 'my') || (this.selectedIds.length === 0 && this.method() === 'chembl' || step_12_loading())"
        [loading]="step_12_loading()"
        (click)="step() === 1 ? dispatchSubmit() : close()"
        [attr.aria-label]="step() === 1 ? 'Aggiungi molecole' : 'Chiudi conferma'"
      >
        @if (step() === 1) {
          Aggiungi
        } @else if (step() === 2) {
          Ok
        }
      </m-button>
    </m-action-footer>
  </m-action-card>
</div>
`

})
export class AddMoleculesToCollectionComponent
  implements OnInit, AfterViewInit, OnDestroy {

  private readonly actionOverlayContext = inject(ActionOverlayContextService);
  private readonly addContext = inject(AddMoleculesToCollectionContextService);
  protected readonly viewport = inject(ViewportRuntimeService);
  private readonly sessionId = this.actionOverlayContext.session('AddMoleculesToCollection')?.id ?? -1;
  private readonly invalidation = inject(DomainInvalidationService);
  private readonly moleculeCollectionItemService = inject(MoleculeCollectionItemService);
  private readonly moleculeCollectionService = inject(MoleculeCollectionService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly moleculeSearchService = inject(MoleculeSearchService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly selection = new AddMoleculesSelectionController();
  private readonly pageController = new PaginationController<MoleculeCardItemModel>({
    fetch: (page, query) => this.moleculeCollectionItemService
      .getAllPaginatedItems(page, 20, query, true, this.addContext.collectionId())
      .pipe(
        debounceTime(100),
        map(result => ({ ...result, items: result.items.map(mol => Helpers.moleculeClientToCardConverter(mol)) }))
      )
  });
  private readonly submitController = new AddMoleculesSubmitController();
  private readonly chemblSearch = new AddMoleculesSearchController(query => {
    const collectionId = this.addContext.collectionId();
    return collectionId
      ? this.moleculeCollectionItemService.searchChemblMolecules_excludeAlreadyAdded(query, collectionId, 100)
      : this.moleculeSearchService.searchMolecule(query, 100);
  });
  readonly pagination: AddMoleculesPaginationPort = {
    loadMore: () => this.loadMore(),
    reset: () => this.resetPagination(),
    query: query => this.query(query),
    clear: () => this.clear()
  };
  readonly multiselectItems = signal<AbstractMultiselectItem<MoleculeCardItemModel>[]>([]);
  readonly isSelectedAll = computed(() => this.selection.mode() === 'all' && this.selection.excludedIds().size === 0);
  readonly isSelectedNothing = computed(() => this.selection.isNothingSelected());
  readonly isPartiallySelected = computed(() => this.selection.isPartiallySelected());
  get items(): MoleculeCardItemModel[] { return this.pageController.items() }
  get loading(): boolean { return this.pageController.loading() }
  get done(): boolean { return this.pageController.done() }
  get earlyDone(): boolean { return this.pageController.earlyDone() }
  get page(): number { return this.pageController.page() }
  get empty(): ReturnType<typeof signal<boolean>> { return this.pageController.empty }
  get searchTerm(): ReturnType<typeof signal<string>> { return this.pageController.query }

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
  protected readonly sentinel = viewChild<ElementRef<HTMLDivElement>>('sentinel');
  private observer?: IntersectionObserver;

  constructor() {
    effect(() => {
      this.pageController.items();
      queueMicrotask(() => {
        if (!this.destroyRef.destroyed && this.method() === 'my') this.loadRows();
      });
    });
    effect(() => {
      const method = this.method();
      untracked(() => {
        this.observer?.disconnect();
        this.chemblSearch.clear();
        this.clearSelections();
        this.clearChips();
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
    this.methodControl = new FormControl<'my' | 'chembl'>(defaultMethod, { nonNullable: true });
    this.metCtrlSub = this.methodControl.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(val => this.method.set(val));
    queueMicrotask(() => {
      const collectionId = this.addContext.collectionId();
      if (!collectionId) {
        this.close();
        return;
      }
      this.colSub = this.moleculeCollectionService.getCollectionById(collectionId).pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe({
        next: (col) => this.collection.set(col),
        error: () =>
          queueMicrotask(() => {
            this.close();
            this.toast.trigger('Si è verificato un errore. Se si ripete, contatta il supporto', 'error', 3000);
          })
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
    this.selection.toggle(visibleItem.item.id, visibleItem.isChecked());
  }

  onSelectAllChange(checked: boolean): void {
    if (checked) {
      this.selection.selectAll();
    } else {
      this.selection.clearVisibleSelection();
    }
    this.multiselectItems().forEach(row => row.isChecked.set(checked));
  }

  clearSelections(): void {
    this.selection.reset();
    this.multiselectItems().forEach(row => row.isChecked.set(false));
  }

  doQuery(q: string): void { this.pageController.setQuery(q); }
  doClear(): void { this.pageController.clear(); }
  private loadRows(): void {
    const existing = new Map(this.multiselectItems().map(row => [row.item.id, row]));
    this.multiselectItems.set(this.items.map(item => existing.get(item.id) ?? {
      item,
      isChecked: signal(this.selection.isSelected(item.id))
    }));
  }
  loadMore(): Promise<void> {
    return this.pageController.loadMore().then(() => {
      if (!this.destroyRef.destroyed && this.method() === 'my') this.loadRows();
    });
  }
  resetPagination(): void { this.pageController.reset(); this.multiselectItems.set([]); }
  query(q: string): void { this.doQuery(q); }
  clear(): void { this.doClear(); }
  paginationState() { return this.pageController.paginationState(); }
  retryPagination(): void { this.pageController.retry(); }
  private startObserver(): void {
    if (this.destroyRef.destroyed || this.method() !== 'my' || this.step() !== 1) return;
    const sentinel = this.sentinel()?.nativeElement;
    if (!sentinel) return;
    this.observer?.disconnect();
    this.observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting && this.method() === 'my' && this.step() === 1 && !this.pageController.error()) {
        void this.loadMore();
      }
    }, { root: this.paginationScrollRoot(), rootMargin: '0px 0px 500px 0px' });
    this.observer.observe(sentinel);
  }

  private paginationScrollRoot(): HTMLElement | null {
    const root = this.root()?.nativeElement;
    const state = this.viewport.state();
    return state.visualWidth < 768 || this.viewport.overlayCompact()
      ? root?.closest<HTMLElement>('.m-action-card') ?? null : root ?? null;
  }

  close(): void {
    this.actionOverlayContext.close(this.sessionId);
  }

  private doSubmit(): void {
    const collectionId = this.addContext.collectionId();
    if (!collectionId) {
      this.error.set(true);
      return;
    }
    if (this.step() === 1) {
      if (this.isSelectedNothing()) {
        return;
      }

      this.step_12_loading.set(true);

      this.suSub1 = this.submitController
        .submitExisting(
          this.moleculeCollectionItemService,
          collectionId,
          this.selection
        )
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (ok) => {
            this.step_12_loading.set(false)
            if (ok) {
              this.invalidation.publish({
                domain: 'molecule-collection',
                action: 'molecules-added',
                collectionId: this.addContext.collectionId()!
              })
              this.toast.trigger(`Molecole aggiunte con successo alla collezione${this.collection()?.name ? " '" + this.collection()?.name + "'" : ''}`, 'success')
            }
            this.error.set(!ok)
            const cId = this.addContext.collectionId()
            if (this.addContext.redirectToCollectionPath()) {
              void this.router.navigateByUrl(`/molecules/collections/detail/${cId}`);
            }
            this.actionOverlayContext.close(this.sessionId)
          },
          error: () => {
            this.step_12_loading.set(false)
            this.error.set(true)
            this.step.set(2)
          }
        });
    } else {
      this.actionOverlayContext.close(this.sessionId);
    }
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
    this.selection.addChip(chip);
  }

  onChemblQuery(raw: string) {
    this.chemblSearch.setQuery(raw);
  }

  removeChip(id: string) {
    this.selection.removeChip(id);
  }

  clearChips() {
    this.selection.clearChips();
  }

  onEmpty(): void {
    this.chemblSearch.clear();
  }

  handleResults(results: MoleculeSearchResult[] | PageModel<MoleculeCardItemModel>): void {
    if (Array.isArray(results)) {
      this.chemblSearch.setResults(results);
      return;
    }
    this.chemblSearch.setResults([]);
  }

  handleError(err: unknown): void {
    this.chemblSearch.setError(err);
  }

  private doSubmitChembl(): void {
    const collectionId = this.addContext.collectionId();
    if (!collectionId) {
      this.error.set(true);
      return;
    }
    this.suSub2 = this.submitController
      .submitChembl(
        this.moleculeCollectionItemService,
        collectionId,
        this.selection
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ok => {
          this.step_12_loading.set(false);
          if (ok) {
            this.invalidation.publish({
              domain: 'molecule-collection',
              action: 'molecules-added',
              collectionId
            });
          }
          this.error.set(!ok);
          const cId = this.addContext.collectionId();
          const shouldRedirect = this.addContext.redirectToCollectionPath();
          if (shouldRedirect) {
            this.router.navigateByUrl(`/molecules/collections/detail/${cId}`);
          }
          this.actionOverlayContext.close(this.sessionId);
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
