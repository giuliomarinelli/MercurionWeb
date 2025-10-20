import { inject, Injectable, signal } from '@angular/core';
import { HistoryDTO } from '../../Models/history.models';
import { HistoryService } from '../history.service';
import { map, Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HistoryContextService {

  private readonly historyService = inject(HistoryService)

  private _newHistoryItem = signal<HistoryDTO | null>(null)
  private _removeItemTriggerSignal = signal<string | null>(null)

  readonly newHistoryItem = this._newHistoryItem.asReadonly()
  readonly removeItemTriggerSignal = this._removeItemTriggerSignal.asReadonly()

  clearNewHistoryItem(): void {
    this._newHistoryItem.set(null)
  }

  clearRemoveItemTriggerSignal(): void {
    this._removeItemTriggerSignal.set(null)
  }

  pollNewItem(): Observable<HistoryDTO> {
    return this.historyService.getHistory(1, 1).pipe(
      map(page => page.items[0]),
      tap(item => this._newHistoryItem.set(item))
    )
  }

  triggerRemoveItemFromHistoryView(itemId: string): void {
    this._removeItemTriggerSignal.set(itemId)
  }

}
