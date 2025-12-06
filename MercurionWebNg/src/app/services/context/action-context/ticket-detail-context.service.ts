import { Injectable, signal } from '@angular/core';
import { TicketDetailInnerScope } from '../../../Models/action/action-overlay.models';

@Injectable({
  providedIn: 'root'
})
export class TicketDetailContextService {

  private _ticketId = signal<string>('')
  readonly ticketId = this._ticketId.asReadonly()

  private _addedTick = signal<number>(0)
  readonly addedTick = this._addedTick.asReadonly()

  private _innerScope = signal<TicketDetailInnerScope>('User')
  readonly innerScope = this._innerScope.asReadonly()

  setTicketId(ticketId: string): void {
    if (!ticketId) {
      return
    }
    this._ticketId.set(ticketId)
  }

  clearTicketId(): void {
    this._ticketId.set('')
  }

  setInnerScope(innerScope: TicketDetailInnerScope) {
    const prev = this._innerScope()
    console.log(
    '[TicketDetailContext] setInnerScope',
    prev, '→', innerScope,
    new Error().stack
  )
    this._innerScope.set(innerScope)
  }

  resetInnerScope(): void {
    this._innerScope.set('User')
  }

  notifyAdded(): void {
    this._addedTick.update((x) => x + 1)
  }

}
