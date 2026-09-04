import { Injectable, signal } from '@angular/core';
import { TicketDetailInnerScope } from '../../../Models/action/action-overlay.models';

@Injectable({
  providedIn: 'root'
})
export class TicketDetailContextService {

  private _ticketId = signal<string>('')
  readonly ticketId = this._ticketId.asReadonly()

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

  setInnerScope(innerScope: TicketDetailInnerScope): void {
    this._innerScope.set(innerScope)
  }

  resetInnerScope(): void {
    this._innerScope.set('User')
  }

}
