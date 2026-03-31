import { CustomDetailSaveModel } from '../../Models/custom-detail-save.model'
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop'
import { EmbeddingService } from '../../services/embedding.service'
import { SimilarsComponent } from '../../components/molecule-detail/similars/similars.component'
import { Component, DestroyRef, effect, inject, OnDestroy, OnInit, Signal, signal } from '@angular/core'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { MoleculeService } from '../../services/graphql/molecule.service'
import { switchMap, Observable, catchError, of, Subscription, tap, distinctUntilChanged, throwError, EMPTY, fromEvent, defer } from 'rxjs'
import { filter, map, mergeMap } from 'rxjs/operators'
import { AsyncPipe } from '@angular/common'
import { ThemeManagerService } from '../../services/context/theme-manager.service'
import { MoleculeHeaderComponent } from '../../components/molecule-detail/molecule-header/molecule-header.component'
import { MoleculeViewerComponent } from '../../components/chem/molecule-viewer/molecule-viewer.component'
import { MoleculePropertiesComponent } from '../../components/molecule-detail/molecule-properties/molecule-properties.component'
import { MoleculeRoutesComponent } from '../../components/molecule-detail/molecule-routes/molecule-routes.component'
import { MoleculeSynonymsComponent } from '../../components/molecule-detail/molecule-synonyms/molecule-synonyms.component'
import { MoleculeCtaChemblComponent } from '../../components/molecule-detail/molecule-cta-chembl/molecule-cta-chembl.component'
import { T1PredictionCardComponent } from '../../components/molecule-detail/t1-prediction-card/t1-prediction-card.component'
import { UserContextService } from '../../services/context/user-context.service'
import { MercurionAiService as MercurionAIService } from '../../services/mercurion-ai.service'
import { MoleculeSearchResult } from '../../Models/graphql/molecule-search/molecule-search-result.interface'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { TypeGuardsService } from '../../services/type-guards.service'
import { MoleculeCollectionItemService } from '../../services/graphql/molecule-collection-item.service'
import { MoleculeCollectionItemEntityShort, MoleculeDetailItem } from '../../Models/graphql/molecule-collection/molecule-collection.types'
import { ClassicSpinnerComponent } from '../../components/common/classic-spinner/classic-spinner.component'
import { CustomDetailsComponent } from '../../components/molecule-detail/my-molecule-custom-details/custom-details.component'
import { MoleculeDetailSystem } from '../../Models/graphql/molecule.detail.models'
import { ToastService } from '../../services/toast.service'
import { MyMoleculeJoinComponent } from '../../components/molecule-detail/my-molecule-join/my-molecule-join.component'
import { MyMoleculesHeadingComponent } from '../../components/molecule-detail/my-molecules-heading/my-molecules-heading.component'
import { LinkModel } from '../../Models/link.model'
import { MoleculeCollectionService } from '../../services/graphql/molecule-collection.service'
import { HistoryContextService } from '../../services/context/history-context.service'
import { ActionOverlayContextService } from '../../services/context/action-context/action-overlay-context.service'
import { BindCollectionsToMoleculeContextService } from '../../services/context/action-context/bind-collections-to-molecule-context.service'
import { HttpErrorResponse } from '@angular/common/http'
import { HttpErrorBody as HttpErrorBody } from '../../Models/http-error-body.dto'
import { AppTitleService } from '../../services/app-title.service'
import { DesignService } from '../../services/design.service'




