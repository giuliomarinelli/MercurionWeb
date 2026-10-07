import { CustomDetailSaveModel } from '../../Models/custom-detail-save.model'
import { toSignal } from '@angular/core/rxjs-interop'
import { SimilarsComponent } from '../../components/molecule-detail/similars/similars.component'
import { Component, computed, effect, inject, Signal, signal, ChangeDetectionStrategy, untracked } from '@angular/core'
import type { Observable } from 'rxjs'
import { AsyncPipe } from '@angular/common'
import { MoleculeHeaderComponent } from '../../components/molecule-detail/molecule-header/molecule-header.component'
import { MoleculeViewerComponent } from '../../components/chem/molecule-viewer/molecule-viewer.component'
import { MoleculePropertiesComponent } from '../../components/molecule-detail/molecule-properties/molecule-properties.component'
import { MoleculeRoutesComponent } from '../../components/molecule-detail/molecule-routes/molecule-routes.component'
import { MoleculeSynonymsComponent } from '../../components/molecule-detail/molecule-synonyms/molecule-synonyms.component'
import { MoleculeCtaChemblComponent } from '../../components/molecule-detail/molecule-cta-chembl/molecule-cta-chembl.component'
import { T1PredictionCardComponent } from '../../components/molecule-detail/t1-prediction-card/t1-prediction-card.component'
import { UserContextService } from '../../services/context/user-context.service'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { TypeGuardsService } from '../../services/type-guards.service'
import { MoleculeDetailItem } from '../../Models/graphql/molecule-collection/molecule-collection.types'
import { ProgressIndicatorComponent } from '../../components/common/progress-indicator/progress-indicator.component'
import { CustomDetailsComponent } from '../../components/molecule-detail/my-molecule-custom-details/custom-details.component'
import { MyMoleculeJoinComponent } from '../../components/molecule-detail/my-molecule-join/my-molecule-join.component'
import { MyMoleculesHeadingComponent } from '../../components/molecule-detail/my-molecules-heading/my-molecules-heading.component'
import { LinkModel } from '../../Models/link.model'
import { DesignService } from '../../services/design.service'
import { MoleculeDetailFacade } from './molecule-detail.facade'
import { SelectionControlComponent } from '../../components/common/selection-control/selection-control.component'
import { IconButtonComponent } from '../../components/common/icon-button/icon-button.component'
import { Router } from '@angular/router'
import { CopyButtonComponent } from '../../components/common/copy-button/copy-button.component'
import { PcpApiService } from '../../services/pcp-api.service'
import { LoggerService } from '../../services/logger.service'


