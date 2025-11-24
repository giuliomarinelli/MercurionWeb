import { Injectable, signal } from '@angular/core';
import { SensitiveDataChangeInnerScope } from '../../../Models/action/action-overlay.models';

@Injectable({
  providedIn: 'root'
})
export class SensitiveDataChangeContextService {

  private _addedTick = signal<number>(0)
  readonly addedTick = this._addedTick.asReadonly()

  private _innerScope = signal<SensitiveDataChangeInnerScope>('')
  readonly innerScope = this._innerScope.asReadonly()

  setInnerScope(scope: Omit<SensitiveDataChangeInnerScope, ''>): void {
    this._innerScope.set(scope as SensitiveDataChangeInnerScope)
  }

  clearInnerScope(): void {
    this._innerScope.set('')
  }

  notifyAdded(): void {
    this._addedTick.update(x => x + 1)
  }

}
