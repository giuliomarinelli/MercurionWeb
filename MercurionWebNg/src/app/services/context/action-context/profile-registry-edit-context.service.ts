import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ProfileRegistryEditContextService {

  private _addedTick = signal<number>(0)
  readonly addedTick = this._addedTick.asReadonly()

  notifyAdded(): void {
    this._addedTick.update(x => x + 1)
  }

}
