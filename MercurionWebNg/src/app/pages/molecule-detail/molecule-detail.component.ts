import { MyMoleculeCustomDetailSaveModel } from './../../Models/my-molecule-custom-detail-save.interface';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { EmbeddingService } from './../../services/embedding.service';
import { SimilarsComponent } from './../../components/molecule-detail/similars/similars.component';
import { Component, DestroyRef, effect, inject, OnDestroy, OnInit, Signal, signal, WritableSignal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MoleculeService } from '../../services/graphql/molecule.service';
import { switchMap, Observable, catchError, of, Subscription, forkJoin, retry, tap, distinctUntilChanged, shareReplay, startWith, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { AsyncPipe } from '@angular/common';
import { ThemeManagerService } from '../../services/context/theme-manager.service';
import { MoleculeHeaderComponent } from '../../components/molecule-detail/molecule-header/molecule-header.component';
import { MoleculeViewerComponent } from '../../components/chem/molecule-viewer/molecule-viewer.component';
import { MoleculePropertiesComponent } from '../../components/molecule-detail/molecule-properties/molecule-properties.component';
import { MoleculeRoutesComponent } from '../../components/molecule-detail/molecule-routes/molecule-routes.component';
import { MoleculeSynonymsComponent } from '../../components/molecule-detail/molecule-synonyms/molecule-synonyms.component';
import { MoleculeCtaChemblComponent } from '../../components/molecule-detail/molecule-cta-chembl/molecule-cta-chembl.component';
import { T1PredictionCardComponent } from '../../components/molecule-detail/t1-prediction-card/t1-prediction-card.component';
import { UserContextService } from '../../services/context/user-context.service';
import { MercurionAiService as MercurionAIService } from '../../services/mercurion-ai.service';
import { EditingLayerComponent } from '../../components/molecule-detail/editing-layer/editing-layer.component';
import { MoleculeSearchResult } from '../../Models/graphql/molecule-search/molecule-search-result.interface';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TypeGuardsService } from '../../type-guards.service';
import { MoleculeCollectionItemService } from '../../services/graphql/molecule-collection-item.service';
import { MoleculeCollectionItemEntityShort, MoleculeDetailItem } from '../../Models/graphql/molecule-collection/molecule-collection.types';
import { ClassicSpinnerComponent } from '../../components/common/classic-spinner/classic-spinner.component';
import { MyMoleculeCustomDetailsComponent } from '../../components/molecule-detail/my-molecule-custom-details/my-molecule-custom-details.component';
import { MoleculeDetailSystem } from '../../Models/graphql/molecule.detail.models';
import { ToastService } from '../../services/toast.service';
import { MyMoleculeJoinComponent } from '../../components/molecule-detail/my-molecule-join/my-molecule-join.component';


