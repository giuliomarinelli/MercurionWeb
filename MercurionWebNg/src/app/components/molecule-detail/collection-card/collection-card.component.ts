import { Component, Input, signal } from '@angular/core';
import { MoleculeCollection } from '../../../Models/graphql/molecule-collection/molecule-collection.types';

@Component({
  selector: 'app-collection-card',
  imports: [],
  template: `

    @if (_collection()) {
      <div class="grid grid-cols-12 gap-4">
        <div class="col-span-8 bg-blue-200 p-4">
          Colonna sinistra (8/12)
        </div>
        <div class="col-span-4 bg-blue-400 p-4">
          Colonna destra (4/12)
        </div>
      </div>
    }

  `
})
export class CollectionCardComponent {

  _collection = signal<MoleculeCollection | undefined>(undefined)
  pathToCollection = signal<string>('')

  @Input({ required: true })
  set collection(collection: MoleculeCollection) {
    this._collection.set(collection)
    this.pathToCollection.set(`/molecules/collections/detail/${collection.id}`)
  }



}
