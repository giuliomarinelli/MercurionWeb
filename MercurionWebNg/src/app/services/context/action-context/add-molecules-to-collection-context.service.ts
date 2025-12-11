import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AddMoleculesToCollectionContextService {

  private _collectionId = signal<string | null>(null)
  private _addedTick = signal<number>(0)

  readonly collectionId = this._collectionId.asReadonly()
  readonly addedTick = this._addedTick.asReadonly()

  _redirectToCollectionPath = signal<boolean>(false)
  readonly redirectToCollectionPath = this._redirectToCollectionPath.asReadonly()

  setCollectionId(collectionId: string): void {
    this._collectionId.set(collectionId)
  }

  clearCollectionId(): void {
    this._collectionId.set(null)
  }

  notifyAdded(): void {
    this._addedTick.update(x => x + 1)
  }

  setRedirectToCollectionPath(v: boolean) {
    this._redirectToCollectionPath.set(v)
  }

}
