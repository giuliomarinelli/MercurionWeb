import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AddMoleculesToCollectionContextService {

  private _collectionId = signal<string | null>(null)

  readonly collectionId = this._collectionId.asReadonly()

  setCollectionId(collectionId: string): void {
    this._collectionId.set(collectionId)
  }

  clearCollectionId(): void {
    this._collectionId.set(null)
  }

}
