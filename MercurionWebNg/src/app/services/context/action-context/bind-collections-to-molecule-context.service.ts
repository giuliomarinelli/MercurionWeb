import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class BindCollectionsToMoleculeContextService {

  private _moleculeId = signal<string  | null>(null)
  readonly moleculeId = this._moleculeId.asReadonly()

  setMoleculeId(moleculeId: string): void {
    this._moleculeId.set(moleculeId)
  }

  clearMoleculeId(): void {
    this._moleculeId.set(null)
  }

}
