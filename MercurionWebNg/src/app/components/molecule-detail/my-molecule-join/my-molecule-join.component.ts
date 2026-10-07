import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { MoleculeCollection } from '../../../Models/graphql/molecule-collection/molecule-collection.types';
import { CollectionCardComponent } from '../collection-card/collection-card.component';
import { SkeletonCollectionCardComponent } from '../../common/skeleton-card-loader/skeleton-card-loader.component';

@Component({
  selector: 'm-my-molecule-join',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CollectionCardComponent, SkeletonCollectionCardComponent],
  host: { class: 'block min-w-0' },
  template: `
    @if (joins() === null) {
      <div class="grid gap-3" role="status" aria-label="Caricamento collezioni associate" aria-busy="true">
        @for (i of [0, 1]; track i) { <m-skeleton-collection-card [isReadonly]="true" /> }
      </div>
    } @else if (collections().length) {
      <p class="mb-3 text-left text-sm text-light-on-surface-secondary dark:text-dark-on-surface-secondary">
        {{ collections().length }} {{ collections().length === 1 ? 'collezione' : 'collezioni' }}
      </p>
      <div class="grid gap-3 overflow-y-auto max-h-none sm:max-h-96 m-scroll-thin" style="scrollbar-gutter: stable"
        role="list" aria-label="Collezioni associate" tabindex="0">
        @for (c of collections(); track c.id; let i = $index) {
          <div role="listitem"><m-collection-card [collection]="c" [i]="i" [hideActionButtons]="true" /></div>
        }
      </div>
    } @else {
      <p class="rounded-xl border border-token-border p-4 text-left text-sm text-light-on-surface-secondary dark:text-dark-on-surface-secondary">
        Questa molecola non appartiene ancora a una collezione. Usa “Aggiungi alle collezioni” per organizzarla.
      </p>
    }
  `
})
export class MyMoleculeJoinComponent {
  readonly joins = input.required<{ id: string; collection: MoleculeCollection }[] | null>();
  readonly collections = computed(() => (this.joins() ?? []).map(join => join.collection));
}
