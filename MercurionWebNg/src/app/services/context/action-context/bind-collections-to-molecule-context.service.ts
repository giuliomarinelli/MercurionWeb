import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class BindCollectionsToMoleculeContextService {

  private _moleculeId = signal<string | null>(null)
  private _addedTick = signal<number>(0)

  readonly moleculeId = this._moleculeId.asReadonly()
  readonly addedTick = this._addedTick.asReadonly()

  setMoleculeId(moleculeId: string): void {
    this._moleculeId.set(moleculeId)
  }

  clearMoleculeId(): void {
    this._moleculeId.set(null)
  }

  notifyAdded(): void {
    this._addedTick.update(x => x + 1)
  }

}