@Component({
  selector: 'm-molecule-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MoleculeDetailFacade],
  imports: [
    AsyncPipe,
    MoleculeHeaderComponent,
    MoleculeViewerComponent,
    MoleculePropertiesComponent,
    MoleculeRoutesComponent,
    MoleculeSynonymsComponent,
    MoleculeCtaChemblComponent,
    T1PredictionCardComponent,
    SimilarsComponent,
    ReactiveFormsModule,
    ProgressIndicatorComponent,
    CustomDetailsComponent,
    MyMoleculeJoinComponent,
    MyMoleculesHeadingComponent,
    SelectionControlComponent,
    IconButtonComponent,
    CopyButtonComponent
  ],
  styleUrls: ['./molecule-detail.page.component.css'],
  template: `

    @if (molecule$ | async; as molecule) {

      <section class="m-detail-page min-w-0" role="main" [attr.aria-busy]="fetchMolLoading()">
        @if (!typeGuards.isSystemMolecule(molecule)) {
          @if (collectionId()) {
            <m-my-molecules-heading [breadcrumb]="breadcrumb" />
          } @else {
            <m-my-molecules-heading />
          }
        }
        @if (typeGuards.isSystemMolecule(molecule)) {
          <m-molecule-header [nameInput]="molecule.preferredNameIt ?? molecule.preferredName ?? ''" [chemblIdInput]="molecule.cmbId"
            [molId]="molecule.id.toString()" [isSystemMolecule]="true" [smiles]="molecule.canonicalSmiles ?? ''" [isLoggedIn]="userContext.isLoggedIn()"
            (onAddToCollection)="doAddToManyCollections()" />
        } @else if (typeGuards.isChemblMolecule(molecule)) {
          <m-molecule-header [nameInput]="molecule.chemblDetails.preferredNameIt ?? molecule.chemblDetails.preferredName ?? ''" [chemblIdInput]="molecule.chemblDetails.cmbId"
            [myMol]="true" [molId]="molecule.id" [smiles]="molecule.chemblDetails.canonicalSmiles ?? ''"
            [deletePending]="deletePending()" [deleteError]="deleteError()" [isLoggedIn]="userContext.isLoggedIn()" (onDelete)="doDelete($event)"
            (onAddToCollection)="doAddToManyCollections()" />
        } @else if (typeGuards.isCustomMolecule(molecule)) {
          <m-molecule-header [nameInput]="molecule.name ?? 'Molecola senza nome'" [myMol]="true" [isCustom]="true"
            [saveRequest]="saveDetail" [smiles]="molecule.canonicalSmiles" [molId]="molecule.id"
            [deletePending]="deletePending()" [deleteError]="deleteError()" [isLoggedIn]="userContext.isLoggedIn()" (onDelete)="doDelete($event)"
            (onAddToCollection)="doAddToManyCollections()" />
        }
        <section>
          <div class="m-detail-identifiers min-w-0 text-left space-y-6 sm:space-y-0 sm:grid sm:grid-cols-[max-content_minmax(0,1fr)] sm:gap-x-4 sm:gap-y-6 sm:items-center">
            <div class="flex flex-col gap-2 min-w-0 sm:contents">
              <h2 class="font-semibold text-light-accent-primary-hc dark:text-dark-accent-primary text-lg sm:text-xl sm:shrink-0">SMILES canonico</h2>
              <div class="flex items-center gap-3 min-w-0 sm:flex-1">
                <p class="min-w-0 wrap-anywhere text-sm text-neutral-950 dark:text-slate-200 font-mono font-semibold">
                  @if (typeGuards.isSystemMolecule(molecule)) {
                    {{ molecule.canonicalSmiles }}
                  } @else if (typeGuards.isChemblMolecule(molecule)) {
                    {{ molecule.chemblDetails.canonicalSmiles }}
                  } @else if (typeGuards.isCustomMolecule(molecule)) {
                    {{ molecule.canonicalSmiles }}
                  }
                </p>
                @if (typeGuards.isSystemMolecule(molecule)) {
                  <m-copy-button size="lg" class="shrink-0" ariaLabel="Copia SMILES canonico" [disabled]="!iupacSmiles()" [src]="molecule.canonicalSmiles ?? ''" />
                } @else if (typeGuards.isChemblMolecule(molecule)) {
                  <m-copy-button size="lg" class="shrink-0" ariaLabel="Copia SMILES canonico" [disabled]="!iupacSmiles()" [src]="molecule.chemblDetails.canonicalSmiles ?? ''" />
                } @else if (typeGuards.isCustomMolecule(molecule)) {
                  <m-copy-button size="lg" class="shrink-0" ariaLabel="Copia SMILES canonico" [disabled]="!iupacSmiles()" [src]="molecule.canonicalSmiles" />
                }
              </div>
            </div>
            <div class="flex flex-col gap-2 min-w-0 sm:contents">
              <h2 class="font-semibold text-light-accent-primary-hc dark:text-dark-accent-primary text-lg sm:text-xl sm:shrink-0">Nome IUPAC Internazionale</h2>
              <div class="flex items-center gap-3 min-w-0 sm:flex-1">
                <p class="min-w-0 wrap-anywhere text-sm text-neutral-950 dark:text-slate-200 font-mono font-semibold">
                  @if (iupacFailed()) {
                    <span role="alert">Impossibile recuperare il nome IUPAC.</span>
                    <button type="button" class="min-h-12 px-3 underline focus-visible:outline-2" (click)="iupacRetry.update(incrementRetry)">Riprova</button>
                  } @else if (iupacName(); as name) {
                    @if (name === '__LOADING__') {
                      <m-progress-indicator [size]="16" />
                    } @else {
                      {{ name === 'ND' ? 'Non disponibile' : name }}
                    }
                  } @else {
                    ND
                  }
                </p>
                @if (iupacName() && iupacName() !== '__LOADING__' && iupacName() !== 'ND') {
                  <m-copy-button size="lg" class="shrink-0" ariaLabel="Copia nome IUPAC" [src]="iupacName()" />
                }
              </div>
            </div>
          </div>
          <h2
            class="flex gap-3 items-center justify-start font-semibold text-light-accent-primary-hc dark:text-dark-accent-primary mt-6 mb-4 text-left text-lg sm:text-xl">
            <span>Struttura</span>
            @if (typeGuards.isCustomMolecule(molecule)) {
              <m-icon-button
                size="lg"
                ariaLabel="Modifica Struttura"
                (pressed)="doEditStructure(molecule.id)">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"
                     class="h-7 w-auto fill-current text-slate-800 hover:text-slate-800/75 dark:text-slate-200 dark:hover:text-slate-200/75">
                  <path d="M58.1 555.9L48 592C50.7 591.2 117.4 572.6 248 536L569.4 214.6L592 192C589.6 189.6 549.1 149.1 470.6 70.6L448 48L425.4 70.6L104 392L58.1 555.9zM252.7 486L154 387.3L347.4 193.9L446.1 292.6L252.7 486zM229.4 508L94.2 545.8L132 410.6L229.4 508zM546.7 192L468.6 270.1L369.9 171.4L448 93.3L546.7 192z"/>
                </svg>
              </m-icon-button>
            }
          </h2>
          <div class="m-detail-structure">
            <m-molecule-viewer mode="detail" [structure]="iupacSmiles()" ariaLabel="Struttura molecolare completa"
              (rendered)="viewerReady.set(true)" />
          </div>
          @if (!typeGuards.isSystemMolecule(molecule)) {
            <div class="mt-8"></div>
            <m-custom-details [saveRequest]="saveDetail" actionSize="lg" [type]="'label'" [value]="molecule.label ?? ''"
              [itemId]="molecule.id" />
            <m-custom-details [saveRequest]="saveDetail" actionSize="lg" [type]="'notes'" [value]="molecule.notes ?? ''"
              [itemId]="molecule.id" />
          }

          @if (userContext.isLoggedIn()) {
            <m-t1-prediction-card [inference]="molecule.t1Inference"
              [loading]="inferenceLoading()" [error]="inferenceError()" (retry)="retryInference()" />
          }

          @if (typeGuards.isSystemMolecule(molecule) || typeGuards.isCustomMolecule(molecule)) {
            <m-molecule-properties [properties]="molecule.properties" />
          } @else if (typeGuards.isChemblMolecule(molecule)) {
            <m-molecule-properties [properties]="molecule.chemblDetails.properties" />
          }
          @if (!typeGuards.isSystemMolecule(molecule) && molecule.joins) {
            <h2
              class="font-semibold mt-8 mb-3 sm:top-14 text-light-accent-primary-hc dark:text-dark-accent-primary text-left text-lg sm:text-xl">
              Collezioni associate
            </h2>
            <section class="min-w-0">
              <m-my-molecule-join [joins]="molecule.joins" />
            </section>
          }
        </section>
        @if (typeGuards.isSystemMolecule(molecule) || typeGuards.isChemblMolecule(molecule)) {
          <section class="m-detail-analogues" aria-labelledby="analogues-heading">
            <h2 id="analogues-heading" class="font-semibold text-light-accent-primary-hc dark:text-dark-accent-primary text-left text-lg sm:text-xl">Analoghi suggeriti</h2>
            <m-selection-control label="Mostra solo composti noti"
              description="Deselezionando questa opzione potrai vedere anche i lead sperimentali"
              mode="checkbox" [formControl]="onlyKnown" />
            <m-similars [molecules]="similarMols()" [onlyKnown]="onlyKnownSig()" [loading]="similarLoading()"
              [error]="similarError()" (retry)="retrySimilar()" />
          </section>
          }


          @if (typeGuards.isSystemMolecule(molecule)) {
            <m-molecule-routes [adminRoutesInput]="molecule.administrationRoutes" />
          } @else if (typeGuards.isChemblMolecule(molecule)) {
            <m-molecule-routes [adminRoutesInput]="molecule.chemblDetails.administrationRoutes" />
          }
          @if (typeGuards.isSystemMolecule(molecule)) {
            <m-molecule-synonyms [synonymsInput]="molecule.synonyms" />
          } @else if (typeGuards.isChemblMolecule(molecule)) {
            <m-molecule-synonyms [synonymsInput]="molecule.chemblDetails.synonyms" />
          }

          @if (typeGuards.isSystemMolecule(molecule)) {
            <m-molecule-cta-chembl [chemblId]="molecule.cmbId" />
          } @else if (typeGuards.isChemblMolecule(molecule)) {
            <m-molecule-cta-chembl [chemblId]="molecule.chemblDetails.cmbId" />
          }
      </section>
        } @else if (fetchError()) {
        <section class="max-w-4xl mx-auto p-6" role="main" aria-live="assertive">
          <p class="text-light-error dark:text-dark-error text-sm" role="alert">Si è verificato un errore nel caricamento della molecola</p>
        </section>
        } @else {
        <section class="max-w-5xl mx-auto h-full flex justify-center items-center" role="main" aria-busy="true" aria-live="polite">
          <m-progress-indicator />
        </section>
        }
  ` })
