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

type ActionLoadState = 'idle' | 'loading' | 'loaded' | 'failed'

@Component({
  selector: 'm-action-overlay',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogShellComponent],
  template: `
    @if (ctx.isMounted() && ctx.scope()) {
      <m-dialog-shell
        [mounted]="ctx.isMounted()"
        [open]="ctx.isVisible()"
        [label]="dialogLabel()"
        backdropClass="bg-slate-300/75 dark:bg-slate-900/90 action-overlay-backdrop"
        [dismissalPolicy]="dismissalPolicy"
        (dismissed)="ctx.close()">
        <ng-container #actionHost />

        @if (loadState() === 'loading') {
          <div class="p-6 text-center" role="status" aria-live="polite">
            Caricamento azione in corso…
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
  protected readonly actionHost = viewChild<ViewContainerRef>('actionHost')
  protected readonly loadState = signal<ActionLoadState>('idle')
  protected readonly loadError = signal<unknown>(null)

  protected readonly dialogLabel = computed(() => {
    const scope = this.ctx.scope()
    return scope ? ACTION_REGISTRY[scope].label : 'Pannello azioni'
  })

  protected readonly dismissalPolicy: DialogDismissalPolicy = { escape: true, backdrop: true }

  constructor() {
    effect(() => {
      const state = this.ctx.state()
      const host = this.actionHost()

      if (!host) return
      if (state.phase === 'closed' || state.phase === 'settling') return

      const scope = state.scope as ActiveActionScope
      const generation = state.generation
      const definition = ACTION_REGISTRY[scope]
      let cancelled = false

      host.clear()
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

      return () => {
        cancelled = true
      }
    })
  }
}
