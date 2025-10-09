import { Component, Input, signal } from '@angular/core';
import { MoleculeCollection } from '../../../Models/graphql/molecule-collection/molecule-collection.types';

@Component({
  selector: 'app-collection-card',
  imports: [],
  template: `



  `
})
export class CollectionCardComponent {

  _collection = signal<MoleculeCollection | undefined>(undefined)

  @Input({required: true})
  set collection(collection: MoleculeCollection) {
    this._collection.set(collection)
  }



}
