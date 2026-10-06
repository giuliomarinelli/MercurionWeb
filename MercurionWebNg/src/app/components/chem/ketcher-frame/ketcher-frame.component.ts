import { ChangeDetectionStrategy, Component, effect, ElementRef, NgZone, OnDestroy, OnInit, signal, input, output, inject, untracked, viewChild } from '@angular/core'
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser'
import {
  catchError,
  defer,
  EMPTY,
  exhaustMap,
  filter,
  finalize,
  from,
  interval,
  Subject,
  Subscription,
  take,
  takeUntil,
  tap
} from 'rxjs'

import {
  ChemistryAdapterError,
  ChemistryEditorMode,
  ChemistryEditorSession,
  ChemistryEditorTab
} from '../../../chemistry/chemistry-adapter.models'
import { ChemistryEditorService } from '../../../chemistry/chemistry-editor.service'
import { buildKetcherResourceUrl } from '../../../chemistry/ketcher-editor.config'
import { PublicPipe } from '../../../pipes/public.pipe'
import { ViewportRuntimeService } from '../../../services/context/viewport-runtime.service'

@Component({
  selector: 'm-ketcher-frame',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative w-full" role="region" aria-label="Editor molecolare">
      @if (editorState() === 'unavailable') {
        <div class="flex min-h-[320px] flex-col items-center justify-center gap-4 px-4 text-center" role="alert">
          <p class="font-semibold text-light-error dark:text-dark-error">{{ editorError() }}</p>
          <button
            type="button"
            class="rounded-md bg-light-accent-primary-hq px-4 py-2 text-white dark:bg-dark-accent-primary-btn"
            (click)="retry()"
          >
            Riprova
          </button>
        </div>
      } @else {
        <div class="relative mx-auto h-[70vh] min-h-[320px] max-h-[540px] w-full max-w-[1380px] sm:h-[500px] lg:px-8">
          @if (ketcherUrl()) {
            <iframe
              #ketcherIframe
              [src]="ketcherUrl()"
              class="block h-full w-full border-none shadow-[0_1px_12px_rgba(15,23,42,0.18)] dark:shadow-none"
              title="Editor molecolare"
              [attr.aria-busy]="editorState() === 'loading'"
            ></iframe>
          }

          @if (editorState() === 'loading') {
            <div
              class="pointer-events-none absolute inset-y-0 inset-x-0 animate-pulse bg-gray-300 dark:bg-neutral-700 lg:inset-x-8"
              role="status"
              aria-live="polite"
              aria-label="Caricamento editor in corso"
            ></div>
          }
        </div>
      }

      @if (editorState() !== 'unavailable') {
        <ng-content></ng-content>
      }
    </div>
  `
})
export class KetcherFrameComponent implements OnInit, OnDestroy {
  private readonly viewportRuntime = inject(ViewportRuntimeService)
  private readonly publicPipe = inject(PublicPipe);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly editor = inject(ChemistryEditorService);
  private readonly zone = inject(NgZone);

  readonly ketcherUrl = signal<SafeResourceUrl | null>(null)
  readonly editorState = signal<'loading' | 'ready' | 'unavailable'>('loading')
  readonly editorError = signal('L’editor molecolare non è disponibile.')

  private initialSmiles = ''
  private readonly destroy$ = new Subject<void>()
  private readonly exporting = signal(false)
  private readonly triggerResetSignal = signal(false)
  private readonly triggerGetSmilesSignal = signal(false)
  private session?: ChemistryEditorSession
  private iframe?: HTMLIFrameElement
  private unsubscribeState?: () => void
  private exportSubscription?: Subscription
  private pollSubscription?: Subscription
  private sessionGeneration = 0
  private destroyed = false
  private activeSessionTab?: ChemistryEditorTab

  readonly mode = input<ChemistryEditorMode>('create')
  readonly tab = input<ChemistryEditorTab>('std')

  readonly smiles = input<string | undefined>(undefined)
  readonly baselineSmiles = input<string | undefined>(undefined)
  readonly triggerReset = input(false)
  readonly triggerGetSmiles = input(false)

  readonly molChange = output<string>();
  readonly exportSmiles = output<string>();
  readonly exportPolledSmiles = output<string>();
  readonly onReset = output<void>();

  readonly iframeRef = viewChild<ElementRef<HTMLIFrameElement>>('ketcherIframe')

  constructor() {
    effect(() => {
      this.initialSmiles = this.baselineSmiles() ?? this.smiles() ?? ''
    })
    effect(() => {
      const tab = this.tab()
      if (this.activeSessionTab !== undefined && this.activeSessionTab !== tab) {
        void this.startSession()
      }
    })
    effect(() => {
      const nextSmiles = this.smiles() ?? ''
      if (untracked(() => this.editorState()) === 'ready') {
        void this.updateEditorStructure(nextSmiles)
      }
    })
    effect(() => this.triggerResetSignal.set(this.triggerReset()))
    effect(() => this.triggerGetSmilesSignal.set(this.triggerGetSmiles()))
    effect(() => {
      this.iframe = this.iframeRef()?.nativeElement
      if (this.iframe) this.session?.attach(this.iframe)
    })
    effect(() => {
      if (this.triggerResetSignal()) {
        this.triggerResetSignal.set(false)
        this.resetMolecule()
        this.zone.run(() => this.onReset.emit(undefined))
        return
      }

      if (this.triggerGetSmilesSignal()) {
        this.triggerGetSmilesSignal.set(false)
        this.exporting.set(true)
        this.exportSubscription = this.requestExportSmiles$('explicit')
          .pipe(
            take(1),
            finalize(() => this.exporting.set(false))
          )
          .subscribe({ error: error => this.showError(error) })
      }
    })

  }

  ngOnInit(): void {
    void this.startSession()

    this.pollSubscription = interval(250)
      .pipe(
        takeUntil(this.destroy$),
        filter(() => this.editorState() === 'ready'),
        filter(() => !this.exporting()),
        exhaustMap(() => this.requestExportSmiles$('poll').pipe(catchError(() => EMPTY)))
      )
      .subscribe()
  }

  ngOnDestroy(): void {
    this.destroyed = true
    this.sessionGeneration += 1
    this.destroy$.next()
    this.destroy$.complete()
    this.exportSubscription?.unsubscribe()
    this.pollSubscription?.unsubscribe()
    this.disposeSession()
    this.teardownMobileKeyboardGuard()
    clearTimeout(this.loadedTimeoutId)
  }

  retry(): void {
    void this.startSession()
  }

  requestExportSmiles(): void {
    this.requestExportSmiles$('explicit')
      .pipe(take(1))
      .subscribe({ error: error => this.showError(error) })
  }

  resetMolecule(): void {
    if (this.editorState() === 'ready') void this.updateEditorStructure(this.initialSmiles)
  }

  private async startSession(): Promise<void> {
    const generation = ++this.sessionGeneration
    clearTimeout(this.loadedTimeoutId)
    this.teardownMobileKeyboardGuard()
    this.disposeSession()
    this.ketcherUrl.set(null)
    this.editorState.set('loading')

    try {
      const tab = this.tab()
      this.activeSessionTab = tab
      const resourceUrl = buildKetcherResourceUrl(
        this.publicPipe.transform('ketcher/index.html'),
        tab
      )
      const session = await this.editor.createSession(resourceUrl)

      if (this.destroyed || generation !== this.sessionGeneration) {
        session.dispose()
        return
      }

      this.session = session
      this.unsubscribeState = session.onStateChange(state => {
        if (state.status === 'ready') {
          void this.initializeReadySession(session, generation)
          return
        }

        this.zone.run(() => {
          this.editorState.set(state.status)
          if (state.error) this.editorError.set(state.error.message)
        })
      })
      this.ketcherUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(session.resourceUrl))
      if (this.iframe) session.attach(this.iframe)
    } catch (error) {
      if (generation === this.sessionGeneration) this.showError(error)
    }
  }

  private async initializeReadySession(
    session: ChemistryEditorSession,
    generation: number
  ): Promise<void> {
    try {
      await session.setStructure(this.smiles() ?? '')

      if (
        this.destroyed ||
        generation !== this.sessionGeneration ||
        this.session !== session
      ) {
        return
      }

      this.zone.run(() => {
        this.editorState.set('ready')
        this.loadedTimeoutId = setTimeout(() => this.installMobileKeyboardGuard(), 50)
      })
    } catch (error) {
      if (generation === this.sessionGeneration && this.session === session) {
        this.showError(error)
      }
    }
  }

  private disposeSession(): void {
    this.unsubscribeState?.()
    this.unsubscribeState = undefined
    this.session?.dispose()
    this.session = undefined
    this.iframe = undefined
  }

  private requestExportSmiles$(kind: 'explicit' | 'poll') {
    return defer(() => {
      const session = this.session
      if (!session) {
        throw new ChemistryAdapterError('unavailable', 'L’editor molecolare non è disponibile.')
      }

      return from(session.exportStructure()).pipe(
        tap(smiles => {
          this.zone.run(() => {
            if (kind === 'explicit') {
              this.exportSmiles.emit(smiles)
            } else {
              this.exportPolledSmiles.emit(smiles)
              this.molChange.emit(smiles)
            }
          })
        })
      )
    })
  }

  private async updateEditorStructure(smiles: string): Promise<void> {
    try {
      await this.session?.setStructure(smiles)
    } catch (error) {
      this.showError(error)
    }
  }

  private showError(error: unknown): void {
    const message = error instanceof ChemistryAdapterError
      ? error.message
      : 'L’editor molecolare non è disponibile.'
    this.zone.run(() => {
      this.editorError.set(message)
      this.editorState.set('unavailable')
    })
  }

  private mutationObserver?: MutationObserver
  private mobileKeyboardGuardDoc?: Document
  private mobileKeyboardGuardFocusInHandler?: (event: Event) => void
  private loadedTimeoutId?: ReturnType<typeof setTimeout>

  private teardownMobileKeyboardGuard(): void {
    if (this.mobileKeyboardGuardDoc && this.mobileKeyboardGuardFocusInHandler) {
      this.mobileKeyboardGuardDoc.removeEventListener('focusin', this.mobileKeyboardGuardFocusInHandler, true)
    }
    this.mutationObserver?.disconnect()
    this.mutationObserver = undefined
    this.mobileKeyboardGuardDoc = undefined
    this.mobileKeyboardGuardFocusInHandler = undefined
  }

  private installMobileKeyboardGuard(): void {
    this.teardownMobileKeyboardGuard()

    const doc = this.iframe?.contentDocument
    if (!doc || !window.matchMedia?.('(pointer: coarse)').matches) return

    const isTextControl = (element: Element): element is HTMLInputElement | HTMLTextAreaElement =>
      element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement

    const isProbablyKeyCatcher = (element: Element): boolean => {
      if (!isTextControl(element)) return false

      const style = doc.defaultView?.getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      const invisible = !style ||
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        style.opacity === '0' ||
        rect.width < 12 ||
        rect.height < 12
      const offscreen = rect.bottom < 0 || rect.top > this.viewportRuntime.height()
      const suspiciousClass = /clipboard|hotkey|shortcut|key|hidden|dummy/i.test(element.className?.toString() ?? '')
      const typeHidden = element instanceof HTMLInputElement && element.type === 'hidden'

      return invisible || offscreen || suspiciousClass || typeHidden
    }

    const patch = (root: ParentNode): void => {
      root.querySelectorAll('input,textarea').forEach(node => {
        if (!isTextControl(node) || !isProbablyKeyCatcher(node)) return
        node.setAttribute('inputmode', 'none')
        node.setAttribute('readonly', 'true')
        node.setAttribute('autocomplete', 'off')
        node.enterKeyHint = 'done'
        node.tabIndex = -1
        node.style.caretColor = 'transparent'
      })
    }

    patch(doc)
    const onFocusIn = (event: Event): void => {
      const target = event.target as Element | null
      if (target && isProbablyKeyCatcher(target)) (target as HTMLElement).blur()
    }

    doc.addEventListener('focusin', onFocusIn, true)
    this.mobileKeyboardGuardDoc = doc
    this.mobileKeyboardGuardFocusInHandler = onFocusIn
    this.mutationObserver = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach(node => {
          if (node instanceof HTMLElement) patch(node)
        })
      }
    })
    this.mutationObserver.observe(doc.documentElement, { childList: true, subtree: true })
  }
}
