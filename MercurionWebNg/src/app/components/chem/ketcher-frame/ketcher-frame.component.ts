import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  Output,
  signal,
  ViewChild
} from '@angular/core'
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
  ChemistryEditorSession
} from '../../../chemistry/chemistry-adapter.models'
import { ChemistryEditorService } from '../../../chemistry/chemistry-editor.service'
import { PublicPipe } from '../../../pipes/public.pipe'

@Component({
  selector: 'm-ketcher-frame',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative w-full" role="region" aria-label="Editor molecolare">
      @if (showIframe()) {
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
          @if (ketcherUrl()) {
            <iframe
              #ketcherIframe
              [src]="ketcherUrl()"
              class="w-full lg:px-8 h-[70vh] min-h-[320px] max-h-[540px] sm:h-[500px] border-none max-w-[1380px] mx-auto"
              title="Editor molecolare"
              [attr.aria-busy]="editorState() === 'loading'"
            ></iframe>
          }

          @if (editorState() === 'loading') {
            <div
              class="absolute inset-0 lg:inset-x-8 h-[70vh] min-h-[320px] max-h-[540px] sm:h-[500px] max-w-[1380px] mx-auto bg-gray-300 dark:bg-neutral-700 animate-pulse pointer-events-none"
              role="status"
              aria-live="polite"
              aria-label="Caricamento editor in corso"
            ></div>
          }
        }
      } @else {
        <div class="flex flex-col gap-9">
          <p class="font-semibold text-lg text-center mb-2" role="status" aria-live="polite">
            Ruota il telefono in orizzontale per usare l'editor molecolare
          </p>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 640 640"
            class="fill-current text-light-on-surface-main dark:text-slate-100 w-24 h-24 mx-auto"
          >
            <path
              d="M561.4 65.8C552.4 62.1 542.1 64.1 535.2 71L483.4 122.8C382.8 39.3 233.3 44.7 139.1 139C39.1 239 39.1 401 139.1 501C239.1 601 401.2 601 501.1 501C516 486.1 528.7 469.8 539.2 452.5C546.1 441.2 542.4 426.4 531.1 419.5C519.8 412.6 505 416.3 498.1 427.6C489.6 441.6 479.3 454.9 467.1 467C385.9 548.2 254.2 548.2 172.9 467C91.6 385.8 91.7 254.1 172.9 172.8C248.4 97.3 367.5 92 449.1 156.8L399.1 207C392.2 213.9 390.2 224.2 393.9 233.2C397.6 242.2 406.4 248 416.1 248L552.2 248C565.5 248 576.2 237.3 576.2 224L576.2 88C576.2 78.3 570.4 69.5 561.4 65.8zM528.2 145.9L528.2 200L474.1 200L528.2 145.9z"
            />
          </svg>
        </div>
      }

      @if (showIframe() && editorState() !== 'unavailable') {
        <ng-content></ng-content>
      }
    </div>
  `
})
export class KetcherFrameComponent implements OnInit, OnDestroy {
  readonly ketcherUrl = signal<SafeResourceUrl | null>(null)
  readonly showIframe = signal(true)
  readonly editorState = signal<'loading' | 'ready' | 'unavailable'>('loading')
  readonly editorError = signal('L’editor molecolare non è disponibile.')

  private initialSmiles = ''
  private readonly destroy$ = new Subject<void>()
  private readonly exporting = signal(false)
  private readonly structureValue = signal('')
  private readonly triggerResetSignal = signal(false)
  private readonly triggerGetSmilesSignal = signal(false)
  private session?: ChemistryEditorSession
  private iframe?: HTMLIFrameElement
  private unsubscribeState?: () => void
  private exportSubscription?: Subscription
  private pollSubscription?: Subscription
  private sessionGeneration = 0
  private destroyed = false

  @Input() mode: ChemistryEditorMode = 'create'

  @Input()
  set smiles(smiles: string | undefined) {
    const nextSmiles = smiles ?? ''
    this.structureValue.set(nextSmiles)
    this.initialSmiles = nextSmiles
    if (this.editorState() === 'ready') void this.updateEditorStructure(nextSmiles)
  }

  @Input()
  set triggerReset(trigger: boolean) {
    this.triggerResetSignal.set(trigger)
  }

  @Input()
  set triggerGetSmiles(trigger: boolean) {
    this.triggerGetSmilesSignal.set(trigger)
  }

  @Output() molChange = new EventEmitter<string>()
  @Output() exportSmiles = new EventEmitter<string>()
  @Output() exportPolledSmiles = new EventEmitter<string>()
  @Output() onReset = new EventEmitter<void>()

  @ViewChild('ketcherIframe')
  set iframeRef(ref: ElementRef<HTMLIFrameElement> | undefined) {
    this.iframe = ref?.nativeElement
    if (this.iframe) this.session?.attach(this.iframe)
  }

  constructor(
    private readonly publicPipe: PublicPipe,
    private readonly sanitizer: DomSanitizer,
    private readonly editor: ChemistryEditorService,
    private readonly zone: NgZone
  ) {
    effect(() => {
      if (this.triggerResetSignal()) {
        this.triggerResetSignal.set(false)
        this.resetMolecule()
        this.zone.run(() => this.onReset.emit())
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

    this.viewportListener = () => this.zone.run(() => this.updateViewportFlags())
  }

  ngOnInit(): void {
    this.updateViewportFlags()
    window.addEventListener('resize', this.viewportListener)
    window.addEventListener('orientationchange', this.viewportListener)
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
    window.removeEventListener('resize', this.viewportListener)
    window.removeEventListener('orientationchange', this.viewportListener)
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

  private viewportListener: () => void = () => undefined

  private async startSession(): Promise<void> {
    const generation = ++this.sessionGeneration
    this.disposeSession()
    this.ketcherUrl.set(null)
    this.editorState.set('loading')

    try {
      const resourceUrl = this.publicPipe.transform('ketcher/index.html')
      const session = await this.editor.createSession(resourceUrl)

      if (this.destroyed || generation !== this.sessionGeneration) {
        session.dispose()
        return
      }

      this.session = session
      this.unsubscribeState = session.onStateChange(state => {
        this.zone.run(() => {
          this.editorState.set(state.status)
          if (state.error) this.editorError.set(state.error.message)
          if (state.status === 'ready') {
            void this.updateEditorStructure(this.structureValue())
            this.loadedTimeoutId = setTimeout(() => this.installMobileKeyboardGuard(), 50)
          }
        })
      })
      this.ketcherUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(session.resourceUrl))
      if (this.iframe) session.attach(this.iframe)
    } catch (error) {
      if (generation === this.sessionGeneration) this.showError(error)
    }
  }

  private disposeSession(): void {
    this.unsubscribeState?.()
    this.unsubscribeState = undefined
    this.session?.dispose()
    this.session = undefined
    this.iframe = undefined
  }

  private updateViewportFlags(): void {
    const width = window.innerWidth || 0
    const height = window.innerHeight || 0
    const landscape = height > 0 ? width >= height : false
    const roomy = width >= 600 || (width >= 480 && height >= 360)
    this.showIframe.set(landscape || roomy)
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
      const offscreen = rect.bottom < 0 || rect.top > (doc.defaultView?.innerHeight ?? window.innerHeight)
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