@Component({
  selector: 'app-molecule-detail',
  standalone: true,
  imports: [
    AsyncPipe,
    MoleculeHeaderComponent,
    MoleculeViewerComponent,
    MoleculePropertiesComponent,
    MoleculeRoutesComponent,
    MoleculeSynonymsComponent,
    MoleculeCtaChemblComponent,
    T1PredictionCardComponent,
    EditingLayerComponent,
    SimilarsComponent,
    ReactiveFormsModule,
    ClassicSpinnerComponent,
    MyMoleculeCustomDetailsComponent,
    MyMoleculeJoinComponent
  ],
  template: `
    @if (molecule$ | async; as molecule) {

      <section class="max-w-5xl mx-auto p-0 xs:p-4 sm:p-6 md:p-8 space-y-12">

        @if (!typeGuards.isSystemMolecule(molecule)) {
        <h1 class="relative bottom-4 text-3xl md:text-4xl lg:text-[2.65rem] font-semibold tracking-wider text-center sm:text-left text-light-accent-secondary dark:text-dark-accent-secondary border-b border-slate-300 dark:border-slate-700 pb-6">
          Le mie molecole
        </h1>
        }

        @if (typeGuards.isSystemMolecule(molecule)) {
          <molecule-header
            [nameInput]="molecule.preferredName"
            [chemblIdInput]="molecule.cmbId"
          />
        } @else if (typeGuards.isChemblMolecule(molecule)) {
          <molecule-header
            [nameInput]="molecule.chemblDetails.preferredName"
            [chemblIdInput]="molecule.chemblDetails.cmbId"
            [myMol]="true"
          />
        } @else if (typeGuards.isCustomMolecule(molecule)) {
          <molecule-header
            [nameInput]="molecule.name ?? 'Lead'"
            [myMol]="true"
            [isCustom]="true"
            (onSave)="doUpdateInlineDetails($event)"
          />
        }



        <section>
          @if (!typeGuards.isSystemMolecule(molecule)) {
            <app-my-molecule-custom-details (onSave)="doUpdateInlineDetails($event)" [type]="'label'" [value]="molecule.label ?? '—'" />
            <app-my-molecule-custom-details (onSave)="doUpdateInlineDetails($event)" [type]="'notes'" [value]="molecule.notes ?? '—'" />
              @if (molecule.joins) {
                <h2 class="font-semibold my-6 sm:top-14 text-light-accent-primary dark:text-dark-accent-primary text-center sm:text-left text-xl">
                  Questa molecola fa parte delle seguenti collezioni:
                </h2>
                <section class="rounded-md border border-slate-300 dark:border-slate-600">
                  <app-my-molecule-join [joins]="molecule.joins" />
                </section>

              }
          }
          @if (userContext.initials()) {
            <a
              class="flex justify-center mx-auto sm:mx-0 text-sm w-fit 2xs:text-base xs:w-[370px] gap-2 items-center px-4 mt-6 py-2 text-white rounded-md transition-colors duration-150
               bg-emerald-600
               hover:bg-emerald-400/90 dark:hover:bg-emerald-600/90"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current w-6 h-6">
                <!--!Font Awesome Pro v7.0.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                <path d="M320 112C434.9 112 528 205.1 528 320C528 434.9 434.9 528 320 528C205.1 528 112 434.9 112 320C112 205.1 205.1 112 320 112zM320 576C461.4 576 576 461.4 576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320C64 461.4 178.6 576 320 576zM296 408C296 421.3 306.7 432 320 432C333.3 432 344 421.3 344 408L344 344L408 344C421.3 344 432 333.3 432 320C432 306.7 421.3 296 408 296L344 296L344 232C344 218.7 333.3 208 320 208C306.7 208 296 218.7 296 232L296 296L232 296C218.7 296 208 306.7 208 320C208 333.3 218.7 344 232 344L296 344L296 408z"/>
              </svg>
              <span class="text-slate-100">Aggiungi ad una collezione</span>
            </a>
          }
          <h2 class="font-semibold text-light-accent-primary dark:text-dark-accent-primary mt-6 mb-4 text-center sm:text-left text-xl">
            Struttura
          </h2>
          <div class="overflow-x-auto flex justify-center sm:justify-start">
            <div class="
              flex-shrink-0
              w-auto
              h-[140px]
              2xs:h-[165px]
              xs:h-[185px]
              sm:h-[215px]
              md:h-[235px]
              lg:h-[300px]
              overflow-hidden
              relative

              ">

              @if (!viewerReady()) {
                <div class="absolute inset-0 z-10 animate-pulse
                      bg-slate-200 dark:bg-slate-700"></div>
              }
                @if (typeGuards.isSystemMolecule(molecule)) {
                  <molecule-viewer
                    [mode]="'detail'"
                    class="w-full h-full"
                    [structure]="molecule.canonicalSmiles"
                    (rendered)="viewerReady.set(true)"
                  />
                } @else if (typeGuards.isChemblMolecule(molecule)) {
                  <molecule-viewer
                    [mode]="'detail'"
                    class="w-full h-full"
                    [structure]="molecule.chemblDetails.canonicalSmiles"
                    (rendered)="viewerReady.set(true)"
                  />
                } @else if (typeGuards.isCustomMolecule(molecule)) {
                  <molecule-viewer
                    [mode]="'detail'"
                    class="w-full h-full"
                    [structure]="molecule.canonicalSmiles"
                    (rendered)="viewerReady.set(true)"
                  />
                }
            </div>
          </div>
        </section>
          @if (typeGuards.isSystemMolecule(molecule) || typeGuards.isChemblMolecule(molecule)) {
            <h2 class="font-semibold relative top-[28px] sm:top-14 text-light-accent-primary dark:text-dark-accent-primary text-center sm:text-left text-xl">
                Analoghi suggeriti
            </h2>

            <div class="flex gap-3 relative top-2 sm:top-4 justify-center sm:justify-start">
              <div class="flex-col sm:flex-row flex h-6 shrink-0 justify-center gap-y-1 sm:items-center">
                <!-- wrapper visivo -->
                <label class="relative inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    id="onlyKnown"
                    type="checkbox"
                    name="onlyKnown"
                    aria-describedby="experimental-compounds-description"
                    class="peer sr-only"
                    [formControl]="onlyKnown"
                  />

                  <span
                    class="inline-block size-4 rounded-sm border
                           border-gray-300 bg-white
                           peer-checked:bg-indigo-600 peer-checked:border-indigo-600
                           dark:border-white/10 dark:bg-white/5
                           dark:peer-checked:bg-indigo-500 dark:peer-checked:border-indigo-500"
                    aria-hidden="true"
                  ></span>

                  <svg
                    viewBox="0 0 14 14"
                    fill="none"
                    class="pointer-events-none hidden peer-checked:block
                           absolute left-[2px] top-1/2 -translate-y-1/2 size-3.5 z-10"
                    aria-hidden="true"
                  >
                    <path d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-white"/>
                  </svg>

                  <span class="text-sm font-medium text-gray-900 dark:text-white">Mostra solo composti noti</span>
                </label>
                <p
                  id="comments-description"
                  class="text-xs sm:text-[0.625rem] md:text-sm text-gray-500 dark:text-gray-400 ml-2 mb-1 sm:mb-0 text-center sm:text-start"
                >
                  <span class="sm:hidden">Deselezionando questa opzione <br /> potrai vedere anche i lead sperimentali</span>
                  <span class="hidden sm:inline">Deselezionando questa opzione potrai vedere anche i lead sperimentali</span>
                </p>
              </div>
            </div>


            <section class="rounded-md border border-slate-300 dark:border-slate-600 relative bottom-4">
              <app-similars [molecules]="similarMols() ?? []" [onlyKnown]="onlyKnownSig()" />
            </section>
          }

        @if (userContext.initials() !== '') {
            @if (typeGuards.isSystemMolecule(molecule) || typeGuards.isCustomMolecule(molecule)) {
              <app-editing-layer [smiles]="molecule.canonicalSmiles" />
            } @else if (typeGuards.isChemblMolecule(molecule)) {
              <app-editing-layer [smiles]="molecule.chemblDetails.canonicalSmiles" />
            }
          <app-t1-prediction-card [inference]="molecule.t1Inference" />
        }

        @if (typeGuards.isSystemMolecule(molecule) || typeGuards.isCustomMolecule(molecule)) {
          <molecule-properties [properties]="molecule.properties" />
        } @else if (typeGuards.isChemblMolecule(molecule)) {
          <molecule-properties [properties]="molecule.chemblDetails.properties" />
        }
        @if (typeGuards.isSystemMolecule(molecule)) {
          <molecule-routes [adminRoutesInput]="molecule.administrationRoutes" />
        } @else if (typeGuards.isChemblMolecule(molecule)) {
          <molecule-routes [adminRoutesInput]="molecule.chemblDetails.administrationRoutes" />
        }
        @if (typeGuards.isSystemMolecule(molecule)) {
          <molecule-synonyms [synonymsInput]="molecule.synonyms" />
        } @else if (typeGuards.isChemblMolecule(molecule)) {
          <molecule-synonyms [synonymsInput]="molecule.chemblDetails.synonyms" />
        }

        @if (typeGuards.isSystemMolecule(molecule)) {
          <molecule-cta-chembl [chemblId]="molecule.cmbId" />
        } @else if (typeGuards.isChemblMolecule(molecule)) {
          <molecule-cta-chembl [chemblId]="molecule.chemblDetails.cmbId" />
        }
      </section>
      } @else if (fetchError()) {
        <section class="max-w-4xl mx-auto p-6">
          <p class="text-light-error dark:text-dark-error text-sm">Si è verificato un errore nel caricamento della molecola</p>
        </section>
      } @else {
        <section class="absolute inset-0 flex justify-center items-center">
          <app-classic-spinner [size]="85" />
        </section>
      }
  `,
})
export class MoleculeDetailComponent implements OnInit, OnDestroy {

