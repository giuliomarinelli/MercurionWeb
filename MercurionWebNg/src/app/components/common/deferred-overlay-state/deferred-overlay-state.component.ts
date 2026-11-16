import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'
import { ButtonComponent } from '../button/button.component'
import { ProgressIndicatorComponent } from '../progress-indicator/progress-indicator.component'

let nextHeadingId = 0

/** Non-modal feedback until the actual dialog implementation can take over. */
@Component({
  selector: 'm-deferred-overlay-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, ProgressIndicatorComponent],
  host: { '(document:keydown.escape)': 'onEscape($event)' },
  template: `
    @if (open()) {
      <section class="fixed inset-x-3 bottom-3 z-[60] mx-auto flex max-h-[calc(100dvh-1.5rem)] w-auto max-w-xl flex-col gap-4 overflow-y-auto rounded-token-surface border border-token-border bg-surface-elevated p-4 text-on-surface-main shadow-xl sm:bottom-6 sm:p-5"
        [attr.aria-labelledby]="headingId">
        <h2 [id]="headingId" class="text-base font-semibold">{{ label() }}</h2>
        @if (failed()) {
          <p role="alert" class="text-sm">Non è stato possibile caricare il pannello. Ricarica la pagina per riprovare.</p>
        } @else {
          <div class="flex justify-center"><m-progress-indicator label="Caricamento pannello…" /></div>
        }
        <div class="flex flex-wrap justify-end gap-3">
          <m-button variant="outline" ariaLabel="Chiudi pannello" (pressed)="closed.emit()">{{ failed() ? 'Chiudi' : 'Annulla' }}</m-button>
          @if (failed()) {
            <m-button (pressed)="reloadRequested.emit()">Ricarica pagina</m-button>
          }
        </div>
      </section>
    }
  `,
})
export class DeferredOverlayStateComponent {
  readonly label = input.required<string>()
  readonly open = input(true)
  readonly failed = input(false)
  readonly closed = output<void>()
  readonly reloadRequested = output<void>()
  protected readonly headingId = `m-deferred-overlay-${++nextHeadingId}`

  protected onEscape(event: Event): void {
    if (!this.open()) return
    event.stopPropagation()
    this.closed.emit()
  }
}
