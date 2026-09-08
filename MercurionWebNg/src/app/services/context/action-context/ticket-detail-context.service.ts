import { Injectable, computed, inject } from '@angular/core';
import { ActionOverlayContextService } from './action-overlay-context.service';

/**
 * Read-only view over the active `TicketDetail` session input.
 */
@Injectable({
  providedIn: 'root'
})
export class TicketDetailContextService {

  private readonly overlay = inject(ActionOverlayContextService)

  readonly ticketId = computed<string>(() =>
    this.overlay.session('TicketDetail')?.input.ticketId ?? ''
  )

  readonly innerScope = computed(() =>
    this.overlay.session('TicketDetail')?.input.innerScope ?? 'User'
  )

}