  // ======================= DEPS =======================
  private readonly route = inject(ActivatedRoute)
  private readonly moleculeService = inject(MoleculeService)
  protected readonly themeManager = inject(ThemeManagerService)
  protected readonly userContext = inject(UserContextService)
  private readonly mercurionAIService = inject(MercurionAIService)
  private readonly embeddingService = inject(EmbeddingService)
  private readonly destroyRef = inject(DestroyRef)
  protected readonly typeGuards = inject(TypeGuardsService)
  private readonly moleculeCollectionItemService = inject(MoleculeCollectionItemService)
  private readonly toast = inject(ToastService)
  // ====================================================

  private mode = signal<'SYSTEM' | 'USER'>('SYSTEM')

  private readonly uuidV7Re = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;


  molecule$!: Observable<MoleculeDetailItem | null>
  viewerReady = signal<boolean>(false)
  similarViewerReady = signal<boolean>(false)
  fetchError = signal<boolean>(false)
  similarMols = signal<MoleculeSearchResult[] | undefined>(undefined)
  similarMolsCache = signal<MoleculeSearchResult[]>([])
  fetchMolLoading = signal<boolean>(true)
  private molCached?: MoleculeDetailItem
  private molId!: string | number
  private molType!: 'system' | 'chembl' | 'custom'

