import { Injectable, computed, inject } from '@angular/core';
import { ActionOverlayContextService } from './action-overlay-context.service';
import { TicketDetailInnerScope } from '../../../Models/action/action-overlay.models';

/**
 * Read-only view over the active `NewTicket` session input.
 * This scope previously borrowed `TicketDetailContextService`'s inner scope
 * signal, which meant a stale `TicketDetail` value could leak into a fresh
 * `NewTicket` opening (and vice versa). It now owns its own typed session
 * input so the two scopes can never contaminate each other.
 */
@Injectable({
  providedIn: 'root'
})
export class NewTicketContextService {

  private readonly overlay = inject(ActionOverlayContextService)

  readonly innerScope = computed<TicketDetailInnerScope>(() =>
    this.overlay.session('NewTicket')?.input.innerScope ?? 'User'
  )

}
