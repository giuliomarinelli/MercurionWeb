import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MyMoleculesHeadingComponent } from '../../components/molecule-detail/my-molecules-heading/my-molecules-heading.component';
import { LinkModel } from '../../Models/link.model';
import { MoleculeCollectionDetailFacade } from './molecule-collection-detail.facade';
import { MoleculeCollectionDetailToolbarComponent } from './molecule-collection-detail-toolbar.component';
import { MoleculeCollectionDetailGridComponent } from './molecule-collection-detail-grid.component';
import { MoleculeCollectionDetailPaginationComponent } from './molecule-collection-detail-pagination.component';

@Component({
  selector: 'm-molecule-collection-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MoleculeCollectionDetailFacade],
  imports: [
    MyMoleculesHeadingComponent,
    MoleculeCollectionDetailToolbarComponent,
    MoleculeCollectionDetailGridComponent,
    MoleculeCollectionDetailPaginationComponent
  ],
  template: `
    <main class="max-w-5xl mx-auto p-0 xs:p-4 sm:p-6 md:p-8 space-y-12" role="main"
      [attr.aria-busy]="facade.loading()" aria-live="polite">
      <m-my-molecules-heading [breadcrumb]="breadcrumb" />

      @if (facade.error()) {
        <p role="alert">Impossibile caricare questa collezione.</p>
      } @else {
        <m-molecule-collection-detail-toolbar
          [collectionId]="facade.collectionId()" [name]="facade.collectionName()" [search]="facade.search()"
          (rename)="facade.renameCollection($event)" (duplicate)="facade.duplicateCollection()"
          (delete)="facade.deleteCollection()" (add)="facade.addToCollection()"
          (searchChange)="facade.setSearch($event)" (clear)="facade.clearSearch()" />

        <m-molecule-collection-detail-grid
          [items]="facade.items()" [collectionId]="facade.collectionId()"
          (delete)="facade.deleteItem($event)" (remove)="facade.removeItem($event)" />

        <div class="h-px w-full" aria-hidden="true"></div>
        <m-molecule-collection-detail-pagination
          [loading]="facade.loading()" [hasItems]="facade.items().length > 0"
          [empty]="facade.state() === 'empty'" [done]="facade.done()"
          (loadMore)="facade.loadMore()" />
      }
    </main>
  `
})
export class MoleculeCollectionDetailPageComponent {
  readonly facade = inject(MoleculeCollectionDetailFacade);
  readonly breadcrumb: LinkModel[] = [
    { label: 'Collezioni Molecolari', path: '/molecules/collections' }
  ];
}
