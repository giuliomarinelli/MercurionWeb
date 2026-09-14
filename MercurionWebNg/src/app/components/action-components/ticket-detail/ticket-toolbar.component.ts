import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TicketCapabilities } from './ticket-detail.facade';

@Component({
  selector: 'm-ticket-toolbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mr-auto flex items-center gap-2 pt-2 pb-1" aria-label="Azioni ticket">
      @if (capabilities().canClose) {
        <button type="button" class="px-3 py-1.5 rounded-md border text-xs font-semibold" [disabled]="pending()"
                (click)="closeTicket.emit()">Chiudi ticket</button>
      }
      @if (capabilities().canReopen) {
        <button type="button" class="px-3 py-1.5 rounded-md border text-xs font-semibold" [disabled]="pending()"
                (click)="reopenTicket.emit()">Riapri ticket</button>
      }
    </div>
  `,
})
export class TicketToolbarComponent {
  readonly capabilities = input.required<TicketCapabilities>();
  readonly pending = input(false);
  readonly closeTicket = output<void>();
  readonly reopenTicket = output<void>();
}
