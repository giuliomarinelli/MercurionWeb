import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { EmbeddingService } from './../../services/embedding.service';
import { SimilarsComponent } from './../../components/molecule-detail/similars/similars.component';
import { Component, DestroyRef, effect, inject, OnDestroy, OnInit, Signal, signal, WritableSignal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MoleculeService } from '../../services/graphql/molecule.service';
import { switchMap, Observable, catchError, of, Subscription, forkJoin, retry, tap, distinctUntilChanged, shareReplay, startWith, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { MoleculeDetail, MoleculeDetailItem, MoleculeDetailSystem } from '../../Models/graphql/molecule.detail';
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
import { MoleculeCollectionItemEntityShort } from '../../Models/graphql/molecule-collection/molecule-collection.types';


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
    ReactiveFormsModule
  ],
  template: `
    @if (molecule$ | async; as molecule) {
      <section class="max-w-5xl mx-auto p-0 xs:p-4 sm:p-6 md:p-8 space-y-12">
        @if (typeGuards.isSystemMolecule(molecule)) {
          <molecule-header
            [nameInput]="molecule.preferredName"
            [chemblIdInput]="molecule.cmbId"
          />
        } @else if (typeGuards.isChemblMolecule(molecule)) {
          <molecule-header
            [nameInput]="molecule.chemblDetails.preferredName"
            [chemblIdInput]="molecule.chemblDetails.cmbId"
          />
        } @else if (typeGuards.isCustomMolecule(molecule)) {
          <molecule-header
            [nameInput]="molecule.name ?? 'Lead'"
          />
        }



        <section>
          <h2 class="font-semibold text-light-accent-primary dark:text-dark-accent-primary mb-4 text-center sm:text-left text-xl">
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
      <section class="max-w-4xl mx-auto p-6">
        <p class="text-gray-600 dark:text-gray-300 text-sm">Caricamento molecola...</p>
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
  // ====================================================

  private mode = signal<'SYSTEM' | 'USER'>('SYSTEM')

  private readonly uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  molecule$!: Observable<MoleculeDetailItem | null>
  viewerReady = signal<boolean>(false)
  similarViewerReady = signal<boolean>(false)
  fetchError = signal<boolean>(false)
  similarMols = signal<MoleculeSearchResult[] | undefined>(undefined)
  similarMolsCache = signal<MoleculeSearchResult[]>([])
  private molCached?: MoleculeDetailItem
  private onlySub?: Subscription

  onlyKnown = new FormControl<boolean>(true, { nonNullable: true })

  onlyKnownSig: Signal<boolean> = toSignal(
    this.onlyKnown.valueChanges,
    { initialValue: this.onlyKnown.value }
  )

  constructor() {
    effect(() => {
      this.fetchData()
      window.addEventListener('storage', this.handleCrossTabFetchData)
    })
    effect(() => {
      this.similarMols.set(this.onlyKnownSig() ? this.similarMolsCache().filter(mol => mol.known) : this.similarMolsCache())
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
          return throwError(() => new Error('UndefinedMolregno'));
        }

        const isUUID = this.uuidRe.test(molId);
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
            catchError(() => of(null))
          );
        }

        // === USER (UUID): restituisco l'item di collezione (chembl | custom)
        return this.moleculeCollectionItemService.getItemById(molId).pipe(
          catchError(() => of(null))
        );
      }),

      // 2) Enrichment T1 SOLO se è un MoleculeDetailSystem; altrimenti pass-through
      switchMap((item): Observable<MoleculeDetailItem | null> => {
        if (!item) return of(null);


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
        if (this.uuidRe.test(id)) {
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

  ngOnInit(): void {
    this.fetchSimilar()
  }

  ngOnDestroy(): void {
    window.removeEventListener('storage', this.handleCrossTabFetchData)
    this.onlySub?.unsubscribe()
  }

}
