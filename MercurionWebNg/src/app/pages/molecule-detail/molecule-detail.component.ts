import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { EmbeddingService } from './../../services/embedding.service';
import { SimilarsComponent } from './../../components/molecule-detail/similars/similars.component';
// Refactor #1: MoleculeDetailComponent
import { Component, DestroyRef, effect, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MoleculeService } from '../../services/graphql/molecule.service';
import { switchMap, Observable, catchError, of, Subscription, forkJoin, map, retry, tap, distinctUntilChanged, shareReplay } from 'rxjs';
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
    SimilarsComponent
  ],
  template: `
    @if (molecule$ | async; as molecule) {
      <section class="max-w-5xl mx-auto p-0 xs:p-4 sm:p-6 md:p-8 space-y-12">
        <molecule-header
          [nameInput]="molecule.preferredName"
          [chemblIdInput]="molecule.cmbId"
        />

        <h2 class="font-semibold text-light-accent-primary dark:text-dark-accent-primary mb-4 text-center sm:text-left text-xl">
            Analoghi suggeriti
          </h2>

        <app-similars [molecules]="similarMols() ?? []" />

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
export class MoleculeDetailComponent implements OnDestroy {

  molecule$!: Observable<MoleculeDetail | null>
  viewerReady = signal<boolean>(false)
  similarViewerReady = signal<boolean>(false)
  fetchError = signal<boolean>(false)
  similarMols = signal<MoleculeSearchResult[] | undefined>(undefined)
  private molCached?: MoleculeDetail

  constructor(
    private readonly route: ActivatedRoute,
    private readonly moleculeService: MoleculeService,
    protected readonly themeManager: ThemeManagerService,
    protected readonly userContext: UserContextService,
    private readonly mercurionAIService: MercurionAIService,
    private readonly embeddingService: EmbeddingService,
    private readonly destroyRef: DestroyRef
  ) {
    this.fetchSimilar()
    effect(() => {
      this.fetchData()
      window.addEventListener('storage', this.handleCrossTabFetchData)
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
    this.route.paramMap.pipe(
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
      .subscribe(previews => this.similarMols.set(previews));
  }

  ngOnDestroy(): void {
    window.removeEventListener('storage', this.handleCrossTabFetchData)
  }

}
