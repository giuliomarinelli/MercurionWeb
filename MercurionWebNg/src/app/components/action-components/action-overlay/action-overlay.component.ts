import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
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

type ActionLoadState = 'idle' | 'loading' | 'loaded' | 'failed'

@Component({
  selector: 'm-action-overlay',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogShellComponent, ProgressIndicatorComponent],
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
        <ng-container #actionHost />

        @if (loadState() === 'loading' && !hasAction()) {
          <div class="p-6 text-center" role="status" aria-live="polite">
            <m-progress-indicator />
          </div>
        } @else if (loadState() === 'failed') {
          <div class="p-6 text-center" role="alert">
            <p class="font-semibold">Impossibile caricare questa azione.</p>
            <p class="mt-2 text-sm">Chiudi e riprova.</p>
            <button
              type="button"
              class="mt-4 rounded-lg px-4 py-2 font-semibold"
              (click)="ctx.close()">
              Chiudi
            </button>
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

  protected readonly dialogLabel = computed(() => {
    const scope = this.ctx.scope()
    return scope ? ACTION_REGISTRY[scope].label : 'Pannello azioni'
  })

  protected readonly dismissalPolicy = computed<DialogDismissalPolicy>(() => {
    const state = this.ctx.state()
    const submittingCollection = state.phase === 'submitting' &&
      ['CreateCollection', 'SelectCollectionThenRoute', 'BindCollectionsToMolecule', 'AddMoleculesToCollection', 'MoleculeCollectionItemSave'].includes(state.scope)
    return { escape: !submittingCollection, backdrop: !submittingCollection }
  })

  constructor() {
    effect((onCleanup) => {
      const request = this.actionRequest()
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
        host.createComponent(component)
        this.hasAction.set(true)
        this.loadState.set('loaded')
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
        this.loadError.set(error)
        this.loadState.set('failed')
      })

      onCleanup(() => {
        cancelled = true
      })
    })
  }
}