export class MoleculeDetailPageComponent {

  private readonly facade = inject(MoleculeDetailFacade)
  protected readonly userContext = inject(UserContextService)
  protected readonly typeGuards = inject(TypeGuardsService)
  protected readonly design = inject(DesignService)
  private readonly router = inject(Router)
  private readonly pcp = inject(PcpApiService)
  private readonly logger = inject(LoggerService)

  molecule$: Observable<MoleculeDetailItem | null> = this.facade.molecule$
  viewerReady = signal<boolean>(false)
  deletePending = this.facade.deletePending
  deleteError = this.facade.deleteError
  fetchError = this.facade.error
  similarMols = computed(() => {
    const similar = this.facade.similar()
    return this.onlyKnownSig() ? similar.filter(mol => mol.known) : similar
  })
  fetchMolLoading = this.facade.loading
  inferenceLoading = this.facade.inferenceLoading ?? signal(false)
  inferenceError = this.facade.inferenceError ?? signal(false)
  similarError = this.facade.similarError ?? signal(false)
  readonly saveDetail = (detail: CustomDetailSaveModel) => this.facade.saveDetail(detail)
  retryInference(): void { this.facade.retryInference() }

  retrySimilar(): void { this.facade.retrySimilar() }
  similarLoading = this.facade.similarLoading
  collectionId = this.facade.collectionId
  protected molId = this.facade.currentId
  protected readonly incrementRetry = (value: number) => value + 1
  protected iupacFailed = signal(false)
  protected iupacRetry = signal(0)
  protected iupacName = signal<string>('__LOADING__')
  protected currentName = this.facade.currentName
  protected readonly iupacSmiles = computed(() => {
    const molecule = this.facade.molecule()
    return molecule ? this.facade.toViewModel(molecule).smiles : ''
  })
  protected breadcrumb: LinkModel[] = [
    {
      label: 'Collezioni Molecolari',
      path: '/molecules/collections'
    }
  ]

