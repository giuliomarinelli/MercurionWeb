// Refactor #1: MoleculeDetailComponent
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MoleculeService } from '../../services/graphql/molecule.service';
import { switchMap, Observable, catchError, of, Subscription, forkJoin, map, retry } from 'rxjs';
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
import { T1PredictionDTO } from '../../Models/notebook/t1-prediction-model';
import { MercurionAiService as MercurionAIService } from '../../services/mercurion-ai.service';

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
    T1PredictionCardComponent
  ],
  template: `
    @if (molecule$ | async; as molecule) {
      <section class="max-w-5xl mx-auto p-6 space-y-12">
        <molecule-header
          [nameInput]="molecule.preferredName"
          [chemblIdInput]="molecule.cmbId"
        />

        <section>
          <h2 class="font-semibold text-light-accent-primary dark:text-dark-accent-primary mb-4 text-center sm:text-left text-xl">
            Struttura
          </h2>

            <div class="h-400px
              flex-shrink-0
              w-auto
              h-[180px]
              md:h-[300px]
              overflow-hidden
              overflow-x-auto
              relative">

              @if (!viewerReady()) {
                <div class="absolute inset-0 z-10 animate-pulse
                      bg-slate-200 dark:bg-slate-700"></div>
              }

            <molecule-viewer
              [mode]="'detail'"
              class="w-full h-full"
              [structure]="molecule.canonicalSmiles"
              [darkMode]="themeManager.theme() === 'dark'"
              (rendered)="viewerReady.set(true)"
            />

          </div>
        </section>

        @if (userContext.initials() !== '') {
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
export class MoleculeDetailComponent implements OnInit {

  molecule$!: Observable<MoleculeDetail | null>
  viewerReady = signal<boolean>(false)
  fetchError = signal<boolean>(false)

  constructor(
    private readonly route: ActivatedRoute,
    private readonly moleculeService: MoleculeService,
    protected readonly themeManager: ThemeManagerService,
    protected readonly userContext: UserContextService,
    private readonly mercurionAIService: MercurionAIService
  ) { }

  ngOnInit(): void {
    this.molecule$ = this.route.paramMap.pipe(
      switchMap((params) => {
        this.viewerReady.set(false)
        const molregno = params.get('molregno')
        if (!molregno) throw new Error('UndefinedMolregno')
        return this.moleculeService.getMoleculeByMolregno(molregno)
      }),
      switchMap((molecule) => {
        if (!molecule) return of(null)
        return this.mercurionAIService.t1Inference({ smiles: molecule.canonicalSmiles })
          .pipe(
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
        return of(null);
      })
    );
  }

}
