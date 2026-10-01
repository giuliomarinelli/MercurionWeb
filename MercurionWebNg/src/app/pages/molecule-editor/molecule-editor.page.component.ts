import { LoggerService } from '../../services/logger.service'
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import {
  EMPTY,
  Subject,
  Subscription,
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  firstValueFrom,
  map,
  of,
  switchMap,
  take,
  takeUntil,
  tap
} from 'rxjs'
import { FormsModule } from '@angular/forms'
import { SelectButtonModule } from 'primeng/selectbutton'

import {
  ChemistryEditorMode,
  ChemistryEditorTab,
  MoleculeEditorQp,
  isChemistryEditorMode,
  isChemistryEditorTab
} from '../../chemistry/chemistry-adapter.models'
import {
  MoleculeEditorDraftInit,
  MoleculeEditorDraftService,
  MoleculeEditorHistoryEntry
} from '../../chemistry/molecule-editor-draft.service'
import { KetcherFrameComponent } from '../../components/chem/ketcher-frame/ketcher-frame.component'
import { MoleculeItemLookup } from '../../Models/graphql/molecule-collection/molecule-collection.types'
import { ActionOverlayContextService } from '../../services/context/action-context/action-overlay-context.service'
import { MoleculeCollectionItemService } from '../../services/graphql/molecule-collection-item.service'
import { RdKitApiService } from '../../services/rd-kit-api.service'
import { ToastService } from '../../services/toast.service'
import { DescriptorCardContentComponent } from '../../components/common/descriptor-card-content/descriptor-card-content.component'
import { DescriptorCardsGridComponent } from '../../components/common/descriptor-cards-grid/descriptor-cards-grid.component'
import { MoleculeBadgeComponent } from '../../components/molecule-detail/molecule-badge/molecule-badge.component'
import { MoleculeService } from '../../services/graphql/molecule.service'
import { MoleculeNameByCanonicalSmilesDTO } from '../../services/graphql/molecule-name-by-canonical-smiles.dto'