  private onlySub?: Subscription
  private upLaSub?: Subscription
  private upNoSub?: Subscription
  private upNaSub?: Subscription

  onlyKnown = new FormControl<boolean>(true, { nonNullable: true })

  onlyKnownSig: Signal<boolean> = toSignal(
    this.onlyKnown.valueChanges,
    { initialValue: this.onlyKnown.value }
  )

  constructor() {
    this.fetchData()
    effect(() => {
      window.addEventListener('storage', this.handleCrossTabFetchData)
    })
    effect(() => {
      this.similarMols.set(this.onlyKnownSig() ? this.similarMolsCache().filter(mol => mol.known) : this.similarMolsCache())
    })
    effect(() => {
      if (!this.userContext.initials()) {
        this.fetchData()
      }
    })
  }

  private handleCrossTabFetchData(e: StorageEvent): void {
    this.fetchData()
    this.fetchSimilar()
  }

  private fetchData(): void {
    this.molecule$ = this.route.paramMap.pipe(
      // 1) Carico un elemento polimorfico: System detail OPPURE Collection item
      switchMap((params): Observable<MoleculeDetailItem | null> => {
        this.viewerReady.set(false);

        const molId = params.get('molId');
        if (!molId) {
          this.fetchError.set(true)
          return throwError(() => new Error('UndefinedMolregno'));
        }
        this.molId = molId
        const isUUID = this.uuidV7Re.test(molId);
        this.mode.set(isUUID ? 'USER' : 'SYSTEM');

        // === SYSTEM (molregno numerico): restituisco SEMPRE MoleculeDetailSystem
        if (!isUUID) {
          if (this.molCached && this.molCached.id === Number(molId)) {
            return of(this.molCached);
          }
          return this.moleculeService.getMoleculeByMolregno(molId).pipe(
            map(mol => {
              const sys: MoleculeDetailSystem = { ...mol, type: 'system' };
              this.molCached = sys;
              return sys; // compatibile con MoleculeDetailItem
            }),
            catchError(() => {
              this.fetchError.set(true)
              return of(null)
            })
          );
        }

        // === USER (UUID): restituisco l'item di collezione (chembl | custom)
        return this.moleculeCollectionItemService.getItemById(molId).pipe(
          catchError(() => {
            this.fetchError.set(true)
            return of(null)
          })
        );
      }),

      // 2) Enrichment T1 SOLO se è un MoleculeDetailSystem; altrimenti pass-through
      switchMap((item): Observable<MoleculeDetailItem | null> => {
        if (!item) {
          this.fetchError.set(true)
          return of(null);
        }

        this.molType = item.type

        // Qui item è MoleculeDetailSystem
        const { t1Inference, ...rest } = item;

        let smiles: string = ''

        if (this.typeGuards.isSystemMolecule(item)) {
          smiles = item.canonicalSmiles
        } else if (this.typeGuards.isChemblMolecule(item)) {
          smiles = item.chemblDetails.canonicalSmiles
        } else if (this.typeGuards.isCustomMolecule(item)) {
          if (item.propertiesJson) {
            item.properties = JSON.parse(item.propertiesJson)
          }
          smiles = item.canonicalSmiles
        }

        // Utente autenticato: calcolo T1
        return this.mercurionAIService
          .t1Inference({ smiles })
          .pipe(
            map(t1 => ({ ...item, t1Inference: t1 })),
            tap(() => this.fetchMolLoading.set(false)),
            catchError(() => of(item)) // in caso di errore, tieni il detail base
          );



      }),

      catchError((err: any) => {
        const netErr = err?.networkError;
        if (netErr && 'status' in netErr) this.fetchError.set(true);
        return of(null);
      })
    );
  }

