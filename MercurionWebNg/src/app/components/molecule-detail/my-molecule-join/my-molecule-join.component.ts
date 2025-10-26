import { Component, Input, OnInit, computed, signal } from '@angular/core';
import { MoleculeCollection } from '../../../Models/graphql/molecule-collection/molecule-collection.types';
import { CollectionCardComponent } from '../collection-card/collection-card.component';
import { SkeletonCollectionCardComponent } from '../../common/skeleton-card-loader/skeleton-card-loader.component';

@Component({
  selector: 'app-my-molecule-join',
  imports: [CollectionCardComponent, SkeletonCollectionCardComponent],
  template: `
    @if (collections().length) {
      <div class="overflow-y-auto relative max-h-[224px] min-h-[112px] transition-[max-height] duration-300 ease-in-out border">
        @for (c of collections(); track c; let i = $index) {
          <app-collection-card [collection]="c" [i]="i" [hideActionButtons]="true" />
        }
      </div>
    } @else if (!loaded() && !notFound()) {
      @for (i of [0, 1]; track i) {
        <app-skeleton-collection-card [height]="'112px'" />
      }
    } @else if (notFound()) {
      <div class="flex items-center justify-center min-h-[112px] text-sm text-muted-foreground">
        Nessuna collezione.
      </div>
    }
  `
})
export class MyMoleculeJoinComponent implements OnInit {

  // Stato
  collections = signal<MoleculeCollection[]>([]);
  loaded = computed(() => this.collections().length > 0);
  notFound = signal<boolean>(false);

  @Input({ required: true })
  set joins(joins: { id: string; collection: MoleculeCollection }[] | null) {
    if (!joins) return;
    this.collections.set(joins.map(j => j.collection));
  }

  ngOnInit(): void {
    // Finestra di “loading” di 2s: se allo scadere non c’è nulla, mostra empty state
    setTimeout(() => {
      if (!this.loaded()) {
        this.notFound.set(true);
      }
    }, 2000);
  }
}