  onlyKnown = new FormControl<boolean>(true, { nonNullable: true })

  onlyKnownSig: Signal<boolean> = toSignal(
    this.onlyKnown.valueChanges,
    { initialValue: this.onlyKnown.value }
  )

  constructor() {
    effect((onCleanup) => {
      const canonicalSmiles = this.iupacSmiles()
      this.iupacRetry()
      this.iupacFailed.set(false)
      this.iupacName.set('__LOADING__')
      if (!canonicalSmiles) {
        this.iupacName.set('ND')
        return
      }

      const sub = untracked(() => this.pcp.getIupacNameFromSmiles(canonicalSmiles).subscribe({
        next: (iupacName) => this.iupacName.set(iupacName || 'ND'),
        error: error => {
          this.logger.error('Failed to load IUPAC name', error)
          this.iupacFailed.set(true)
          this.iupacName.set('ND')
        }
      }))

      onCleanup(() => {
        sub.unsubscribe()
      })
    })
    effect(() => {
      this.facade.currentId()
      untracked(() => {
        this.onlyKnown.reset(true)
      })
    })
    effect(() => {
      const collectionId = this.facade.collectionId()
      const collectionName = this.facade.collectionName()
      this.breadcrumb = collectionId && collectionName
        ? [
          { label: 'Collezioni Molecolari', path: '/molecules/collections' },
          {
            label: collectionName,
            path: `/molecules/collections/detail/${collectionId}`
          }
        ]
        : [{ label: 'Collezioni Molecolari', path: '/molecules/collections' }]
    })
  }

  doUpdateInlineDetails(e: CustomDetailSaveModel): void {
    this.facade.save(e)
  }

  doDelete(id: string): void {
    this.facade.delete(id)
  }

  doAddToManyCollections(): void {
    this.facade.bindCollections()
  }

  doEditStructure(molId: string): void {
    this.router.navigate(['molecules', 'editor'], {
      queryParams: {
        mode: 'edit',
        m_id: molId
      }
    })
  }

}