@Component({
  selector: 'm-molecule-detail',
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
          <m-molecule-header [nameInput]="molecule.preferredNameIt" [chemblIdInput]="molecule.cmbId"
            [molId]="molecule.id.toString()" [isSystemMolecule]="true" [smiles]="molecule.canonicalSmiles" [isLoggedIn]="userContext.isLoggedIn()"
            (onAddToCollection)="doAddToManyCollections()" />
        } @else if (typeGuards.isChemblMolecule(molecule)) {
          <m-molecule-header [nameInput]="molecule.chemblDetails.preferredNameIt" [chemblIdInput]="molecule.chemblDetails.cmbId"
            [myMol]="true" [molId]="molecule.id" [smiles]="molecule.chemblDetails.canonicalSmiles"
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
                <m-molecule-viewer [mode]="'detail'" class="w-full h-full" [structure]="molecule.canonicalSmiles"
                (rendered)="viewerReady.set(true)" />
              } @else if (typeGuards.isChemblMolecule(molecule)) {
                <m-molecule-viewer [mode]="'detail'" class="w-full h-full" [structure]="molecule.chemblDetails.canonicalSmiles"
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
  `,
})
export class MoleculeDetailPageComponent implements OnInit, OnDestroy {

  // ======================= DEPS =======================
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly moleculeService = inject(MoleculeService)
  protected readonly themeManager = inject(ThemeManagerService)
  protected readonly userContext = inject(UserContextService)
  private readonly mercurionAIService = inject(MercurionAIService)
  private readonly embeddingService = inject(EmbeddingService)
  private readonly destroyRef = inject(DestroyRef)
  protected readonly typeGuards = inject(TypeGuardsService)
  protected readonly design = inject(DesignService)
  private readonly moleculeCollectionItemService = inject(MoleculeCollectionItemService)
  private readonly moleculeCollectionService = inject(MoleculeCollectionService)
  private readonly toast = inject(ToastService)
  private readonly historyContext = inject(HistoryContextService)
  private readonly actionOverlayContext = inject(ActionOverlayContextService)
  private readonly bindContext = inject(BindCollectionsToMoleculeContextService)
  private readonly appTitle = inject(AppTitleService)
  // ====================================================

  private readonly uuidV7Re = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  molecule$: Observable<MoleculeDetailItem | null> = of(null)
  viewerReady = signal<boolean>(false)
  similarViewerReady = signal<boolean>(false)
  fetchError = signal<boolean>(false)
  similarMols = signal<MoleculeSearchResult[] | undefined>(undefined)
  similarMolsCache = signal<MoleculeSearchResult[]>([])
  fetchMolLoading = signal<boolean>(true)
  collectionId = signal<string>('')
  private molCached?: MoleculeDetailItem
  private molType!: 'system' | 'chembl' | 'custom'
  protected molId!: string | number
  protected breadcrumb: LinkModel[] = [
    {
      label: 'Collezioni Molecolari',
      path: '/molecules/collections'
    }
  ]

  private onlySub?: Subscription
  private upLaSub?: Subscription
  private upNoSub?: Subscription
  private upNaSub?: Subscription
  private bcSub?: Subscription
  private touchSub?: Subscription
  private delSub?: Subscription

  onlyKnown = new FormControl<boolean>(true, { nonNullable: true })

  onlyKnownSig: Signal<boolean> = toSignal(
    this.onlyKnown.valueChanges,
    { initialValue: this.onlyKnown.value }
  )

  constructor() {
    this.fetchData()
    effect(() => {
      this.similarMols.set(this.onlyKnownSig() ? this.similarMolsCache().filter(mol => mol.known) : this.similarMolsCache())
    })
    effect(() => {
      if (!this.userContext.initials()) {
        queueMicrotask(() => this.fetchData())
      }
    })
    effect(() => {
      const t = this.bindContext.addedTick()
      if (t === 0) {
        return
      }
      queueMicrotask(() => this.fetchData())
    })
  }

  private handleCrossTabFetchData(e: StorageEvent): void {
    if (e.newValue) {
      this.fetchData()
      this.fetchSimilar()
    }
  }

  private fetchData(): void {
    // --- breadcrumb
    this.bcSub?.unsubscribe()
    this.bcSub = this.route.queryParamMap.pipe(
      map((qp): string => qp.get('c_id') ?? ''),
      filter(collectionId => collectionId.length > 0),
      switchMap((cId) => {
        if (!cId || !this.userContext.isLoggedIn()) return of(null)
        this.collectionId.set(cId)
        return this.moleculeCollectionService.getCollectionById(cId)
      }),
      distinctUntilChanged((a, b) => a?.id === b?.id)
    ).subscribe((col) => {
      if (col) {
        const list = [
          ...this.breadcrumb,
          {
            label: col.name,
            path: `/molecules/collections/detail/${col.id}`
          }
        ]
        this.breadcrumb = [...new Map(list.map(x => [x.path, x])).values()]
      }
    })


    this.molecule$ = this.route.paramMap.pipe(
      switchMap((params): Observable<string> => {
        this.viewerReady.set(false)
        this.fetchMolLoading.set(true)
        const molId = params.get('molId')
        if (!molId) {
          this.fetchError.set(true)
          return throwError(() => new Error('UndefinedMolregno'))
        }
        this.molId = molId
        return of(molId)
      }),
      switchMap((molId: string) => {
        const isUUID = this.uuidV7Re.test(molId)
        if (isUUID && !this.userContext.isLoggedIn()) {
          return this.moleculeCollectionItemService
            .existsChEMBLMoleculeByUUIDThenGetMolregno(molId)
            .pipe(
              tap(molregno => {
                if (molregno) {
                  const url = `/molecules/detail/${molregno}`
                  sessionStorage.setItem('redirectAfterLogin', url)
                  this.router.navigateByUrl(url)
                }
              }),
              mergeMap(molregno => (molregno ? EMPTY : of(molId)))
            )
        }
        return of(molId)
      }),
      switchMap(molId => {
        const isUUID = this.uuidV7Re.test(molId)
        if (!isUUID && this.userContext.isLoggedIn()) {
          return this.moleculeCollectionItemService
            .hasUserChEMBLMoleculeByMolregnoThenGetUUID(Number(molId))
            .pipe(
              map(molUUID => ({ molId, molUUID })) // molUUID: string | null
            )
        }
        return of({ molId, molUUID: null as string | null })
      }),
      switchMap(({ molId, molUUID }) => {
        const isMolUUID_UUID = this.uuidV7Re.test(molUUID ?? '')
        if (molUUID && isMolUUID_UUID && this.userContext.isLoggedIn()) {
          this.router.navigateByUrl(`/molecules/detail/${molUUID}`)
          return EMPTY
        }
        const isUUID = this.uuidV7Re.test(molId)
        if (!isUUID) {
          if (this.molCached && this.molCached.id === Number(molId)) {
            return of(this.molCached as MoleculeDetailItem)
          }
          return this.moleculeService.getMoleculeByMolregno(molId).pipe(
            map(mol => {
              if (!mol) {
                return null as MoleculeDetailItem | null
              }
              const sys: MoleculeDetailSystem = { ...mol, type: 'system' }
              this.molCached = sys
              return sys as MoleculeDetailItem
            }),
            catchError((e: HttpErrorResponse) => {
              const body: HttpErrorBody = e.error
              if (body.message?.startsWith('MoleculeDetailNotFound::')) {
                this.router.navigateByUrl('/404-not-found')
                return EMPTY
              }
              this.fetchError.set(true)
              return of(null as MoleculeDetailItem | null)
            })
          )
        }
        return defer(() =>
          this.moleculeCollectionItemService.getItemById(molId)
        ).pipe(
          catchError(() => {
            this.fetchError.set(true)
            return of(null)
          })
        )
      }),
      switchMap((item: MoleculeDetailItem | null): Observable<MoleculeDetailItem | null> => {
        if (!item) {
          this.fetchError.set(true)
          return of(null)
        }

        this.molType = item.type

        let smiles = ''
        if (this.typeGuards.isSystemMolecule(item)) {
          smiles = item.canonicalSmiles
          this.appTitle.setSection('Molecole', item.preferredNameIt ?? item.preferredName)
        } else if (this.typeGuards.isChemblMolecule(item)) {
          smiles = item.chemblDetails.canonicalSmiles
          this.appTitle.setSection('Molecole', item.chemblDetails.preferredNameIt ?? item.chemblDetails.preferredName)
        } else if (this.typeGuards.isCustomMolecule(item)) {
          if (item.propertiesJson) {
            item.properties = JSON.parse(item.propertiesJson)
          }
          smiles = item.canonicalSmiles
          this.appTitle.setSection('Molecole', item.name ?? 'Lead sconosciuto')
        }

        return this.userContext.isLoggedIn() ? this.mercurionAIService.t1Inference({ smiles }).pipe(
          map(t1 => ({ ...item, t1Inference: t1 })),
          tap(() => this.fetchMolLoading.set(false)),
          catchError(() => of(item))
        ) :
          of(item)
      }),
      catchError((err: unknown) => {
        const netErr = (err as Record<string, string>)['networkError']
        if (netErr && 'status' in (netErr as unknown as object)) this.fetchError.set(true)
        return of(null)
      })
    )
  }


  private fetchSimilar(): void {
    this.onlySub?.unsubscribe()
    this.onlySub = this.route.paramMap.pipe(
      map(params => params.get('molId')), // string | null
      distinctUntilChanged(),
      tap(() => this.similarViewerReady.set(false)),
      switchMap((id): Observable<string | null> => {
        if (!id) return of(null)
        // UUID -> prendo lo short e, se chembl, estraggo il molregno
        if (this.uuidV7Re.test(id)) {
          const svc$ = this.moleculeCollectionItemService.getItemShortById?.(id)

          const src: Observable<MoleculeCollectionItemEntityShort | null> =
            svc$ ?? of(null)

          return src.pipe(
            map((mol: MoleculeCollectionItemEntityShort | null) =>
              mol && this.typeGuards.isChemblMolecule(mol)
                ? `${mol.chemblMolregno}` // string
                : null
            )
          )
        }


        if (/^\d+$/.test(id)) {
          return of(id)
        }

        return of(null)
      }),

      switchMap((molregno): Observable<string[]> =>
        molregno ? this.embeddingService.getSimilarMolregnos(molregno, 65) : of([])
      ),

      switchMap((ids: string[]) =>
        this.moleculeService.getMoleculePreviewsByMolregnos(ids.map(String))
      ),

      tap(() => this.similarViewerReady.set(true)),
      catchError((e) => {
        console.error(e)
        this.similarViewerReady.set(false)
        return of([] as MoleculeSearchResult[])
      })
    ).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((previews) => {
        this.similarMolsCache.set(previews)
        this.similarMols.set(
          previews.filter(mol => mol.known && this.onlyKnown.value === true)
        )
      })
  }

  doUpdateInlineDetails(e: CustomDetailSaveModel): void {
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
      this.upNaSub = this.moleculeCollectionItemService.updateItemName(this.molId, name, this.molType).pipe(
        switchMap(() => this.historyContext.pollNewItem())
      ).subscribe(() => {/* pass */ })
    }
  }

  doDelete(id: string): void {
    this.delSub = this.moleculeCollectionItemService.deleteItem(id).subscribe({
      next: ok => {
        if (ok) {
          this.historyContext.triggerRemoveItemFromHistoryView(id)
          this.toast.trigger('Molecola eliminata con successo.', 'success', 2500)
          this.router.navigateByUrl('/molecules/collections')
        }
      },
      error: () => this.toast.trigger('Si è verificato un errore.', 'error', 2500)
    })
  }

  doAddToManyCollections(): void {
    queueMicrotask(() => {
      this.bindContext.setMoleculeId(this.molId.toString())
      this.actionOverlayContext.open('BindCollectionsToMolecule')
    })
  }

  ngOnInit(): void {
    this.fetchSimilar()
    fromEvent<StorageEvent>(window, 'storage')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(this.handleCrossTabFetchData.bind(this))
    this.touchSub = this.route.paramMap.pipe(
      map(pm => pm.get('molId') ?? ''),
      filter(id => id.length > 0),
      distinctUntilChanged(),
      switchMap(id =>
        this.route.queryParamMap.pipe(
          map(params => ({
            molId: id,
            colId: params.get('c_id') ?? ''
          }))
        )
      ),
      switchMap((args) => {
        const flagIds: { c_id?: string } = {}
        const isUUID_colId = this.uuidV7Re.test(args.colId)
        const isUUID_molId = this.uuidV7Re.test(args.molId)
        if (isUUID_colId && isUUID_molId) {
          flagIds.c_id = args.colId
        }
        return this.userContext.isLoggedIn()
          ?
          this.moleculeCollectionItemService.markItemAsTouched(args.molId, JSON.stringify(flagIds))
          :
          of(false)
      }),
      switchMap((ok) => {
        if (ok) {
          return this.historyContext.pollNewItem()
        }
        return of(null)
      })
    ).subscribe(() => {/* pass */ })
  }

  ngOnDestroy(): void {
    this.onlySub?.unsubscribe()
    this.upLaSub?.unsubscribe()
    this.upNoSub?.unsubscribe()
    this.upNaSub?.unsubscribe()
    this.bcSub?.unsubscribe()
    this.touchSub?.unsubscribe()
    this.delSub?.unsubscribe()
  }

}
