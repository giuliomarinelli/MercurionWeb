import { LoggerService } from '../../services/logger.service'
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, effect, inject, signal } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import {
  EMPTY,
  Subject,
  Subscription,
  catchError,
  debounceTime,
  distinctUntilChanged,
  exhaustMap,
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
import { DescriptorCardsGridComponent } from '../../components/common/descriptor-cards-grid/descriptor-cards-grid.component'
import { MoleculeBadgeComponent } from '../../components/molecule-detail/molecule-badge/molecule-badge.component'
import { MoleculeService } from '../../services/graphql/molecule.service'
import { CopyButtonComponent } from '../../components/common/copy-button/copy-button.component'
import { LiveTox21SummaryComponent } from '../../components/molecule-editor/live-tox21-summary/live-tox21-summary.component'
import { LiveMoleculeAnalogsComponent } from '../../components/molecule-editor/live-molecule-analogs/live-molecule-analogs.component'
import { MoleculeEditorLiveAnalysisFacade } from './molecule-editor-live-analysis.facade'

@Component({
  selector: 'm-molecule-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    KetcherFrameComponent,
    SelectButtonModule,
    FormsModule,
    DescriptorCardsGridComponent,
    MoleculeBadgeComponent,
    CopyButtonComponent,
    LiveTox21SummaryComponent,
    LiveMoleculeAnalogsComponent
  ],
  providers: [MoleculeEditorLiveAnalysisFacade],
  template: `
<main class="m-editor-page" aria-labelledby="editor-heading"
    [attr.aria-busy]="pendingAction() !== null || pendingTabChange() !== null">
    <header class="m-editor-header">
      <p class="m-editor-eyebrow">Editor molecolare</p>
      <h1 id="editor-heading" class="text-2xl sm:text-3xl font-semibold text-light-accent-primary-hc dark:text-dark-accent-primary">{{ modeTitle() }}</h1>
      <p class="m-editor-description">{{ modeDescription() }}</p>
    </header>

    @if (!error()) {
    <div class="m-editor-view-selector">
        <span id="moleculeEditorTabLabel" class="sr-only">Vista dell’editor</span>
        <p-selectbutton class="editor-tabs" [options]="editorTabOptions()" [ngModel]="tab()"
            (ngModelChange)="onEditorTabChange($event)" optionLabel="label" optionValue="value" [allowEmpty]="false"
            [disabled]="pendingAction() !== null || pendingTabChange() !== null"
            ariaLabelledBy="moleculeEditorTabLabel" />
    </div>
    <div class="m-editor-layout" [class.m-editor-layout--live]="tab() === 'live'">
      <section class="m-editor-workspace" aria-label="Disegno e identità molecolare">
        <dl class="m-editor-identity" aria-label="Identità molecolare">
          <div class="m-editor-name">
            <dt>Nome della molecola</dt>
            <dd>
              <span>{{ moleculeNameLoading() ? 'Ricerca del nome…' : (currentMoleculeName() ?? (currentCanonicalSmiles() ? 'Molecola non identificata' : 'Nessuna struttura disegnata')) }}</span>
              @if (!moleculeNameLoading() && currentMoleculeType() !== null) {
                <m-molecule-badge [name]="currentMoleculeType()!" />
              }
            </dd>
          </div>
          <div class="m-editor-smiles">
            <dt>SMILES canonico</dt>
            <dd>
              <span class="m-editor-smiles-value" [class.font-mono]="currentCanonicalSmiles()">{{ currentCanonicalSmiles() || 'Disponibile dopo il disegno della struttura' }}</span>
              @if (currentCanonicalSmiles()) {
                <m-copy-button [src]="currentCanonicalSmiles()" ariaLabel="Copia SMILES canonico" />
              }
            </dd>
          </div>
        </dl>
        <m-ketcher-frame [smiles]="smiles()" [baselineSmiles]="baselineSmiles()" [mode]="mode()" [tab]="tab()"
            [triggerReset]="triggerReset()" [triggerGetSmiles]="triggerGetSmiles()"
            (exportSmiles)="onSmilesExported($event)" (exportPolledSmiles)="onSmilesPollExported($event)"
            (onReset)="handleReset()">

            <div class="m-editor-actions" role="group" aria-label="Azioni sul disegno">
                <button type="button" class="m-editor-action m-editor-action--secondary"
                    (click)="onReset()" [disabled]="untouched() || pendingAction() !== null || pendingTabChange() !== null"
                    aria-label="Resetta la struttura">{{ baselineSmiles() ? 'Ripristina struttura' : 'Svuota disegno' }}</button>
                @if (mode() === 'edit') {
                  <button type="button" class="m-editor-action m-editor-action--primary"
                    [disabled]="lock() || pendingAction() !== null || pendingTabChange() !== null"
                    (click)="onSave()" aria-label="Salva molecola">Salva modifiche</button>
                } @else {
                  <button type="button" class="m-editor-action m-editor-action--primary"
                    [disabled]="lock() || pendingAction() !== null || pendingTabChange() !== null"
                    (click)="onSaveAsNew()" aria-label="Salva come nuova molecola">Salva nuova molecola</button>
                }
            </div>
        </m-ketcher-frame>
      </section>
        @if (tab() === 'live') {
          <aside class="m-editor-analysis" aria-labelledby="live-analysis-heading">
            <h2 id="live-analysis-heading" class="text-lg font-semibold">Analisi live</h2>
            <p class="m-editor-description">Risultati aggiornati sulla struttura disegnata.</p>
            <m-descriptor-cards-grid
              [columns]="1"
              density="compact"
              [cardsData]="[
                { title: 'Predizione Tox21', bg: 'primary', content: tox21Live },
                { title: 'Analoghi più simili', bg: 'secondary', content: analogsLive }
              ]"
            />

            <ng-template #tox21Live>
              <m-live-tox21-summary
                [inference]="liveAnalysis.toxPrediction()"
                [loading]="liveAnalysis.toxLoading()"
                [error]="liveAnalysis.toxError()"
              />
            </ng-template>

            <ng-template #analogsLive>
              <m-live-molecule-analogs
                [molecules]="liveAnalysis.analogs()"
                [loading]="liveAnalysis.analogsLoading()"
                [error]="liveAnalysis.analogsError()"
                [unavailable]="liveAnalysis.analogsUnavailable()"
              />
            </ng-template>
          </aside>
        }
    </div>
    } @else {
    <h2 class="text-lg font-semibold text-light-error dark:text-dark-error" role="alert"
        aria-live="assertive">
        Impossibile aprire questo editor. Verifica il collegamento alla molecola.
    </h2>
    }
</main>
  `,
  styleUrl: './molecule-editor.page.component.css'
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
  readonly liveAnalysis = inject(MoleculeEditorLiveAnalysisFacade)

  private routeSub?: Subscription
  private molEdSub?: Subscription
  private molDupSub?: Subscription

  private readonly destroy$ = new Subject<void>()
  private readonly polledSmiles$ = new Subject<string>()
  private validationRevision = 0

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
  readonly moleculeNameLoading = signal(false)
  readonly currentMoleculeName = signal<string | null>(null)
  readonly currentMoleculeType = signal<string | null>(null)

  readonly canUndo = this.drafts.canUndo
  readonly canRedo = this.drafts.canRedo
  readonly modeTitle = computed(() => this.mode() === 'create' ? 'Crea una molecola' : this.mode() === 'edit' ? 'Modifica la struttura' : 'Duplica una molecola')
  readonly modeDescription = computed(() => this.mode() === 'create'
    ? 'Disegna una struttura e salvala nelle tue collezioni.'
    : this.mode() === 'edit'
      ? 'Le modifiche verranno applicate alla molecola personale originale.'
      : 'Parti dalla struttura esistente per creare una nuova molecola. L’originale resta invariato.')
  readonly editorTabOptions = computed(() => [
    { label: 'Disegno', value: 'std' as ChemistryEditorTab },
    { label: 'Analisi live', value: 'live' as ChemistryEditorTab }
  ])

  constructor() {
    effect(onCleanup => {
      const canonicalSmiles = this.currentCanonicalSmiles()

      this.currentMoleculeName.set(null)
      this.currentMoleculeType.set(null)

      if (!canonicalSmiles) {
        this.moleculeNameLoading.set(false)
        return
      }

      this.moleculeNameLoading.set(true)

      const sub = of(null)
        .pipe(
          exhaustMap(() => this.moleculeService.getPreferredNameItByCanonicalSmiles(canonicalSmiles))
        )
        .subscribe({
          next: res => {
            if (this.currentCanonicalSmiles() !== canonicalSmiles) return

            this.moleculeNameLoading.set(false)

            if (!res.name) {
              this.currentMoleculeName.set(null)
              this.currentMoleculeType.set(null)
              return
            }

            this.currentMoleculeName.set(res.name)
            this.currentMoleculeType.set(
              { chembl: 'ChEMBL', custom: 'Personal', iupac: 'IUPAC' }[res.type]
            )
          },
          error: error => {
            if (this.currentCanonicalSmiles() !== canonicalSmiles) return

            this.moleculeNameLoading.set(false)
            this.logger.error('Molecule name lookup error', error)
            this.currentMoleculeName.set(null)
            this.currentMoleculeType.set(null)
          }
        })

      onCleanup(() => sub.unsubscribe())
    })

    effect(() => {
      this.liveAnalysis.setContext(
        this.currentCanonicalSmiles(),
        this.tab() === 'live'
      )
    })
  }

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
      this.setCurrentCanonicalSmiles('')
      this.untouched.set(this.baselineSmiles() === '')
      this.lock.set(true)
    }

    this.polledSmiles$.next(smiles)
  }

  private setCurrentCanonicalSmiles(canonicalSmiles: string): void {
    this.currentCanonicalSmiles.set(canonicalSmiles.trim())
  }

  handleReset(): void {
    this.validationRevision += 1
    this.triggerReset.set(false)

    const entry = this.drafts.resetToBaseline(this.tab())
    const baseline = this.baselineSmiles()
    const restoredSmiles = entry?.smiles ?? baseline
    this.smiles.set(restoredSmiles)
    this.setCurrentCanonicalSmiles(restoredSmiles)
    this.untouched.set(true)
    this.lock.set(true)

    this.toast.trigger('Struttura ripristinata alla versione iniziale.', 'success', 1800)
  }

  private applyHistoryEntry(entry: MoleculeEditorHistoryEntry | null): void {
    if (!entry) return
    this.validationRevision += 1

    this.smiles.set(entry.smiles)
    this.setCurrentCanonicalSmiles(entry.smiles)
    this.untouched.set(entry.smiles === this.baselineSmiles())

    // La validazione di unicità viene rieseguita dal normale polling Ketcher.
    // Fino ad allora il salvataggio rimane fail-closed.
    this.lock.set(true)
  }

  private initializeDraft(init: MoleculeEditorDraftInit): void {
    this.validationRevision += 1
    const entry = this.drafts.initialize(init)

    this.mode.set(init.mode)
    this.mId.set(init.mId)
    this.baselineSmiles.set(init.baselineSmiles)

    // Restore the working structure before changing tab. KetcherFrame reloads
    // when its tab input changes, so structureValue must already contain the
    // recovered draft when the new iframe starts.
    this.smiles.set(entry.smiles)
    this.setCurrentCanonicalSmiles(entry.smiles)
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
      this.setCurrentCanonicalSmiles(currentStructure)
      this.drafts.setTab(nextTab)

      const qp = this.qpRegistry()
      if (!qp) return

      const navigated = await this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {
          mode: qp.mode,
          ...(qp.mId ? { m_id: qp.mId } : {}),
          smiles: currentStructure,
          baseline_smiles: this.baselineSmiles(),
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
        const routeBaselineSmiles = qp.get('baseline_smiles') ?? undefined

        this.qpRegistry.set({
          mode: rawMode,
          mId,
          smiles: routeSmiles,
          baselineSmiles: routeBaselineSmiles,
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
                  initialSmiles: routeSmiles,
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

          const duplicateBaselineSource = routeBaselineSmiles ?? routeSmiles

          return this.canonicalizeForEditor(
            duplicateBaselineSource,
            'RDKitAPI duplicate baseline canonicalization error'
          ).pipe(
            tap(baseline => this.initializeDraft({
              mode: 'duplicate',
              baselineSmiles: baseline,
              initialSmiles: routeSmiles,
              tab,
              destroyExisting
            }))
          )
        }

        const createBaseline = routeBaselineSmiles ?? ''

        if (!routeSmiles) {
          this.initializeDraft({
            mode: 'create',
            baselineSmiles: createBaseline,
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
            baselineSmiles: createBaseline,
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
        // A restored draft must be revalidated even when its SMILES are unchanged.
        map(smiles => ({ smiles: smiles.trim(), revision: this.validationRevision })),
        distinctUntilChanged((a, b) => a.smiles === b.smiles && a.revision === b.revision),
        filter(value => !!value.smiles),
        debounceTime(300),
        switchMap(raw =>
          this.RDKitAPI.toCanonicalSmiles({ smiles: raw.smiles }).pipe(
            catchError(e => {
              this.logger.error('RDKitAPI canonical poll error', e)
              return EMPTY
            }),
            map(canon => ({ canon, revision: raw.revision }))
          )
        ),
        filter(value => !!value.canon),
        distinctUntilChanged((a, b) => a.canon === b.canon && a.revision === b.revision),
        switchMap(({ canon }) => {
          this.drafts.record(canon, this.tab())
          this.setCurrentCanonicalSmiles(canon)

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
    this.destroy$.next()
    this.destroy$.complete()
  }
}
