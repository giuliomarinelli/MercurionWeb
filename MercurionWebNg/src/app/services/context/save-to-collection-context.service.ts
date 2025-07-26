import { Injectable, signal, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CollectionSaveOverlayContextService {

  isOpened = signal<boolean>(false)
  private _isMounted = signal<boolean>(false)
  private _isVisible = signal<boolean>(false)
  private _smiles = signal<string>('')

  readonly isVisible = this._isVisible.asReadonly()
  readonly isMounted =  this._isMounted.asReadonly()
  readonly smiles =  this._smiles.asReadonly()



  // Stato selezione combo
  selectedCollectionId = signal<string | null>(null)
  searchTerm = signal('')
  page = signal(1)

  setSmiles(smiles?: string): void {
    this._smiles.set(smiles ?? '')
  }

  reset() {
    this.selectedCollectionId.set(null)
    this.searchTerm.set('')
    this.page.set(1)
  }

  constructor() {
    effect(() => {
      if (this.isOpened()) {
        this._isMounted.set(true)
        setTimeout(() => this._isVisible.set(true), 10)
      } else {
        this._isVisible.set(false)
        setTimeout(() => this._isMounted.set(false), 300)
      }
    })
  }

  open() {
    this.reset()
    this.isOpened.set(true)
  }

  close() {
    this.isOpened.set(false)
  }
}