@Component({
  selector: 'm-molecule-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    KetcherFrameComponent,
    SelectButtonModule,
    FormsModule,
    DescriptorCardContentComponent,
    DescriptorCardsGridComponent,
    MoleculeBadgeComponent
  ],
  template: `
    <main
      class="mt-2 mb-6"
      role="main"
      aria-live="polite"
      [attr.aria-busy]="pendingAction() !== null || pendingTabChange() !== null"
    >
      <h2
        class="text-center text-light-accent-primary-hc dark:text-dark-accent-primary font-semibold text-xl 2xs:text-2xl sm:text-4xl mb-6"
      >
        Editor Molecolare
      </h2>

      @if (!error()) {
        <div class="mb-5 flex justify-center">
          <span id="moleculeEditorTabLabel" class="sr-only">Modalità editor molecolare</span>
          <p-selectbutton
            class="editor-tabs"
            [options]="editorTabOptions()"
            [ngModel]="tab()"
            (ngModelChange)="onEditorTabChange($event)"
            optionLabel="label"
            optionValue="value"
            [allowEmpty]="false"
            [disabled]="pendingAction() !== null || pendingTabChange() !== null"
            ariaLabelledBy="moleculeEditorTabLabel"
          />
        </div>
        <section class="max-w-6xl mx-auto my-4" aria-labelledby="editor-properties-heading">
        <m-descriptor-cards-grid
              [cardsData]="[
                { title: 'Nome della molecola', bg: 'primary', content: molecularName },
                { title: 'Canonical SMILES', bg: 'secondary', content: canonicalSmilesContent },
              ]"
            />

            <ng-template #molecularName>
              <m-descriptor-card-content>
                <div class="flex gap-3 items-center">
                  {{ currentMoleculeName() ?? 'ND' }}
                  @if (currentMoleculeType() !== null) {
                  <m-molecule-badge [name]="currentMoleculeType()!" />
                  }
                </div>
              </m-descriptor-card-content>
            </ng-template>
            <ng-template #canonicalSmilesContent>
              <m-descriptor-card-content>
                <span class="font-mono text-sm break-all">
                  {{ currentCanonicalSmiles() || 'ND' }}
                </span>
              </m-descriptor-card-content>
            </ng-template>
        </section>


        <m-ketcher-frame
          [smiles]="smiles()"
          [baselineSmiles]="baselineSmiles()"
          [mode]="mode()"
          [tab]="tab()"
          [triggerReset]="triggerReset()"
          [triggerGetSmiles]="triggerGetSmiles()"
          (exportSmiles)="onSmilesExported($event)"
          (exportPolledSmiles)="onSmilesPollExported($event)"
          (onReset)="handleReset()"
        >
          <div class="flex flex-col 2xs:flex-row gap-3 mt-5 justify-end max-w-2xl mx-auto">
            <button
              class="relative bottom-0.5 w-full mt-4 py-2 text-white rounded-md transition-colors duration-150 bg-light-accent-primary-hq dark:bg-dark-accent-primary-btn hover:bg-light-accent-primary-hc dark:hover:bg-dark-accent-primary/80 disabled:bg-light-accent-primary-hq/60 disabled:dark:bg-dark-accent-primary/80 disabled:cursor-not-allowed disabled:hover:bg-light-accent-primary-hq/60 disabled:hover:dark:bg-dark-accent-primary/80"
              (click)="onReset()"
              [disabled]="untouched()"
              [attr.aria-disabled]="untouched()"
              aria-label="Resetta la struttura"
            >
              Resetta
            </button>

            @if (mode() === 'edit') {
              <button
                [disabled]="lock()"
                class="relative bottom-0.5 w-full mt-4 py-2 bg-emerald-600 text-white rounded-md font-semibold shadow hover:bg-emerald-700 disabled:bg-emerald-300 disabled:cursor-not-allowed transition-colors duration-150"
                (click)="onSave()"
                [attr.aria-disabled]="lock()"
                aria-label="Salva molecola"
              >
                Salva
              </button>
            } @else {
              <button
                [disabled]="lock()"
                class="relative bottom-0.5 w-full mt-4 py-2 bg-emerald-600 text-white rounded-md font-semibold shadow hover:bg-emerald-700 disabled:bg-emerald-300 disabled:cursor-not-allowed transition-colors duration-150"
                (click)="onSaveAsNew()"
                [attr.aria-disabled]="lock()"
                aria-label="Salva come nuova molecola"
              >
                Salva
              </button>
            }
          </div>
        </m-ketcher-frame>
        @if (tab() === 'live') {
          <section class="mt-6" aria-labelledby="editor-properties-heading">
            <h2
              id="editor-properties-heading"
              class="text-xl font-semibold mb-3 text-light-accent-primary-hc dark:text-dark-accent-primary text-center sm:text-left"
            >
              Proprietà chimico-fisiche
            </h2>



          </section>
        }
      } @else {
        <h3 class="text-center text-5xl font-semibold text-light-error dark:text-dark-error" role="alert" aria-live="assertive">
          Si è verificato un errore
        </h3>
      }
    </main>
  `,
  styles: `
  .editor-tabs {
    --p-togglebutton-background: transparent;
    --p-togglebutton-color: #475569;
    --p-togglebutton-hover-background: #f1f5f9;
    --p-togglebutton-hover-color: #0f172a;

    --p-togglebutton-checked-background: #2563eb;
    --p-togglebutton-checked-color: white;
    --p-togglebutton-content-checked-background: #2563eb;

    --p-togglebutton-padding: 0.5rem;
    --p-togglebutton-font-weight: 600;
  }
`
})
export class MoleculeEditorPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly moleculeCollectionItemService = inject(MoleculeCollectionItemService)
  private readonly overlayContext = inject(ActionOverlayContextService)
  private readonly toast = inject(ToastService)
  private readonly RDKitAPI = inject(RdKitApiService)
  private readonly logger = inject(LoggerService)
  private readonly drafts = inject(MoleculeEditorDraftService)
  private readonly qpRegistry = signal<MoleculeEditorQp | null>(null)
  private readonly moleculeService = inject(MoleculeService)

  private routeSub?: Subscription
  private molEdSub?: Subscription
  private molDupSub?: Subscription
  private molNameSub?: Subscription

  private readonly destroy$ = new Subject<void>()
  private readonly polledSmiles$ = new Subject<string>()

  readonly mode = signal<ChemistryEditorMode>('edit')
  readonly tab = signal<ChemistryEditorTab>('std')
  readonly smiles = signal('')
  readonly baselineSmiles = signal('')
  readonly mId = signal<string | undefined>(undefined)
  readonly error = signal(false)
  readonly triggerReset = signal(false)
  readonly triggerGetSmiles = signal(false)
  readonly pendingAction = signal<'save' | 'saveNew' | null>(null)
  readonly pendingTabChange = signal<ChemistryEditorTab | null>(null)
  readonly lock = signal(true)
  readonly untouched = signal(true)
  readonly currentCanonicalSmiles = signal('')
  readonly currentMoleculeName = signal<string | null>(null)
  readonly currentMoleculeType = signal<string | null>(null)

  readonly canUndo = this.drafts.canUndo
  readonly canRedo = this.drafts.canRedo
  readonly editorTabOptions = computed(() => [
    {
      label: this.mode() === 'create'
        ? 'Crea'
        : this.mode() === 'edit'
          ? 'Modifica'
          : 'Duplica',
      value: 'std' as ChemistryEditorTab
    },
    {
      label: 'Analisi live',
      value: 'live' as ChemistryEditorTab
    }
  ])

  onSave(): void {
    this.pendingAction.set('save')
    this.triggerGetSmiles.set(true)
  }

  onSaveAsNew(): void {
    this.pendingAction.set('saveNew')
    this.triggerGetSmiles.set(true)
  }

  onReset(): void {
    this.triggerReset.set(true)
  }

  onEditorTabChange(value: unknown): void {
    if (!isChemistryEditorTab(value) || value === this.tab()) return
    if (this.pendingAction() !== null || this.pendingTabChange() !== null) return

    this.pendingTabChange.set(value)
    this.triggerGetSmiles.set(true)
  }

  undoDraft(): void {
    this.applyHistoryEntry(this.drafts.undo())
  }

  redoDraft(): void {
    this.applyHistoryEntry(this.drafts.redo())
  }

  onSmilesPollExported(smiles: string): void {
    const trimmed = smiles.trim()

    if (!trimmed) {
      this.drafts.record('', this.tab())
      this.updateMoleculeDescriptor('')
      this.untouched.set(this.baselineSmiles() === '')
      this.lock.set(true)
    }

    this.polledSmiles$.next(smiles)
  }

  private updateMoleculeDescriptor(canonicalSmiles: string): void {
    const normalized = canonicalSmiles.trim()

    // The route is re-evaluated when switching editor tab. Do not repeat the
    // same name lookup if the molecular structure itself did not change.
    if (this.currentCanonicalSmiles() === normalized && this.molNameSub) return

    this.currentCanonicalSmiles.set(normalized)
    this.molNameSub?.unsubscribe()
    this.currentMoleculeName.set(null)
    this.currentMoleculeType.set(null)

    if (!normalized) return

    this.molNameSub = this.moleculeService
      .getPreferredNameItByCanonicalSmiles(normalized)
      .subscribe({
        next: (res: MoleculeNameByCanonicalSmilesDTO) => {
          if (!res.preferredNameIt) {
            this.currentMoleculeName.set(null)
            this.currentMoleculeType.set(null)
            return
          }

          this.currentMoleculeName.set(res.preferredNameIt)
          this.currentMoleculeType.set(
            res.type === 'chembl' ? 'ChEMBL' : 'Personal'
          )
        },
        error: error => {
          this.logger.error('Molecule name lookup error', error)
          this.currentMoleculeName.set(null)
          this.currentMoleculeType.set(null)
        }
      })
  }

  handleReset(): void {
    this.triggerReset.set(false)

    const entry = this.drafts.resetToBaseline(this.tab())
    const baseline = this.baselineSmiles()
    const restoredSmiles = entry?.smiles ?? baseline
    this.smiles.set(restoredSmiles)
    this.updateMoleculeDescriptor(restoredSmiles)
    this.untouched.set(true)
    this.lock.set(true)

    this.toast.trigger('Struttura ripristinata alla versione iniziale.', 'success', 1800)
  }

  private applyHistoryEntry(entry: MoleculeEditorHistoryEntry | null): void {
    if (!entry) return

    this.smiles.set(entry.smiles)
    this.updateMoleculeDescriptor(entry.smiles)
    this.untouched.set(entry.smiles === this.baselineSmiles())

    // La validazione di unicità viene rieseguita dal normale polling Ketcher.
    // Fino ad allora il salvataggio rimane fail-closed.
    this.lock.set(true)
  }

  private initializeDraft(init: MoleculeEditorDraftInit): void {
    const entry = this.drafts.initialize(init)

    this.mode.set(init.mode)
    this.mId.set(init.mId)
    this.baselineSmiles.set(init.baselineSmiles)

    // Restore the working structure before changing tab. KetcherFrame reloads
    // when its tab input changes, so structureValue must already contain the
    // recovered draft when the new iframe starts.
    this.smiles.set(entry.smiles)
    this.updateMoleculeDescriptor(entry.smiles)
    this.untouched.set(entry.smiles === init.baselineSmiles)
    this.lock.set(true)

    const restoredTab = this.drafts.currentTab()
    this.tab.set(restoredTab)

    if (this.pendingTabChange() === restoredTab) {
      this.pendingTabChange.set(null)
    }
  }

  private canonicalizeForEditor(smiles: string, logContext: string) {
    return this.RDKitAPI.toCanonicalSmiles({ smiles }).pipe(
      map(canon => canon?.trim() ? canon : smiles),
      catchError(error => {
        this.logger.error(logContext, error)
        return of(smiles)
      })
    )
  }

  private async checkDupe(smiles: string): Promise<string> {
    const canon = await firstValueFrom(
      this.RDKitAPI.toCanonicalSmiles({ smiles }).pipe(
        catchError(e => {
          this.logger.error('RDKitAPI canonicalization error', e)
          this.toast.trigger('Errore RDKit API nella canonicalizzazione della struttura della molecola.', 'error', 2500)
          return of('')
        })
      )
    )

    if (!canon || !canon.trim().length) {
      this.toast.trigger('SMILES vuota o non valida', 'error', 2500)
      this.pendingAction.set(null)
      return ''
    }

    const dupeRes = await firstValueFrom(
      this.moleculeCollectionItemService
        .findOneCustomMoleculeByCanonicalSmiles_shortFetch(canon)
        .pipe(
          catchError(e => {
            this.logger.error('Duplicate check save error', e)
            return of(null)
          })
        )
    )

    if (dupeRes) {
      this.lock.set(true)
      this.toast.trigger(
        `Questa struttura è già associata alla molecola '${dupeRes.name}'. Impossibile salvare una struttura duplicata`,
        'error'
      )
      return ''
    }

    return canon
  }

  async onSmilesExported(smiles: string): Promise<void> {
    this.triggerGetSmiles.set(false)

    const nextTab = this.pendingTabChange()
    if (nextTab) {
      await this.commitTabChange(smiles, nextTab)
      return
    }

    const canon = await this.checkDupe(smiles)
    if (!canon) {
      this.pendingAction.set(null)
      return
    }

    const action = this.pendingAction()

    if (action === 'saveNew') {
      this.doSaveNew(canon)
    } else if (action === 'save') {
      await this.doSaveEdit(canon)
    }

    this.pendingAction.set(null)
  }

  private async commitTabChange(smiles: string, nextTab: ChemistryEditorTab): Promise<void> {
    try {
      const trimmed = smiles.trim()
      const currentStructure = trimmed
        ? await firstValueFrom(
          this.canonicalizeForEditor(
            trimmed,
            'RDKitAPI tab-change canonicalization error'
          )
        )
        : ''

      this.drafts.record(currentStructure, this.tab())
      this.smiles.set(currentStructure)
      this.updateMoleculeDescriptor(currentStructure)
      this.drafts.setTab(nextTab)

      const qp = this.qpRegistry()
      if (!qp) return

      const navigated = await this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {
          mode: qp.mode,
          ...(qp.mId ? { m_id: qp.mId } : {}),
          ...(qp.smiles ? { smiles: qp.smiles } : {}),
          tab: nextTab,
          destroy_cache: 'false'
        },
        replaceUrl: true
      })

      if (!navigated) {
        this.pendingTabChange.set(null)
      }
    } catch (error) {
      this.pendingTabChange.set(null)
      throw error
    }
  }

  doSaveNew(smiles: string): void {
    if (!smiles) {
      this.toast.trigger('La molecola è vuota!', 'error')
      return
    }

    this.overlayContext.open('MoleculeCollectionItemSave', { mode: this.mode(), smiles })
  }

  async doSaveEdit(smiles: string): Promise<void> {
    const moleculeId = this.mId()
    if (!moleculeId) {
      this.logger.error('Cannot update molecule without an id')
      this.toast.trigger('Impossibile modificare la molecola.', 'error', 2000)
      return
    }

    const props = await firstValueFrom(
      this.RDKitAPI.getMoleculeProperties({ smiles }).pipe(
        catchError(e => {
          this.logger.error('RDKitAPI props error', e)
          this.toast.trigger('Errore RDKit API nelle proprietà', 'error', 2500)
          return of(null)
        })
      )
    )

    this.molEdSub = this.moleculeCollectionItemService
      .updateItemCanonicalSmiles(
        moleculeId,
        smiles,
        'custom',
        JSON.stringify(props ?? {})
      )
      .subscribe({
        next: res => {
          if (!res) {
            this.logger.error('Molecule update returned no item')
            this.toast.trigger('Si è verificato un errore.', 'error', 2000)
            return
          }

          this.drafts.clearCurrent()
          this.toast.trigger('Struttura modificata correttamente.', 'success', 2000)
          this.router.navigateByUrl(`/molecules/detail/${res.id}`)
        },
        error: () => this.toast.trigger('Si è verificato un errore.', 'error', 2000)
      })
  }

  ngOnInit(): void {
    this.routeSub = this.route.queryParamMap.pipe(
      switchMap(qp => {
        const rawMode = qp.get('mode')
        if (!isChemistryEditorMode(rawMode)) {
          this.error.set(true)
          return EMPTY
        }

        const rawTab = qp.get('tab')
        const tab: ChemistryEditorTab = isChemistryEditorTab(rawTab) ? rawTab : 'std'
        const destroyCache: 'true' | 'false' = qp.get('destroy_cache') === 'false' ? 'false' : 'true'
        const destroyExisting = destroyCache === 'true'
        const mId = qp.get('m_id') ?? undefined
        const routeSmiles = qp.get('smiles') ?? undefined

        this.qpRegistry.set({
          mode: rawMode,
          mId,
          smiles: routeSmiles,
          tab,
          destroyCache
        })
        this.error.set(false)

        if (rawMode === 'edit') {
          if (!mId) {
            this.error.set(true)
            return EMPTY
          }

          return this.moleculeCollectionItemService.getCustomSmilesById(mId).pipe(
            switchMap(mol =>
              this.canonicalizeForEditor(
                mol.canonicalSmiles,
                'RDKitAPI canonicalization init error'
              ).pipe(
                tap(baseline => this.initializeDraft({
                  mode: 'edit',
                  mId,
                  baselineSmiles: baseline,
                  tab,
                  destroyExisting
                }))
              )
            )
          )
        }

        if (rawMode === 'duplicate') {
          if (!routeSmiles) {
            this.error.set(true)
            return EMPTY
          }

          return this.canonicalizeForEditor(
            routeSmiles,
            'RDKitAPI duplicate baseline canonicalization error'
          ).pipe(
            tap(baseline => this.initializeDraft({
              mode: 'duplicate',
              baselineSmiles: baseline,
              tab,
              destroyExisting
            }))
          )
        }

        if (!routeSmiles) {
          this.initializeDraft({
            mode: 'create',
            baselineSmiles: '',
            tab,
            destroyExisting
          })
          return EMPTY
        }

        return this.canonicalizeForEditor(
          routeSmiles,
          'RDKitAPI create initial structure canonicalization error'
        ).pipe(
          tap(initialSmiles => this.initializeDraft({
            mode: 'create',
            baselineSmiles: '',
            initialSmiles,
            tab,
            destroyExisting
          }))
        )
      })
    ).subscribe({
      error: () => {
        this.pendingTabChange.set(null)
        this.error.set(true)
      }
    })

    this.molDupSub = this.polledSmiles$
      .pipe(
        takeUntil(this.destroy$),
        map(smiles => smiles.trim()),
        distinctUntilChanged(),
        filter(Boolean),
        debounceTime(300),
        switchMap(raw =>
          this.RDKitAPI.toCanonicalSmiles({ smiles: raw }).pipe(
            catchError(e => {
              this.logger.error('RDKitAPI canonical poll error', e)
              return EMPTY
            })
          )
        ),
        filter(Boolean),
        distinctUntilChanged(),
        switchMap((canon: string) => {
          this.drafts.record(canon, this.tab())
          this.updateMoleculeDescriptor(canon)

          return this.moleculeCollectionItemService
            .findOneCustomMoleculeByCanonicalSmiles_shortFetch(canon)
            .pipe(
              take(1),
              map(res => ({ canon, res })),
              catchError(e => {
                this.logger.error('Duplicate check stream error', e)
                return of({ canon, res: null as MoleculeItemLookup | null })
              })
            )
        })
      )
      .subscribe({
        next: ({ res, canon }: { res: MoleculeItemLookup | null; canon: string }) => {
          const isBaseline = canon === this.baselineSmiles()
          this.untouched.set(isBaseline)

          if (this.mode() === 'edit' && isBaseline) {
            this.lock.set(true)
            return
          }

          if (res) {
            this.lock.set(true)

            // Lo stato iniziale può legittimamente essere già presente nel
            // catalogo: non mostriamo un toast finché l'utente non lo modifica.
            if (!isBaseline) {
              this.toast.trigger(
                `Questa struttura è già associata alla molecola '${res.name}'. Impossibile salvare una struttura duplicata`,
                'error'
              )
            }
            return
          }

          this.lock.set(false)
        },
        error: () =>
          this.toast.trigger(
            'Errore nella validazione unicità struttura. Se si ripresenta, contatta il supporto.',
            'error'
          )
      })
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe()
    this.molEdSub?.unsubscribe()
    this.molDupSub?.unsubscribe()
    this.molNameSub?.unsubscribe()
    this.destroy$.next()
    this.destroy$.complete()
  }
}
