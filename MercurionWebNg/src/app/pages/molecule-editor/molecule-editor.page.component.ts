import { LoggerService } from '../../services/logger.service'
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, effect, inject, signal } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import {
  EMPTY,
  Subject,
  Subscription,
  catchError,
  auditTime,
  filter,
  firstValueFrom,
  map,
  of,
  switchMap,
  take,
  takeUntil,
  tap,
  timeout
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
import { EditorRequestScheduler } from '../../chemistry/editor-request-scheduler.service'
import { ProgressIndicatorComponent } from '../../components/common/progress-indicator/progress-indicator.component'

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
    LiveMoleculeAnalogsComponent,
    ProgressIndicatorComponent
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
              @if (hasStructure()) {
                @if (validationFailed()) {
                  <span>Verifica necessaria</span>
                } @else if (moleculeNameFailed()) {
                  <span class="italic">Ricerca del nome non riuscita</span>
                } @else if (identityChecking() || !currentCanonicalSmiles() || moleculeNameLoading()) {
                  <m-progress-indicator [size]="16" ariaLabel="Ricerca del nome della molecola" />
                } @else if (!currentMoleculeName()) {
                  <span class="italic">Nome non disponibile</span>
                } @else {
                  <span>{{ currentMoleculeName() }}</span>
                }
                @if (!moleculeNameLoading() && currentMoleculeType() !== null) {
                  <m-molecule-badge [name]="currentMoleculeType()!" />
                }
              } @else {
                <span class="italic">Nessuna struttura disegnata</span>
              }
            </dd>
          </div>
          <div class="m-editor-smiles">
            <dt>SMILES canonico</dt>
            <dd>
              <span class="m-editor-smiles-value" [class.font-mono]="currentCanonicalSmiles()" [class.italic]="!currentCanonicalSmiles() && !hasStructure()">
                @if (currentCanonicalSmiles()) {
                  {{ currentCanonicalSmiles() }}
                } @else if (hasStructure() && !validationFailed()) {
                  <m-progress-indicator [size]="16" ariaLabel="Aggiornamento SMILES canonico" />
                } @else if (hasStructure()) {
                  Verifica necessaria
                } @else {
                  Disponibile dopo il disegno della struttura
                }
              </span>
              @if (currentCanonicalSmiles()) {
                <m-copy-button [src]="currentCanonicalSmiles()" ariaLabel="Copia SMILES canonico" />
              }
            </dd>
          </div>
        </dl>
        <m-ketcher-frame [smiles]="smiles()" [baselineSmiles]="baselineSmiles()" [mode]="mode()" [tab]="tab()"
            [triggerReset]="triggerReset()" [triggerGetSmiles]="triggerGetSmiles()"
            (exportSmiles)="onSmilesExported($event)" (exportPolledSmiles)="onSmilesPollExported($event)"
            (structureChanged)="invalidateStructure()" (exportFailed)="handleExportFailure()" (onReset)="handleReset()">

            <div class="m-editor-status" [class.m-editor-status--error]="editorStatus().kind === 'error'"
                [class.m-editor-status--duplicate]="editorStatus().kind === 'duplicate'"
                [class.m-editor-status--ready]="editorStatus().kind === 'ready'">
              <span class="m-editor-status-icon" aria-hidden="true">
                @if (editorStatus().kind === 'busy') {
                  <m-progress-indicator [size]="16" />
                } @else {
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" focusable="false">
                    @if (editorStatus().kind === 'ready') {
                      <path d="m5 12 4 4L19 6" />
                    } @else {
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v6m0 3v1" />
                    }
                  </svg>
                }
              </span>
              <p class="m-editor-status-text" role="status" aria-live="polite" aria-atomic="true" [title]="editorStatus().text">{{ editorStatus().text }}</p>
              <button type="button" class="m-editor-status-retry" [disabled]="!canRetryIdentity()"
                  [style.visibility]="canRetryIdentity() ? 'visible' : 'hidden'"
                  aria-label="Riprova aggiornamento" (click)="retryIdentity()">Riprova</button>
            </div>

            <div class="m-editor-actions" role="group" aria-label="Azioni sul disegno">
                <button type="button" class="m-editor-action m-editor-action--secondary"
                    (click)="onReset()" [disabled]="untouched() || pendingAction() !== null || pendingTabChange() !== null"
                    aria-label="Resetta la struttura">{{ baselineSmiles() ? 'Ripristina struttura' : 'Svuota disegno' }}</button>
                @if (mode() === 'edit') {
                  <button type="button" class="m-editor-action m-editor-action--primary"
                    [disabled]="lock() || saveUnconfirmed() || pendingAction() !== null || pendingTabChange() !== null"
                    (click)="onSave()" aria-label="Salva molecola">Salva modifiche</button>
                } @else {
                  <button type="button" class="m-editor-action m-editor-action--primary"
                    [disabled]="lock() || saveUnconfirmed() || pendingAction() !== null || pendingTabChange() !== null"
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
  private readonly requests = inject(EditorRequestScheduler)
  readonly liveAnalysis = inject(MoleculeEditorLiveAnalysisFacade)

  private routeSub?: Subscription
  private molDupSub?: Subscription
  private saveInFlight = false
  private unconfirmedMoleculeId?: string

  private readonly destroy$ = new Subject<void>()
  private readonly polledSmiles$ = new Subject<{ smiles: string; revision: number }>()
  private validationRevision = 0
  private lastRawSmiles: string | undefined
  private lastPolledRevision = -1
  private destroyed = false
  readonly validationFailed = signal(false)
  readonly moleculeNameFailed = signal(false)
  readonly validationMessage = signal('')
  readonly identityChecking = signal(false)
  readonly duplicateFound = signal(false)
  private snapshotUnavailable = false

  readonly mode = signal<ChemistryEditorMode>('edit')
  readonly tab = signal<ChemistryEditorTab>('std')
  readonly smiles = signal('')
  readonly hasStructure = signal(false)
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
  readonly saveUnconfirmed = signal(false)
  readonly canRetryIdentity = computed(() => !this.saveUnconfirmed() && (this.validationFailed() || this.moleculeNameFailed()))
  readonly editorStatus = computed<{ kind: 'idle' | 'busy' | 'ready' | 'duplicate' | 'error'; text: string }>(() => {
    if (this.saveUnconfirmed() && !this.pendingAction()) return { kind: 'error', text: 'Salvataggio non confermato: verifica la molecola' }
    const waiting = this.requests.waiting()
    if (waiting && (this.pendingAction() || this.hasStructure() && !this.validationFailed() && !this.moleculeNameFailed())) {
      const text = waiting.kind === 'cooldown'
        ? `Pausa richieste. Ripresa alle ${new Date(waiting.resumeAt).toLocaleTimeString('it-IT')}`
        : waiting.kind === 'lock' ? 'In attesa di un’altra scheda…' : 'Richiesta in coda…'
      return { kind: 'busy', text }
    }
    if (this.pendingAction() || this.pendingTabChange()) return { kind: 'busy', text: 'Operazione in corso…' }
    if (!this.hasStructure()) return { kind: 'idle', text: 'Disegna una struttura' }
    if (this.validationFailed()) return { kind: 'error', text: this.snapshotUnavailable ? 'Lettura del disegno non riuscita' : 'Verifica non riuscita' }
    if (this.duplicateFound()) return { kind: 'duplicate', text: 'Struttura già presente' }
    if (this.identityChecking() || !this.currentCanonicalSmiles()) return { kind: 'busy', text: 'Verifica della struttura…' }
    if (this.moleculeNameFailed()) return { kind: 'error', text: 'Ricerca del nome non riuscita' }
    if (this.moleculeNameLoading()) return { kind: 'busy', text: 'Ricerca del nome…' }
    return { kind: 'ready', text: this.mode() === 'edit' && this.untouched() ? 'Nessuna modifica da salvare' : 'Struttura pronta' }
  })

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
      const revision = this.validationRevision

      this.currentMoleculeName.set(null)
      this.currentMoleculeType.set(null)
      this.moleculeNameFailed.set(false)

      if (!canonicalSmiles) {
        this.moleculeNameLoading.set(false)
        return
      }

      this.moleculeNameLoading.set(true)

      const sub = this.requests.run('/api/graphql', () => this.moleculeService.getPreferredNameItByCanonicalSmiles(canonicalSmiles), 1)
        .subscribe({
          next: res => {
            if (!this.isCurrent(revision) || this.currentCanonicalSmiles() !== canonicalSmiles) return

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
            if (!this.isCurrent(revision) || this.currentCanonicalSmiles() !== canonicalSmiles) return

            this.moleculeNameLoading.set(false)
            this.logger.error('Molecule name lookup error', error)
            this.currentMoleculeName.set(null)
            this.currentMoleculeType.set(null)
            this.moleculeNameFailed.set(true)
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
    if (this.lock() || this.saveUnconfirmed() || this.pendingAction() || this.pendingTabChange() || this.saveInFlight) return
    this.pendingAction.set('save')
    this.triggerGetSmiles.set(true)
  }

  onSaveAsNew(): void {
    if (this.lock() || this.saveUnconfirmed() || this.pendingAction() || this.pendingTabChange() || this.saveInFlight) return
    this.pendingAction.set('saveNew')
    this.triggerGetSmiles.set(true)
  }

  onReset(): void {
    if (this.pendingAction() || this.pendingTabChange()) return
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
    this.snapshotUnavailable = false
    const trimmed = smiles.trim()
    this.hasStructure.set(!!trimmed)
    if (trimmed === this.lastRawSmiles && this.lastPolledRevision === this.validationRevision) return
    this.invalidateStructure()
    this.lastRawSmiles = trimmed
    this.lastPolledRevision = this.validationRevision
    this.drafts.record(trimmed, this.tab())
    this.untouched.set(trimmed === this.baselineSmiles())
    this.validationMessage.set(trimmed ? 'Aggiornamento della struttura in corso…' : '')
    this.polledSmiles$.next({ smiles: trimmed, revision: this.validationRevision })
  }

  invalidateStructure(): void {
    this.validationRevision++
    this.lock.set(true)
    this.validationFailed.set(false)
    this.identityChecking.set(this.hasStructure())
    this.duplicateFound.set(false)
    this.setCurrentCanonicalSmiles('')
    // Empty is an invalidation event, not a value to filter before cancellation.
    this.polledSmiles$.next({ smiles: '', revision: this.validationRevision })
  }

  retryIdentity(): void {
    if (this.snapshotUnavailable) {
      this.triggerGetSmiles.set(true)
      return
    }
    this.lastPolledRevision = -1
    if (this.lastRawSmiles !== undefined) this.onSmilesPollExported(this.lastRawSmiles)
  }

  handleExportFailure(): void {
    this.snapshotUnavailable = true
    this.invalidateStructure()
    if (!this.saveInFlight) this.pendingAction.set(null)
    this.pendingTabChange.set(null)
    this.triggerGetSmiles.set(false)
    this.validationFailed.set(true)
    this.identityChecking.set(false)
    this.validationMessage.set('Lettura del disegno non riuscita. Il disegno è conservato; nuovo tentativo in corso…')
  }

  private isCurrent(revision: number): boolean {
    return !this.destroyed && revision === this.validationRevision
  }

  private setCurrentCanonicalSmiles(canonicalSmiles: string): void {
    this.currentCanonicalSmiles.set(canonicalSmiles.trim())
  }

  handleReset(): void {
    this.invalidateStructure()
    this.triggerReset.set(false)

    const entry = this.drafts.resetToBaseline(this.tab())
    const baseline = this.baselineSmiles()
    const restoredSmiles = entry?.smiles ?? baseline
    this.smiles.set(restoredSmiles)
    this.hasStructure.set(!!restoredSmiles.trim())
    this.identityChecking.set(this.hasStructure())
    this.untouched.set(true)
    this.lock.set(true)

    this.toast.trigger('Struttura ripristinata alla versione iniziale.', 'success', 1800)
  }

  private applyHistoryEntry(entry: MoleculeEditorHistoryEntry | null): void {
    if (!entry) return
    this.invalidateStructure()

    this.smiles.set(entry.smiles)
    this.hasStructure.set(!!entry.smiles.trim())
    this.identityChecking.set(this.hasStructure())
    this.untouched.set(entry.smiles === this.baselineSmiles())

    // La validazione di unicità viene rieseguita dal normale polling Ketcher.
    // Fino ad allora il salvataggio rimane fail-closed.
    this.lock.set(true)
  }

  private initializeDraft(init: MoleculeEditorDraftInit): void {
    this.invalidateStructure()
    const entry = this.drafts.initialize(init)

    this.mode.set(init.mode)
    this.mId.set(init.mId)
    this.baselineSmiles.set(init.baselineSmiles)

    // Restore the working structure before changing tab. KetcherFrame reloads
    // when its tab input changes, so structureValue must already contain the
    // recovered draft when the new iframe starts.
    this.smiles.set(entry.smiles)
    this.hasStructure.set(!!entry.smiles.trim())
    this.identityChecking.set(this.hasStructure())
    this.untouched.set(entry.smiles === init.baselineSmiles)
    this.lock.set(true)

    const restoredTab = this.drafts.currentTab()
    this.tab.set(restoredTab)

    if (this.pendingTabChange() === restoredTab) {
      this.pendingTabChange.set(null)
    }
  }

  private canonicalizeForEditor(smiles: string, logContext: string) {
    return this.requests.run('/api/rdkit-api/to-canonical-smiles', () => this.RDKitAPI.toCanonicalSmiles({ smiles })).pipe(
      map(canon => {
        if (!canon?.trim()) throw new Error('SMILES vuota o non valida')
        return canon.trim()
      }),
      tap({ error: error => this.logger.error(logContext, error) })
    )
  }

  private async checkDupe(smiles: string): Promise<string> {
    const revision = this.validationRevision
    const canon = this.currentCanonicalSmiles() || await firstValueFrom(
      this.canonicalizeForEditor(smiles, 'Canonicalization before save').pipe(
        takeUntil(this.destroy$)
      )
    )

    if (!this.isCurrent(revision)) return ''
    if (!canon || !canon.trim().length) {
      this.toast.trigger('SMILES vuota o non valida', 'error', 2500)
      this.pendingAction.set(null)
      return ''
    }

    const dupeRes = await firstValueFrom(
      this.requests.run('/api/graphql', () => this.moleculeCollectionItemService.findOneCustomMoleculeByCanonicalSmiles_shortFetch(canon))
        .pipe(
          takeUntil(this.destroy$)
        )
    )

    if (!this.isCurrent(revision)) return ''
    if (dupeRes) {
      this.duplicateFound.set(true)
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

    const action = this.pendingAction()
    if (this.saveInFlight) return
    if (!action) {
      this.onSmilesPollExported(smiles)
      return
    }
    if (smiles.trim() !== this.lastRawSmiles) {
      this.onSmilesPollExported(smiles)
      this.pendingAction.set(null)
      return
    }
    this.onSmilesPollExported(smiles)
    const revision = this.validationRevision
    this.saveInFlight = true
    try {
      const canon = await this.checkDupe(smiles)
      if (!canon || !this.isCurrent(revision)) return
      if (action === 'saveNew') this.doSaveNew(canon)
      else await this.doSaveEdit(canon)
    } catch (error) {
      if (this.isCurrent(revision)) {
        this.lock.set(true)
        this.validationFailed.set(true)
        this.validationMessage.set('Verifica non riuscita. Il disegno è conservato; riprova prima di salvare.')
        this.logger.error('Editor save validation failed', error)
      }
    } finally {
      this.saveInFlight = false
      this.pendingAction.set(null)
    }
  }

  private async commitTabChange(smiles: string, nextTab: ChemistryEditorTab): Promise<void> {
    try {
      // Switching views preserves the exported drawing, not a claimed canonical identity.
      const currentStructure = smiles.trim()

      this.drafts.record(currentStructure, this.tab())
      this.smiles.set(currentStructure)
      this.hasStructure.set(!!currentStructure)
      this.invalidateStructure()
      this.drafts.setTab(nextTab)

      const qp = this.qpRegistry()
      if (!qp) {
        this.pendingTabChange.set(null)
        return
      }

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
      this.logger.error('Editor view change failed', error)
      this.toast.trigger('Impossibile cambiare vista. Il disegno è conservato.', 'error')
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
    const revision = this.validationRevision
    const moleculeId = this.mId()
    if (!moleculeId) {
      this.logger.error('Cannot update molecule without an id')
      this.toast.trigger('Impossibile modificare la molecola.', 'error', 2000)
      return
    }

    const props = await firstValueFrom(
      this.requests.run('/api/rdkit-api/get-molecule-properties', () => this.RDKitAPI.getMoleculeProperties({ smiles })).pipe(
        takeUntil(this.destroy$),
        catchError(e => {
          this.logger.error('RDKitAPI props error', e)
          this.toast.trigger('Errore RDKit API nelle proprietà', 'error', 2500)
          return of(null)
        })
      )
    )

    if (!this.isCurrent(revision) || !props) return

    try {
      // A write is never retried by the read scheduler. Keep the action pending
      // through its response, not just through the preceding properties lookup.
      const res = await firstValueFrom(this.moleculeCollectionItemService.updateItemCanonicalSmiles(
        moleculeId,
        smiles,
        'custom',
        JSON.stringify(props ?? {})
      ).pipe(timeout(15_000), takeUntil(this.destroy$)))
      if (this.destroyed || this.mode() !== 'edit' || this.mId() !== moleculeId) return
      if (!res) throw new Error('Molecule update returned no item')
      const savedCurrentRevision = this.isCurrent(revision)
      this.drafts.acceptSavedBaseline(moleculeId, smiles)
      this.baselineSmiles.set(smiles)
      this.untouched.set(this.currentCanonicalSmiles() === smiles)
      if (this.untouched()) this.lock.set(true)
      if (!savedCurrentRevision) {
        this.toast.trigger('Versione inviata salvata. Le modifiche successive sono conservate.', 'success')
        return
      }
      this.drafts.clearCurrent()
      this.lock.set(true)
      this.toast.trigger('Struttura modificata correttamente.', 'success', 2000)
      await this.router.navigateByUrl(`/molecules/detail/${res.id}`).catch(error => {
        this.logger.error('Navigation after molecule update failed', error)
        this.toast.trigger('Struttura salvata. Impossibile aprire il dettaglio.', 'error')
      })
    } catch (error) {
      if (this.destroyed || this.mode() !== 'edit' || this.mId() !== moleculeId) return
      // A failed/expired transport does not prove the write was rolled back.
      // Preserve the draft and prevent another write in this editor context.
      this.saveUnconfirmed.set(true)
      this.unconfirmedMoleculeId = moleculeId
      this.logger.error('Molecule update outcome unconfirmed', error)
      this.toast.trigger('Salvataggio non confermato. Il disegno è conservato; verifica la molecola prima di un nuovo invio.', 'error')
    }
  }

  ngOnInit(): void {
    this.routeSub = this.route.queryParamMap.pipe(
      switchMap(qp => {
        this.invalidateStructure()
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
        this.saveUnconfirmed.set(rawMode === 'edit' && !!this.unconfirmedMoleculeId && mId === this.unconfirmedMoleculeId)

        if (rawMode === 'edit') {
          if (!mId) {
            this.error.set(true)
            return EMPTY
          }

          return this.moleculeCollectionItemService.getCustomSmilesById(mId).pipe(
            tap(mol => this.initializeDraft({
              mode: 'edit', mId, baselineSmiles: mol.canonicalSmiles,
              initialSmiles: routeSmiles, tab, destroyExisting
            })),
            catchError(error => {
              this.pendingTabChange.set(null)
              this.error.set(true)
              this.logger.error('Editor molecule loading failed', error)
              return EMPTY
            })
          )
        }

        if (rawMode === 'duplicate' && !routeSmiles) {
          this.error.set(true)
          return EMPTY
        }
        // Load raw drafts immediately. Only the revision pipeline publishes a
        // remotely confirmed canonical value; initialization does not compete.
        this.initializeDraft({
          mode: rawMode,
          baselineSmiles: routeBaselineSmiles ?? (rawMode === 'duplicate' ? routeSmiles ?? '' : ''),
          initialSmiles: routeSmiles, tab, destroyExisting
        })
        return EMPTY
      })
    ).subscribe({
      error: () => {
        this.pendingTabChange.set(null)
        this.error.set(true)
      }
    })

    this.molDupSub = this.polledSmiles$.pipe(
      // Bounded coalescing also emits while drawing continuously. Invalidation
      // below cancels obsolete consumers immediately, before this trailing tick.
      auditTime(300),
      switchMap(raw => !raw.smiles ? EMPTY : this.canonicalizeForEditor(raw.smiles, 'Editor canonicalization failed').pipe(
        filter(() => this.isCurrent(raw.revision)),
        tap(canon => this.setCurrentCanonicalSmiles(canon)),
        switchMap(canon => this.requests.run('/api/graphql', () =>
          this.moleculeCollectionItemService.findOneCustomMoleculeByCanonicalSmiles_shortFetch(canon)
        ).pipe(map(res => ({ canon, res, revision: raw.revision })))),
        catchError(error => {
          if (this.isCurrent(raw.revision)) {
            this.lock.set(true)
            this.validationFailed.set(true)
            this.identityChecking.set(false)
            this.validationMessage.set('Aggiornamento non riuscito. Il disegno è conservato: riprova.')
            this.logger.error('Editor identity validation failed', error)
          }
          return EMPTY
        }),
        takeUntil(this.polledSmiles$)
      )),
      takeUntil(this.destroy$)
    ).subscribe(({ canon, res, revision }) => {
      if (!this.isCurrent(revision)) return
      const isBaseline = canon === this.baselineSmiles()
      this.untouched.set(isBaseline)
      this.identityChecking.set(false)
      this.duplicateFound.set(!!res)
      this.validationMessage.set(res ? 'Questa struttura è già presente nelle tue molecole.' : '')
      this.lock.set(!!res || (this.mode() === 'edit' && isBaseline))
    })
  }

  ngOnDestroy(): void {
    this.destroyed = true
    this.validationRevision++
    this.routeSub?.unsubscribe()
    this.molDupSub?.unsubscribe()
    this.destroy$.next()
    this.destroy$.complete()
  }
}