  private fetchSimilar(): void {
    this.onlySub = this.route.paramMap.pipe(
      map(params => params.get('molId')), // string | null
      distinctUntilChanged(),
      tap(() => this.similarViewerReady.set(false)),

      // 1) Risolvo in un molregno (string) oppure null
      switchMap((id): Observable<string | null> => {
        if (!id) return of(null);
        // UUID -> prendo lo short e, se chembl, estraggo il molregno
        if (this.uuidV7Re.test(id)) {
          const svc$ = this.moleculeCollectionItemService.getItemShortById?.(id);
          // normalizzo a Observable<Short | null>
          const src: Observable<MoleculeCollectionItemEntityShort | null> =
            svc$ ?? of(null);

          return src.pipe(
            map((mol: MoleculeCollectionItemEntityShort | null) =>
              mol && this.typeGuards.isChemblMolecule(mol)
                ? `${mol.chemblMolregno}` // string
                : null
            )
          );
        }

        // numerico già valido come molregno
        if (/^\d+$/.test(id)) {
          return of(id);
        }

        return of(null);
      }),

      // 2) Similar solo se ho un molregno
      switchMap((molregno): Observable<string[]> =>
        molregno ? this.embeddingService.getSimilarMolregnos(molregno) : of([])
      ),

      // 3) Previews
      switchMap((ids: string[]) =>
        this.moleculeService.getMoleculePreviewsByMolregnos(ids.map(String))
      ),

      tap(() => this.similarViewerReady.set(true)),
      catchError(err => {
        console.error(err);
        this.similarViewerReady.set(false);
        return of([] as MoleculeSearchResult[]);
      })
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(previews => {
        this.similarMolsCache.set(previews);
        this.similarMols.set(
          previews.filter(mol => mol.known && this.onlyKnown.value === true)
        );
      });
  }

  doUpdateInlineDetails(e: MyMoleculeCustomDetailSaveModel): void {
    console.log(e)
    switch (e.type) {
      case 'label':
        this.updateLabel(e.value)
        break
      case 'notes':
        this.updateNotes(e.value)
        break
      case 'name':
        this.updateName(e.value)
    }
  }

  private updateLabel(label: string): void {
    if (this.typeGuards.isString(this.molId) && this.typeGuards.isUserMoleculeType(this.molType)) {
      this.upLaSub = this.moleculeCollectionItemService.updateItemLabel(this.molId, label, this.molType)
        .subscribe({
          next: () => this.toast.trigger('Etichetta aggiornata correttamente', 'success', 1500),
          error: () => this.toast.trigger('Si è verificato un errore', 'error', 1500)
        })
    }
  }

  private updateNotes(notes: string): void {
    if (this.typeGuards.isString(this.molId) && this.typeGuards.isUserMoleculeType(this.molType)) {
      this.upNoSub = this.moleculeCollectionItemService.updateItemNotes(this.molId, notes, this.molType)
        .subscribe({
          next: () => this.toast.trigger('Note aggiornate correttamente', 'success', 1500),
          error: () => this.toast.trigger('Si è verificato un errore', 'error', 1500)
        })
    }
  }

  private updateName(name: string): void {
    if (this.typeGuards.isString(this.molId) && this.typeGuards.isCustomMoleculeType(this.molType)) {
      this.upNaSub = this.moleculeCollectionItemService.updateItemName(this.molId, name, this.molType)
        .subscribe({
          next: () => this.toast.trigger('Nome aggiornate correttamente', 'success', 1500),
          error: () => this.toast.trigger('Si è verificato un errore', 'error', 1500)
        })
    }
  }

  ngOnInit(): void {
    this.fetchSimilar()
  }

  ngOnDestroy(): void {
    window.removeEventListener('storage', this.handleCrossTabFetchData)
    this.onlySub?.unsubscribe()
    this.upLaSub?.unsubscribe()
    this.upNoSub?.unsubscribe()
    this.upNaSub?.unsubscribe()
  }

}
