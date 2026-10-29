import { afterNextRender, ChangeDetectionStrategy, Component, ElementRef, inject, Injector, input, OnChanges, output } from '@angular/core'
import { TicketCapabilities } from './ticket-detail.facade'
import { ButtonComponent } from '../../common/button/button.component'

@Component({
  selector: 'm-ticket-toolbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent],
  template: `
    <div class="flex flex-wrap items-center gap-2" aria-label="Azioni ticket">
      @if (capabilities().canClose) {
        <m-button variant="outline" [disabled]="disabled()" [loading]="pending()"
          (pressed)="requestClose()">Chiudi ticket</m-button>
      }
      @if (capabilities().canReopen) {
        <m-button variant="outline" [disabled]="disabled()" [loading]="pending()"
          (pressed)="requestReopen()">Riapri ticket</m-button>
      }
    </div>
  `,
})
export class TicketToolbarComponent implements OnChanges {
  readonly capabilities = input.required<TicketCapabilities>()
  readonly pending = input(false)
  readonly disabled = input(false)
  readonly closeTicket = output<void>()
  readonly reopenTicket = output<void>()
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef)
  private readonly injector = inject(Injector)
  private restoreRequested = false

  ngOnChanges(): void {
    this.restoreCommandFocus()
  }

  requestClose(): void {
    this.restoreRequested = true
    this.closeTicket.emit()
    this.restoreCommandFocus()
  }

  requestReopen(): void {
    this.restoreRequested = true
    this.reopenTicket.emit()
    this.restoreCommandFocus()
  }

  private restoreCommandFocus(): void {
    if (!this.restoreRequested) return
    afterNextRender(() => {
      if (!this.restoreRequested || this.pending()) return
      const button = this.element.nativeElement.querySelector<HTMLButtonElement>('button:not(:disabled)')
      // A user closing their ticket has no replacement toolbar action.
      const target = button ?? this.element.nativeElement.closest('m-ticket-detail')
        ?.querySelector<HTMLButtonElement>('[aria-label="Chiudi dettaglio ticket"]')
      target?.focus({ preventScroll: true })
      this.restoreRequested = false
    }, { injector: this.injector })
  }
}
