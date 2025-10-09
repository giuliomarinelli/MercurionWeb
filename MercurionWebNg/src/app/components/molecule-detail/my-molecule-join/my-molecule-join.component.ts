import { Component, Input, signal } from '@angular/core';
import { MoleculeCollection } from '../../../Models/graphql/molecule-collection/molecule-collection.types';
import { CollectionCardComponent } from '../collection-card/collection-card.component';

@Component({
  selector: 'app-my-molecule-join',
  imports: [CollectionCardComponent],
  template: `

    @if (collections().length) {
      <div class="overflow-y-auto border-px relative max-h-[224px] min-h-[112px] transition-[max-height] duration-300 ease-in-out">
        @for (c of collections(); track c; let i = $index) {
          <app-collection-card [collection]="c" [i]="i" />
        }
      </div>
    }

  `
})
export class MyMoleculeJoinComponent {

  collections = signal<MoleculeCollection[]>([])


  @Input({ required: true })
  set joins(joins: { id: string; collection: MoleculeCollection }[] | null) {
    if (!joins) {
      return
    }
    this.collections.set(joins.map(j => j.collection))
  }



}
