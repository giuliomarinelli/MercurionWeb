import {
  Component, Input, signal, effect, ElementRef, OnDestroy, NgZone, inject,
  computed,
  Output,
  EventEmitter
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe, NgClass, DatePipe } from '@angular/common';
import { MoleculeViewerComponent } from '../../chem/molecule-viewer/molecule-viewer.component';
import { SearchContextService } from '../../../services/context/search-context.service';
import { ThemeManagerService } from '../../../services/context/theme-manager.service';
import { MoleculeCardItemModel } from './../../../Models/graphql/molecule-collection/molecule-collection.types';
import { CustomDetailsComponent } from '../my-molecule-custom-details/custom-details.component';
import { CustomDetailSaveModel } from '../../../Models/custom-detail-save.model';
import { TypeGuardsService } from '../../../services/type-guards.service';
import { switchMap } from 'rxjs/operators';
import { HistoryContextService } from '../../../services/context/history-context.service';
import { Subscription } from 'rxjs';
import { MoleculeCollectionItemService } from '../../../services/graphql/molecule-collection-item.service';
import { MoleculeBadgeComponent } from '../molecule-badge/molecule-badge.component';
import { DesignService } from '../../../services/design.service';
import { AppContextService } from '../../../services/context/app-context.service';

@Component({
  selector: 'm-molecule-collection-item-card',
  imports: [
    DecimalPipe,
    DatePipe,
    RouterLink,
    MoleculeViewerComponent,
    NgClass,
    CustomDetailsComponent,
    MoleculeBadgeComponent
  ],
  template: `
  @if (_molecule()) {
    <div class="relative">
      <!-- CONTENUTO CARD (container relativo) -->
      <div
        class="
          relative  /* necessario per posizionare l'overlay interno */
          grid grid-cols-1 md:grid-cols-12 items-center gap-3 md:gap-4
          rounded-2xl border p-4 md:p-5
          bg-slate-100 dark:bg-slate-800/50 backdrop-blur-sm
          border-slate-200/70 dark:border-slate-700/60
          transition-all duration-300 overflow-hidden
          hover:shadow-md hover:-translate-y-0.5
          hover:border-indigo-300/50 dark:hover:border-indigo-400/30
          focus-within:ring-2 focus-within:ring-indigo-500/70
        "
        [ngClass]="{
          'bg-slate-100/50 dark:bg-slate-800/40': _i() % 2 !== 0,
          'fade-out': _triggerDisappear(),
          'collapse': _collapse(),
          'cursor-default': _isReadonly()
        }"
        aria-label="Card molecola {{ _molecule()!.name }}"
        role="article"
        [attr.aria-live]="_isReadonly() ? 'off' : 'polite'"
      >
        <!-- OVERLAY CLICKABLE: copre tutta la card, tranne i bottoni con z-index maggiore -->
        <a
          class="absolute inset-0 rounded-2xl"
          [class.z-10]="!_isReadonly()"
          [class.pointer-events-none]="_isReadonly()"
          [class.hidden]="_triggerDisappear()"
          [routerLink]="_pathToMolecule()"
          [queryParams]="{ c_id: _collectionId() }"
          (click)="handleCardClick()"
          aria-label="Apri molecola {{ _molecule()!.name }}"
          [attr.aria-disabled]="_isReadonly()"
        ></a>

        <!-- Colonna sinistra: testo -->
        <div class="md:col-span-8 min-w-0">
          @if (_molecule()!.type === 'chembl') {
            <div
              class="text-base md:text-lg font-semibold text-slate-800 dark:text-slate-100 truncate"
              title="{{ _molecule()!.name }}"
              >
              <div class="flex items-center gap-4">
                <span>{{ _molecule()!.name }}</span>
                <m-molecule-badge [name]="'ChEMBL'" />
              </div>
            </div>
          } @else if (_molecule()!.type === 'custom') {
            <!-- Il figlio mette i bottoni sopra l'overlay grazie a z-30 -->
            <m-custom-details
              [type]="'cardName'"
              [value]="_molecule()!.name"
              class="block"
              [itemId]="_molecule()!.id"
              [isReadonly]="_isReadonly()"
              (onSaving)="doSave($event)"
            />
          }

          <div
            class="mt-0.5 text-xs md:text-sm text-slate-700 dark:text-slate-200 truncate"
            [innerHTML]="_molecule()!.syn"
            title="{{ _molecule()!.syn }}"
          ></div>

            <div class="mt-2 flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 text-xs">
            @if (_molecule()!.mwFreebase) {
              <span
                class="inline-flex items-center rounded-full px-2 py-1
                       bg-slate-50 dark:bg-slate-700/60
                       text-slate-700 dark:text-slate-200 border
                       border-slate-300/80 dark:border-slate-600/60"
              >
                MW:&nbsp;{{ _molecule()!.mwFreebase | number:'1.0-1' }}
              </span>
            }
            @if (_molecule()!.maxPhase) {
              <span
                class="inline-flex items-center rounded-full px-2 py-1
                       bg-amber-50 text-amber-800 border border-amber-200/70
                       dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-700/40"
              >
                Phase&nbsp;{{ _molecule()!.maxPhase }}
              </span>
            }
          </div>
        </div>

        <!-- Colonna destra: viewer -->
        <div class="md:col-span-4 flex md:justify-end items-center">
          <div class="relative size-24 md:size-28 rounded-xl overflow-hidden border
                      border-slate-200/70 dark:border-slate-700/60 bg-white/40 dark:bg-slate-900/30">
            @if (!viewerReady()) {
              <div class="absolute inset-0 z-20 animate-pulse
                          bg-slate-200/80 dark:bg-slate-700/70"></div>
            }
            <m-molecule-viewer
              class="absolute inset-0 w-full h-full"
              [structure]="_molecule()!.smiles"
              [disablePreview]="disablePreview()"
              (rendered)="viewerReady.set(true)">
            </m-molecule-viewer>
          </div>
        </div>

          <!-- Footer meta -->
        @if(!_isReadonly()) {
          <div
          class="md:col-span-12 mt-1 md:mt-0 flex flex-col sm:flex-row gap-3 sm:gap-3 justify-between items-start sm:items-center text-xs text-slate-700 dark:text-slate-200 relative w-full"
          >
            <!-- Colonna sinistra: date -->
            <div class="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 sm:gap-3 relative z-30 pointer-events-auto w-full sm:w-auto">
              <div class="inline-flex items-center shrink-0">
                <svg
                  class="size-3.5 mr-1.5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    d="M6 2a1 1 0 0 1 1 1v1h6V3a1 1 0 1 1 2 0v1h1a2 2 0 0 1 2 2v1H3V6a2 2 0 0 1 2-2h1V3a1 1 0 0 1 1-1z"
                  />
                  <path d="M3 8h14v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" />
                </svg>
                {{ _molecule()!.createdAt | date : 'dd/MM/yyyy HH:mm:ss' }}
              </div>

              <div class="size-1 rounded-full bg-slate-300 dark:bg-slate-600"></div>

              <div class="inline-flex items-center shrink-0">
                <svg
                  class="size-3.5 mr-1.5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    d="M10 2a8 8 0 1 0 8 8 8.01 8.01 0 0 0-8-8Zm.75 4.75a.75.75 0 0 0-1.5 0v3.69l2.72 2.72a.75.75 0 0 0 1.06-1.06l-2.28-2.28V6.75Z"
                  />
                </svg>
                {{ _molecule()!.updatedAt | date : 'dd/MM/yyyy HH:mm:ss' }}
              </div>
            </div>

            @if (!_hideActions()) {
              <!-- Colonna destra: pulsanti -->
              <div class="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 sm:gap-3 relative z-30 pointer-events-auto w-full sm:w-auto justify-start sm:justify-end">
                <!-- Duplica -->
               <a
                 type="button"
                 class="relative z-30 p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700
                        transition-colors duration-150"
                 title="Crea una nuova molecola da questa struttura (Duplica)"
                 [routerLink]="pathToDuplicate().url"
                 [queryParams]="pathToDuplicate().queryParams"
                  aria-label="Duplica molecola {{ _molecule()!.name }}"
                >
                  <svg
                    class="size-4 text-slate-700 dark:text-slate-200"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      d="M4 4a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1h-1V4a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h1v1H6a2 2 0 0 1-2-2V4z"
                    />
                    <path
                      d="M8 6a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2V6z"
                    />
                  </svg>
                </a>

                <!-- Elimina -->
               <button
                 type="button"
                 class="relative z-30 p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700
                        transition-colors duration-150"
                 title="Elimina da tutte le collezioni"
                 (click)="doDelete()"
                  aria-label="Elimina molecola {{ _molecule()!.name }}"
                >
                  <svg
                    class="size-4 text-light-error dark:text-dark-error-hc"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M6 8a1 1 0 0 1 1 1v7h6V9a1 1 0 1 1 2 0v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a1 1 0 0 1 1-1zM4 5a1 1 0 0 1 1-1h2V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1h2a1 1 0 0 1 1 1v1H4V5z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </button>
                @if (_collectionId()) {
                  <!-- 🧩 Rimuovi dalla collezione -->
                 <button
                   type="button"
                   class="flex items-center gap-2 relative z-30 px-3 py-1 rounded-md border border-slate-400 dark:border-slate-500
                          text-slate-700 dark:text-slate-200 text-xs font-medium
                          hover:bg-slate-200 dark:hover:bg-slate-700
                          transition-colors duration-150"
                   title="Rimuovi dalla collezione"
                   (click)="doRemoveFromCollection()"
                    aria-label="Rimuovi {{ _molecule()!.name }} da questa collezione"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-4 w-auto">
                      <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                      <path d="M96 304L544 304L544 336L96 336L96 304z"/>
                    </svg>
                    <span>Rimuovi da questa collezione</span>
                  </button>
                }
              </div>
            }
          </div>
          }
      </div>
    </div>
  }
`

})
export class MoleculeCollectionItemCardComponent implements OnDestroy {
  // ======================= DEPS =======================
  protected readonly searchContext = inject(SearchContextService)
  private readonly themeManager = inject(ThemeManagerService)
  private readonly zone = inject(NgZone)
  private readonly host = inject(ElementRef<HTMLElement>)
  private readonly typeGuards = inject(TypeGuardsService)
  private readonly historyContext = inject(HistoryContextService)
  private readonly moleculeCollectionItemService = inject(MoleculeCollectionItemService)
  private readonly design = inject(DesignService)
  private readonly appContext = inject(AppContextService)
  // ====================================================

