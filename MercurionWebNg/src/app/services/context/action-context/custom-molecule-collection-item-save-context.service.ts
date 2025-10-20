import { Injectable, signal } from '@angular/core';
import { KetcherFrameMode } from '../../../components/chem/ketcher-frame/ketcher-frame.component';

@Injectable({
  providedIn: 'root'
})
export class CustomMoleculeCollectionItemSaveContextService {

  private _mode = signal<KetcherFrameMode>('edit')
  private _smiles = signal<string>('')

  readonly mode = this._mode.asReadonly()
  readonly smiles = this._smiles.asReadonly()

  selectedCollectionId = signal<string | null>(null)
  searchTerm = signal('')
  page = signal(1)

  setSmiles(smiles?: string): void {
    this._smiles.set(smiles ?? '')
  }

  setMode(mode: KetcherFrameMode): void {
    this._mode.set(mode)
  }

  reset(): void {
    this.selectedCollectionId.set(null)
    this.searchTerm.set('')
    this.page.set(1)
  }


}
