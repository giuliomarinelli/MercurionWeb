import { Injectable, signal } from '@angular/core';
import { ItemSelection } from '../Models/selection.model';

@Injectable({
  providedIn: 'root'
})
export class SelectionService {

  _headerSelections = signal<ItemSelection[]>([])
  readonly headerSelections = this._headerSelections.asReadonly()

  setHeaderSelections(a: ItemSelection[]): void {
    this._headerSelections.set(a)
  }

  clearHeaderSelections(): void {
    this._headerSelections.set([])
  }

  generateHeaderSelection(name: string, isSelected = false): ItemSelection {
    return {
      name,
      isSelected
    }
  }

  getActiveHeaderSelection(name: string): boolean {
    const s = this.headerSelections().find((s) => s.name === name && s.isSelected)
    return s?.isSelected ?? false
  }

}
