import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AddMoleculesToCollectionContextService {

  private _collectionId = signal<string | null>(null)
  readonly collectionId = this._collectionId.asReadonly()

  private _redirectToCollectionPath = signal<boolean>(false)
  readonly redirectToCollectionPath = this._redirectToCollectionPath.asReadonly()

  private _importFromChembl = signal<boolean>(false)
  readonly importFromChembl = this._importFromChembl.asReadonly()

  setCollectionId(collectionId: string): void {
    this._collectionId.set(collectionId)
  }

  clearCollectionId(): void {
    this._collectionId.set(null)
  }

  setRedirectToCollectionPath(v: boolean) {
    this._redirectToCollectionPath.set(v)
  }

  setImportFromChembl(val: boolean): void {
    this._importFromChembl.set(val)
  }

}
