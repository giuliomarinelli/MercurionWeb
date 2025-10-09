import { Component, Input, signal } from '@angular/core';
import { MoleculeCollection } from '../../../Models/graphql/molecule-collection/molecule-collection.types';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-collection-card',
  imports: [RouterLink],
  template: `

    @if (_collection()) {
      <a class="inline-block " [routerLink]="pathToCollection()">
        <div class="grid grid-cols-12 gap-4">
          <div class="col-span-8 bg-blue-200 p-4">
            {{_collection()!.name}}
          </div>
          <div class="col-span-4 bg-blue-400 p-4">
            Colonna destra (4/12)
          </div>
        </div>
      </a>
    }

  `
})
export class CollectionCardComponent {

  _collection = signal<MoleculeCollection | undefined>(undefined)
  _i = signal<number>(0)
  pathToCollection = signal<string>('')

  @Input({ required: true })
  set collection(collection: MoleculeCollection) {
    this._collection.set(collection)
    this.pathToCollection.set(`/molecules/collections/detail/${collection.id}`)
  }

  @Input()
  set i(i: number) {
    this._i.set(i)
  }



}
