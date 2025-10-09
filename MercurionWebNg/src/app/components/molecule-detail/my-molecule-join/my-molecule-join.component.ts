import { Component, computed, Input, signal } from '@angular/core';
import { MoleculeCollection } from '../../../Models/graphql/molecule-collection/molecule-collection.types';
import { CollectionCardComponent } from '../collection-card/collection-card.component';
import { SkeletonCollectionCardComponent } from '../../common/skeleton-card-loader/skeleton-card-loader.component';

@Component({
  selector: 'app-my-molecule-join',
  imports: [CollectionCardComponent, SkeletonCollectionCardComponent],
  template: `

    @if (collections().length) {
      <div class="overflow-y-auto border-px relative max-h-[224px] min-h-[112px] transition-[max-height] duration-300 ease-in-out">
        @for (c of collections(); track c; let i = $index) {
          <app-collection-card [collection]="c" [i]="i" />
        }
      </div>
    } @else if (!loaded()) {
        @for (i of [0, 1]; track i) {
          <app-skeleton-collection-card [height]="'112px'" />
        }
    }

  `
})
export class MyMoleculeJoinComponent {

  collections = signal<MoleculeCollection[]>([])
  loaded = computed(() => !!this.collections().length)

  @Input({ required: true })
  set joins(joins: { id: string; collection: MoleculeCollection }[] | null) {
    if (!joins) {
      return
    }
    this.collections.set(joins.map(j => j.collection))
  }





}