  /* inputs ---------------------------------- */
  @Input({ required: true })
  set molecule(m: MoleculeCardItemModel) {
    this.seen = false
    this.viewerReady.set(false)
    this.disablePreview.set(true)
    this._molecule.set(m)
    this._pathToMolecule.set(`/molecules/detail/${m.id}`)

    this.zone.runOutsideAngular(() => this.io.observe(this.host.nativeElement));
  }

  @Input({ required: true })
  set i(i: number) {
    this._i.set(i)
  }

  @Input()
  set collectionId(collectionId: string) {
    this._collectionId.set(collectionId)
  }

  @Input()
  set isReadonly(isReadonly: boolean) {
    this._isReadonly.set(isReadonly)
  }

  @Input()
  set hideActions(hideActions: boolean) {
    this._hideActions.set(hideActions)
  }

  @Input()
  set triggerDisappear(triggerDisappear: boolean) {
    this._triggerDisappear.set(triggerDisappear)
  }

  @Input()
  set collapse(collapse: boolean) {
    this._collapse.set(collapse)
  }

  /* outputs ---------------------------------- */

  @Output()
  onDelete = new EventEmitter<string>()

  @Output()
  onRemoveFromCollection = new EventEmitter<string>()


  private upNaSub?: Subscription

  _collectionId = signal<string | null>(null)
  _molecule = signal<MoleculeCardItemModel | undefined>(undefined);
  _pathToMolecule = signal<string>('');
  _i = signal<number>(0);
  isDarkMode = signal<boolean>(false);
  viewerReady = signal<boolean>(false);
  /** viewer OFF finché true */
  disablePreview = signal<boolean>(true);
  _isReadonly = signal<boolean>(false)
  pathToDuplicate = computed(() => ({
    url: `/molecules/editor`,
    queryParams: {
      mode: 'duplicate',
      smiles: this._molecule()!.smiles
    }
  }))
  _triggerDisappear = signal<boolean>(false)
  _collapse = signal<boolean>(false)
  _hideActions = signal<boolean>(false)

