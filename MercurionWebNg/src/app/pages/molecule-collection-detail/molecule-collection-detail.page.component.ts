import { ChangeDetectionStrategy, Component, effect, ElementRef, inject, OnDestroy, viewChild } from '@angular/core';
import { MyMoleculesHeadingComponent } from '../../components/molecule-detail/my-molecules-heading/my-molecules-heading.component';
import { LinkModel } from '../../Models/link.model';
import { MoleculeCollectionDetailFacade } from './molecule-collection-detail.facade';
import { MoleculeCollectionDetailToolbarComponent } from './molecule-collection-detail-toolbar.component';
import { MoleculeCollectionDetailGridComponent } from './molecule-collection-detail-grid.component';
import { MoleculeCollectionDetailPaginationComponent } from './molecule-collection-detail-pagination.component';
import { ScrollContextService } from '../../services/context/scroll-context.service';

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

        <div #sentinel class="h-px w-full" aria-hidden="true"></div>
        <m-molecule-collection-detail-pagination
          [loading]="facade.loading()" [hasItems]="facade.items().length > 0"
          [empty]="facade.state() === 'empty'" [done]="facade.done()"
          [error]="facade.pageError()"
          (loadMore)="facade.loadMore()" (retry)="facade.retryPage()" />
      }
    </main>
  `
})
export class MoleculeCollectionDetailPageComponent implements OnDestroy {
  readonly facade = inject(MoleculeCollectionDetailFacade);
  private readonly scrollContext = inject(ScrollContextService);
  private readonly sentinel = viewChild<ElementRef<HTMLDivElement>>('sentinel');
  private observer?: IntersectionObserver;
  readonly breadcrumb: LinkModel[] = [
    { label: 'Collezioni Molecolari', path: '/molecules/collections' }
  ];

  constructor() {
    effect(() => {
      const sentinel = this.sentinel()?.nativeElement;
      const canLoad = !!this.facade.collectionId() && !this.facade.loading() &&
        !this.facade.done() && !this.facade.error() && !this.facade.pageError();
      const root = this.scrollContext.scrollRootRef()?.nativeElement ?? null;
      this.observer?.disconnect();
      if (!sentinel || !canLoad) return;
      this.observer = new IntersectionObserver(entries => {
        if (entries[0]?.isIntersecting) void this.facade.loadMore();
      }, { root, rootMargin: '0px 0px 500px 0px' });
      this.observer.observe(sentinel);
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
