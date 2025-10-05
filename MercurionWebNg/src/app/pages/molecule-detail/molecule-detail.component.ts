import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { EmbeddingService } from './../../services/embedding.service';
import { SimilarsComponent } from './../../components/molecule-detail/similars/similars.component';
// Refactor #1: MoleculeDetailComponent
import { Component, DestroyRef, effect, OnDestroy, OnInit, Signal, signal, WritableSignal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MoleculeService } from '../../services/graphql/molecule.service';
import { switchMap, Observable, catchError, of, Subscription, forkJoin, map, retry, tap, distinctUntilChanged, shareReplay, startWith } from 'rxjs';
import { MoleculeDetail } from '../../Models/graphql/molecule.detail';
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
        <molecule-header
          [nameInput]="molecule.preferredName"
          [chemblIdInput]="molecule.cmbId"
        />



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

              <molecule-viewer
                [mode]="'detail'"
                class="w-full h-full"
                [structure]="molecule.canonicalSmiles"
                (rendered)="viewerReady.set(true)"
              />
            </div>
          </div>
        </section>
        <h2 class="font-semibold text-light-accent-primary dark:text-dark-accent-primary text-center sm:text-left text-xl">
            Analoghi suggeriti
        </h2>

        <div class="flex gap-3">
          <div class="flex h-6 shrink-0 items-center">
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
              class="text-sm text-gray-500 dark:text-gray-400 ml-2"
            >
              Deselezionando questa opzione potrai vedere anche i lead sperimentali
            </p>
          </div>
        </div>


        <section class="rounded-md border border-slate-300 dark:border-slate-600 relative bottom-4">
          <app-similars [molecules]="similarMols() ?? []" [onlyKnown]="onlyKnownSig()" />
        </section>

        @if (userContext.initials() !== '') {
          <app-editing-layer [smiles]="molecule.canonicalSmiles" />
          <app-t1-prediction-card [inference]="molecule.t1Inference" />
        }

        <molecule-properties [properties]="molecule.properties" />

        <molecule-routes [adminRoutesInput]="molecule.administrationRoutes" />

        <molecule-synonyms [synonymsInput]="molecule.synonyms" />

        <molecule-cta-chembl [chemblId]="molecule.cmbId" />
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

  molecule$!: Observable<MoleculeDetail | null>
  viewerReady = signal<boolean>(false)
  similarViewerReady = signal<boolean>(false)
  fetchError = signal<boolean>(false)
  similarMols = signal<MoleculeSearchResult[] | undefined>(undefined)
  similarMolsCache = signal<MoleculeSearchResult[]>([])
  private molCached?: MoleculeDetail
  private onlySub?: Subscription

  onlyKnown = new FormControl<boolean>(true, { nonNullable: true })

  onlyKnownSig: Signal<boolean> = toSignal(
  this.onlyKnown.valueChanges,
  { initialValue: this.onlyKnown.value }
)

  constructor(
    private readonly route: ActivatedRoute,
    private readonly moleculeService: MoleculeService,
    protected readonly themeManager: ThemeManagerService,
    protected readonly userContext: UserContextService,
    private readonly mercurionAIService: MercurionAIService,
    private readonly embeddingService: EmbeddingService,
    private readonly destroyRef: DestroyRef
  ) {
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
      switchMap((params) => {
        this.viewerReady.set(false)
        const molregno = params.get('molregno')
        if (!molregno) throw new Error('UndefinedMolregno')
        if (this.molCached && this.molCached.id === Number(molregno)) {
          return of(this.molCached)
        }
        return this.moleculeService.getMoleculeByMolregno(molregno).pipe(
          map(mol => {
            this.molCached = mol || undefined
            return mol
          })
        )
      }),
      switchMap((molecule) => {
        if (!molecule) return of(null)
        if (this.userContext.initials() === '') {
          const { t1Inference, ...rest } = molecule
          return of(rest)
        }
        return this.mercurionAIService.t1Inference({ smiles: molecule.canonicalSmiles }).pipe(
          catchError((err) => {
            if (err?.status === 401 || err?.networkError?.status === 401) {
              return of(undefined)
            }
            // Per altri errori
            return of(undefined)
          }),
          map(t1Inference => ({
            ...molecule,
            t1Inference
          }))
        )
      }),
      catchError((err: any) => {
        const netErr = err?.networkError;
        if (netErr && 'status' in netErr) {
          this.fetchError.set(true)
        }
        return of(null)
      })
    )
  }

  private fetchSimilar(): void {
    this.onlySub = this.route.paramMap.pipe(
      map(params => {
        const id = params.get('molregno');
        if (!id) throw new Error('UndefinedMolregno');
        return id;
      }),
      distinctUntilChanged(),
      tap(() => this.similarViewerReady.set(false)),
      switchMap(id => this.embeddingService.getSimilarMolregnos(id)),
      switchMap(ids => this.moleculeService.getMoleculePreviewsByMolregnos(ids.map(id => id.toString()))),
      tap(() => this.similarViewerReady.set(true)),
      catchError(err => {
        console.error(err);
        this.similarViewerReady.set(false);
        return of([] as MoleculeSearchResult[]);
      })
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(previews => {
        this.similarMolsCache.set(previews)
        this.similarMols.set(previews.filter(mol => mol.known && this.onlyKnown.value === true))
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
