import { CustomDetailSaveModel } from '../../Models/custom-detail-save.model'
import { toSignal } from '@angular/core/rxjs-interop'
import { SimilarsComponent } from '../../components/molecule-detail/similars/similars.component'
import { Component, effect, inject, Signal, signal, ChangeDetectionStrategy } from '@angular/core'
import { RouterLink } from '@angular/router'
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
import { ClassicSpinnerComponent } from '../../components/common/classic-spinner/classic-spinner.component'
import { CustomDetailsComponent } from '../../components/molecule-detail/my-molecule-custom-details/custom-details.component'
import { MyMoleculeJoinComponent } from '../../components/molecule-detail/my-molecule-join/my-molecule-join.component'
import { MyMoleculesHeadingComponent } from '../../components/molecule-detail/my-molecules-heading/my-molecules-heading.component'
import { LinkModel } from '../../Models/link.model'
import { DesignService } from '../../services/design.service'
import { MoleculeDetailFacade } from './molecule-detail.facade'




@Component({
  selector: 'm-molecule-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    ClassicSpinnerComponent,
    CustomDetailsComponent,
    MyMoleculeJoinComponent,
    RouterLink,
    MyMoleculesHeadingComponent
  ],
  template: `

    @if (molecule$ | async; as molecule) {

      <section class="main-container" role="main" [attr.aria-busy]="fetchMolLoading()" aria-live="polite">

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
            [isLoggedIn]="userContext.isLoggedIn()" (onDelete)="doDelete($event)"
            (onAddToCollection)="doAddToManyCollections()" />
        } @else if (typeGuards.isCustomMolecule(molecule)) {
          <m-molecule-header [nameInput]="molecule.name ?? '<Lead sconosciuto>'" [myMol]="true" [isCustom]="true"
            (onSave)="doUpdateInlineDetails($event)" [smiles]="molecule.canonicalSmiles" [molId]="molecule.id"
            [isLoggedIn]="userContext.isLoggedIn()" (onDelete)="doDelete($event)"
            (onAddToCollection)="doAddToManyCollections()" />
        }
        <section class="relative -top-4">
           <p class="flex gap-4 items-center font-semibold text-light-accent-primary-hc dark:text-dark-accent-primary mt-6 mb-4 text-center sm:text-left text-xl">
            <span class="shrink-0">Canonical smiles</span>
            <span class="shrink-0 text-sm text-neutral-950 dark:text-slate-200">
              @if (typeGuards.isSystemMolecule(molecule)) {
                {{molecule.canonicalSmiles}}
              } @else if (typeGuards.isChemblMolecule(molecule)) {
                {{molecule.chemblDetails.canonicalSmiles}}
              } @else if (typeGuards.isCustomMolecule(molecule)) {
                {{molecule.canonicalSmiles}}
              }
            </span>
          </p>
          <h2
            class="flex gap-3 items-center justify-center sm:justify-start font-semibold text-light-accent-primary-hc dark:text-dark-accent-primary mt-6 mb-4 text-center sm:text-left text-xl">
            <span>Struttura</span>
            @if (typeGuards.isCustomMolecule(molecule)) {
            <a class="cursor-pointer transition-colors duration-300 hover:transform hover:scale-[1.05]" title="Modifica Struttura"
              routerLink="/molecules/editor" [queryParams]="{
                      mode: 'edit',
                      m_id: molId
                    }"
              aria-label="Modifica struttura"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"
                class="fill-current h-[22px] w-auto text-slate-800 hover:text-slate-800/75 dark:text-slate-200 dark:hover:text-slate-200/75"
                aria-hidden="true">
                <path
                  d="M58.1 555.9L48 592C50.7 591.2 117.4 572.6 248 536L569.4 214.6L592 192C589.6 189.6 549.1 149.1 470.6 70.6L448 48L425.4 70.6L104 392L58.1 555.9zM252.7 486L154 387.3L347.4 193.9L446.1 292.6L252.7 486zM229.4 508L94.2 545.8L132 410.6L229.4 508zM546.7 192L468.6 270.1L369.9 171.4L448 93.3L546.7 192z" />
              </svg>
            </a>
            }
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
                            bg-slate-200 dark:bg-slate-700" role="status" aria-live="polite"></div>
              }
              @if (typeGuards.isSystemMolecule(molecule)) {
                <m-molecule-viewer [mode]="'detail'" class="w-full h-full" [structure]="molecule.canonicalSmiles ?? ''"
                (rendered)="viewerReady.set(true)" />
              } @else if (typeGuards.isChemblMolecule(molecule)) {
                <m-molecule-viewer [mode]="'detail'" class="w-full h-full" [structure]="molecule.chemblDetails.canonicalSmiles ?? ''"
                (rendered)="viewerReady.set(true)" />
              } @else if (typeGuards.isCustomMolecule(molecule)) {
                <m-molecule-viewer [mode]="'detail'" class="w-full h-full" [structure]="molecule.canonicalSmiles"
                (rendered)="viewerReady.set(true)" />
              }
            </div>
          </div>
          @if (!typeGuards.isSystemMolecule(molecule)) {
            <div class="mt-8"></div>
            <m-custom-details (onSaving)="doUpdateInlineDetails($event)" [type]="'label'" [value]="molecule.label ?? '—'"
              [itemId]="molecule.id" />
            <m-custom-details (onSaving)="doUpdateInlineDetails($event)" [type]="'notes'" [value]="molecule.notes ?? '—'"
              [itemId]="molecule.id" />
          }

          @if (userContext.isLoggedIn()) {
            <m-t1-prediction-card [inference]="molecule.t1Inference" />
          }

          @if (typeGuards.isSystemMolecule(molecule) || typeGuards.isCustomMolecule(molecule)) {
            <m-molecule-properties [properties]="molecule.properties" />
          } @else if (typeGuards.isChemblMolecule(molecule)) {
            <m-molecule-properties [properties]="molecule.chemblDetails.properties" />
          }
          @if (!typeGuards.isSystemMolecule(molecule) && molecule.joins) {
            <h2
              class="font-semibold mt-8 mb-3 sm:top-14 text-light-accent-primary-hc dark:text-dark-accent-primary text-center sm:text-left text-xl">
              Questa molecola fa parte delle seguenti collezioni:
            </h2>
            <section class="rounded-md border border-slate-300 dark:border-slate-600">
              <m-my-molecule-join [joins]="molecule.joins" />
            </section>
          }
        </section>
        @if (typeGuards.isSystemMolecule(molecule) || typeGuards.isChemblMolecule(molecule)) {
          <h2
            class="font-semibold relative top-10 sm:top-14 text-light-accent-primary-hc dark:text-dark-accent-primary text-center sm:text-left text-xl"
            style="margin-block-start: -38px">
            Analoghi suggeriti
          </h2>

          <div class="flex gap-3 relative top-2 sm:top-4 justify-center sm:justify-start">
            <div class="flex-col sm:flex-row flex h-6 shrink-0 justify-center gap-y-1 sm:items-center">
              <!-- wrapper visivo -->
              <label class="relative inline-flex items-center gap-2 cursor-pointer select-none">
                <input id="onlyKnown" type="checkbox" name="onlyKnown" aria-describedby="experimental-compounds-description"
                  class="peer sr-only" [formControl]="onlyKnown" role="switch" aria-label="Mostra solo composti noti" [attr.aria-checked]="onlyKnown.value" />

                <span class="inline-block size-4 rounded-sm border
                                   border-gray-300 bg-white
                                   peer-checked:bg-indigo-600 peer-checked:border-indigo-600
                                   dark:border-white/10 dark:bg-white/5
                                   dark:peer-checked:bg-indigo-500 dark:peer-checked:border-indigo-500"
                  aria-hidden="true"></span>

                <svg viewBox="0 0 14 14" fill="none" class="pointer-events-none hidden peer-checked:block
                                   absolute left-[2px] top-1/2 -translate-y-1/2 size-3.5 z-10" aria-hidden="true">
                  <path d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                    class="stroke-white" />
                </svg>

                <span class="text-sm font-medium text-gray-900 dark:text-white">Mostra solo composti noti</span>
              </label>
              <p id="experimental-compounds-description"
                class="text-xs sm:text-[0.625rem] md:text-sm text-slate-700 dark:text-slate-200 ml-2 mb-1 sm:mb-0 text-center sm:text-start">
                <span class="sm:hidden">Deselezionando questa opzione <br /> potrai vedere anche i lead sperimentali</span>
                <span class="hidden sm:inline">Deselezionando questa opzione potrai vedere anche i lead sperimentali</span>
              </p>
            </div>
          </div>


          <section class="rounded-md border border-slate-300 dark:border-slate-600 relative bottom-4">
            <m-similars [molecules]="similarMols() ?? []" [onlyKnown]="onlyKnownSig()" />
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
        <section class="w-5xl mx-auto h-full flex justify-center items-center" role="main" aria-busy="true" aria-live="polite">
          @if (design.maxBk('md')()) {
            <m-classic-spinner [size]="30" />
          } @else if (design.minBk('md')()) {
            <m-classic-spinner [size]="60" />
          }
        </section>
        }
  ` })
export class MoleculeDetailPageComponent {
  private readonly facade = inject(MoleculeDetailFacade)

  protected readonly userContext = inject(UserContextService)
  protected readonly typeGuards = inject(TypeGuardsService)
  protected readonly design = inject(DesignService)

  molecule$: Observable<MoleculeDetailItem | null> = this.facade.molecule$
  viewerReady = signal<boolean>(false)
  fetchError = this.facade.error
  similarMols = this.facade.similar
  fetchMolLoading = this.facade.loading
  collectionId = this.facade.collectionId
  protected molId = this.facade.currentId
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
    effect(() => {
      const similar = this.facade.similar()
      this.similarMols.set(this.onlyKnownSig() ? similar.filter(mol => mol.known) : similar)
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

}