  isMobile = computed<boolean>(() => this.design.maxBk('sm')())

  private seen = false;
  private io!: IntersectionObserver;

  constructor() {
    effect(() => this.isDarkMode.set(this.themeManager.theme() === 'dark'));

    this.zone.runOutsideAngular(() => {
      this.io = new IntersectionObserver(
        ([entry], observer) => {
          if (entry.isIntersecting && !this.seen) {
            this.seen = true;
            observer.unobserve(entry.target);
            this.zone.run(() => this.disablePreview.set(false));
          }
        },
        { rootMargin: '150px', threshold: 0.01 }
      );

      const isInViewport = (el: HTMLElement) =>
        el.getBoundingClientRect().top < window.innerHeight + 150;

      queueMicrotask(() => {
        if (this.disablePreview() && isInViewport(this.host.nativeElement)) {
          this.zone.run(() => this.disablePreview.set(false));
        }
      })

      this.io.observe(this.host.nativeElement);
    })
  }

  doSave(e: CustomDetailSaveModel): void {
    if (e.type === 'cardName') {
      const { id, value: name } = e
      this.updateName(id, name, 'custom')
    }
  }

  private updateName(id: string, name: string, type: 'chembl' | 'custom'): void {
    console.log(id, name, type)
    if (this.typeGuards.isString(id) && this.typeGuards.isCustomMoleculeType(type)) {
      this.upNaSub = this.moleculeCollectionItemService.updateItemName(id, name, type).pipe(
        switchMap(() => this.historyContext.pollNewItem())
      ).subscribe(() => {/* pass */ })
    }
  }

  doDelete(): void {
    this.onDelete.emit(this._molecule()!.id)
  }

  doRemoveFromCollection(): void {
    this.onRemoveFromCollection.emit(this._molecule()!.id)
  }

  handleCardClick(): void {
    queueMicrotask(() => {
      if (this.isMobile()) {
        this.appContext.notifyAddedTriggerCloseOffCanvasMenu()
      }
      this.searchContext.close()
    })
  }

  ngOnDestroy() {
    this.io?.disconnect();
    this.upNaSub?.unsubscribe()
  }
}
