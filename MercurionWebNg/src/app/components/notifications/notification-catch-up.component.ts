import { ChangeDetectionStrategy, Component, afterNextRender, input, output } from '@angular/core'
import { ButtonComponent } from '../common/button/button.component'

@Component({
  selector: 'm-notification-catch-up',
  imports: [ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside
      class="absolute right-0 top-full z-60 mt-3 w-72 max-w-[calc(100vw-6rem)] rounded-token-control border border-token-border/60 bg-surface-elevated p-4 text-sm text-on-surface-main shadow-lg"
      aria-label="Notifiche recuperate"
      (keydown.escape)="dismissed.emit(); $event.stopPropagation()"
    >
      <p
        class="font-semibold leading-relaxed [overflow-wrap:anywhere]"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {{ count() === 1 ? 'Hai una nuova notifica' : 'Hai ' + count() + ' nuove notifiche' }}
      </p>
      <p class="mt-1 text-xs leading-relaxed text-on-surface-secondary">
        Recuperate durante la sincronizzazione.
      </p>
      @if (acknowledgementFailed()) {
        <div class="mt-3 space-y-2" role="alert">
          <p class="text-xs leading-relaxed">
            Non è stato possibile aggiornare lo stato di visualizzazione.
          </p>
          <m-button size="sm" variant="outline" [disabled]="pending()" (pressed)="retried.emit()"
            >Riprova</m-button
          >
        </div>
      }
      <div class="mt-3 flex flex-wrap items-center gap-2">
        <m-button size="sm" variant="outline" (pressed)="opened.emit()">Visualizza</m-button>
        <m-button size="sm" variant="ghost" (pressed)="dismissed.emit()">Chiudi</m-button>
      </div>
    </aside>
  `,
})
export class NotificationCatchUpComponent {
  readonly count = input.required<number>()
  readonly acknowledgementFailed = input(false)
  readonly pending = input(false)
  readonly opened = output<void>()
  readonly dismissed = output<void>()
  readonly presented = output<void>()
  readonly retried = output<void>()

  constructor() {
    afterNextRender(() => this.presented.emit())
  }
}
