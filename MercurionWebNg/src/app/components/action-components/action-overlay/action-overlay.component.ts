import {
  ChangeDetectionStrategy,
  afterNextRender,
  ElementRef,
  Component,
  computed,
  effect,
  inject,
  Injector,
  signal,
  viewChild,
  ViewContainerRef
} from '@angular/core'
import { ActionOverlayContextService } from '../../../services/context/action-context/action-overlay-context.service'
import { ActiveActionScope } from '../../../Models/action/action-overlay.models'
import { DialogShellComponent, DialogDismissalPolicy } from '../../common/dialog-shell/dialog-shell.component'
import { ACTION_REGISTRY } from './action-overlay.registry'
import { SmoothResizeState } from '../../common/smooth-resize/smooth-resize.directive'
import { ProgressIndicatorComponent } from '../../common/progress-indicator/progress-indicator.component'
import { ButtonComponent } from '../../common/button/button.component'

type ActionLoadState = 'idle' | 'loading' | 'loaded' | 'failed'

@Component({
  selector: 'm-action-overlay',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogShellComponent, ProgressIndicatorComponent, ButtonComponent],
  providers: [SmoothResizeState],
  template: `
    @if (ctx.isMounted() && ctx.scope()) {
      <m-dialog-shell
        [mounted]="ctx.isMounted()"
        [open]="ctx.isVisible()"
        [label]="dialogLabel()"
        backdropVariant="action"
        panelVariant="action"
        [dismissalPolicy]="dismissalPolicy()"
        (dismissed)="ctx.close()">
        <div class="relative w-full">
          <div [attr.inert]="loadState() === 'loading' && hasAction() ? '' : null" [attr.aria-busy]="loadState() === 'loading'">
            <ng-container #actionHost />
          </div>
          @if (loadState() === 'loading' && hasAction()) {
            <div data-action-feedback class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-token-surface bg-surface-main/95 p-6 text-on-surface-main">
              <m-progress-indicator label="Caricamento azione…" />
              <m-button variant="outline" (pressed)="ctx.close()">Annulla</m-button>
            </div>
          }
        </div>

        @if (loadState() === 'loading' && !hasAction()) {
          <div data-action-feedback class="mx-auto flex min-h-48 w-full max-w-xl flex-col items-center justify-center gap-4 rounded-token-surface border border-token-border bg-surface-elevated p-6 text-center text-on-surface-main">
            <m-progress-indicator label="Caricamento azione…" />
            <m-button variant="outline" (pressed)="ctx.close()">Annulla</m-button>
          </div>
        } @else if (loadState() === 'failed') {
          <div data-action-feedback class="mx-auto flex min-h-48 w-full max-w-xl flex-col items-center justify-center gap-4 rounded-token-surface border border-token-border bg-surface-elevated p-6 text-center text-on-surface-main">
            <p class="font-semibold" role="alert">Impossibile caricare questa azione.</p>
            <p class="text-sm">Puoi riprovare a caricare il pannello.</p>
            <div class="flex flex-wrap justify-center gap-3">
              <m-button variant="outline" (pressed)="ctx.close()">Chiudi</m-button>
              <m-button data-action-retry (pressed)="retryLoad()">Riprova caricamento</m-button>
            </div>
          </div>
        }
      </m-dialog-shell>
    }
  `
})
export class ActionOverlayComponent {
  protected readonly ctx = inject(ActionOverlayContextService)
  protected readonly actionHost = viewChild('actionHost', { read: ViewContainerRef })
  protected readonly loadState = signal<ActionLoadState>('idle')
  protected readonly hasAction = signal(false)
  protected readonly loadError = signal<unknown>(null)
  private readonly actionRequest = computed(() => {
    const state = this.ctx.state()
    if (state.phase === 'closed' || state.phase === 'closing' || state.phase === 'settling') return null
    return { scope: state.scope, generation: state.generation }
  }, { equal: (previous, current) => previous?.scope === current?.scope && previous?.generation === current?.generation })
  private readonly retryVersion = signal(0)
  private readonly injector = inject(Injector)
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef)

  protected readonly dialogLabel = computed(() => {
    const scope = this.ctx.scope()
    return scope ? ACTION_REGISTRY[scope].label : 'Pannello azioni'
  })

  protected readonly dismissalPolicy = computed<DialogDismissalPolicy>(() => {
    const state = this.ctx.state()
    const submittingCollection = state.phase === 'submitting' &&
      ['CreateCollection', 'SelectCollectionThenRoute', 'BindCollectionsToMolecule', 'AddMoleculesToCollection', 'MoleculeCollectionItemSave', 'NewTicket', 'TicketDetail'].includes(state.scope)
    return { escape: !submittingCollection, backdrop: !submittingCollection }
  })

  constructor() {
    effect((onCleanup) => {
      const request = this.actionRequest()
      this.retryVersion()
      const host = this.actionHost()

      if (!host) return
      if (!request) {
        this.hasAction.set(false)
        this.loadState.set('idle')
        return
      }

      const scope = request.scope as ActiveActionScope
      const generation = request.generation
      const definition = ACTION_REGISTRY[scope]
      let cancelled = false

      this.loadState.set('loading')
      this.focusFeedback(scope, generation, 'loading')
      this.loadError.set(null)

      definition.load().then((component) => {
        const current = this.ctx.state()
        if (
          cancelled ||
          current.phase === 'closed' ||
          current.phase === 'settling' ||
          current.generation !== generation ||
          current.scope !== scope
        ) return
        host.clear()
        const loaded = host.createComponent(component)
        this.hasAction.set(true)
        this.loadState.set('loaded')
        afterNextRender(() => {
          if (this.ctx.session(scope)?.id !== generation) return
          const element = loaded.location.nativeElement as HTMLElement
          const target = element.querySelector<HTMLElement>('[cdkFocusInitial], [autofocus]')
            ?? element.querySelector<HTMLElement>('button:not(:disabled), [href], input:not(:disabled), textarea:not(:disabled)')
          target?.focus({ preventScroll: true })
        }, { injector: this.injector })
      }).catch((error: unknown) => {
        const current = this.ctx.state()
        if (
          cancelled ||
          current.phase === 'closed' ||
          current.phase === 'settling' ||
          current.generation !== generation ||
          current.scope !== scope
        ) return
        host.clear()
        this.hasAction.set(false)
        this.loadError.set(error)
        this.loadState.set('failed')
        this.focusFeedback(scope, generation, 'failed')
      })

      onCleanup(() => {
        cancelled = true
      })
    })
  }

  protected retryLoad(): void {
    if (this.loadState() === 'failed' && this.actionRequest()) this.retryVersion.update(value => value + 1)
  }

  private focusFeedback(scope: ActiveActionScope, generation: number, state: ActionLoadState): void {
    afterNextRender(() => {
      if (this.ctx.session(scope)?.id !== generation || !this.ctx.isVisible() || this.loadState() !== state) return
      const host = this.element.nativeElement
      const target = host.querySelector<HTMLButtonElement>('[data-action-retry] button')
        ?? host.querySelector<HTMLButtonElement>('[data-action-feedback] button')
      target?.focus({ preventScroll: true })
    }, { injector: this.injector })
  }
}
