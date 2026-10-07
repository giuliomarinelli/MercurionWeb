import { ChangeDetectionStrategy, Component, effect, ElementRef, inject, OnDestroy, signal, viewChild } from '@angular/core';
import { MyMoleculesHeadingComponent } from '../../components/molecule-detail/my-molecules-heading/my-molecules-heading.component';
import { LinkModel } from '../../Models/link.model';
import { MoleculeCollectionDetailFacade } from './molecule-collection-detail.facade';
import { MoleculeCollectionDetailToolbarComponent } from './molecule-collection-detail-toolbar.component';
import { MoleculeCollectionDetailGridComponent } from './molecule-collection-detail-grid.component';
import { MoleculeCollectionDetailPaginationComponent } from './molecule-collection-detail-pagination.component';
import { ButtonComponent } from '../../components/common/button/button.component';
import { DialogShellComponent } from '../../components/common/dialog-shell/dialog-shell.component';
import { SkeletonComponent } from '../../components/common/skeleton/skeleton.component';
import { ScrollContextService } from '../../services/context/scroll-context.service';

@Component({
  selector: 'm-molecule-collection-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MoleculeCollectionDetailFacade],
  imports: [
    ButtonComponent, DialogShellComponent, SkeletonComponent,
    MyMoleculesHeadingComponent,
    MoleculeCollectionDetailToolbarComponent,
    MoleculeCollectionDetailGridComponent,
    MoleculeCollectionDetailPaginationComponent
  ],
  styleUrls: ['../molecule-list-page.css', './molecule-collection-detail.css'],
  template: `
    <main class="molecule-list-page" role="main">
      <m-my-molecules-heading class="block" [breadcrumb]="breadcrumb" [compact]="true" />
      @if (facade.error()) {
        <section class="m-list-error" role="alert"><p>Impossibile caricare questa collezione.</p>
          <m-button size="lg" variant="outline" (pressed)="facade.retryCollection()">Riprova</m-button>
        </section>
      } @else {
        @if (facade.collectionName()) {
          <m-molecule-collection-detail-toolbar
            [collectionId]="facade.collectionId()" [name]="facade.collectionName()" [search]="facade.search()"
            [busy]="facade.actionPending()" [pending]="facade.loading()" [renamePending]="facade.renamePending()" [renameError]="facade.renameError()"
            [renameRevision]="facade.renameRevision()"
            (rename)="facade.renameCollection($event)" (duplicate)="facade.duplicateCollection()"
            (delete)="ask('collection')" (add)="facade.addToCollection()"
            (searchChange)="facade.setSearch($event)" />
          <div class="m-list-context"><p role="status">{{ facade.items().length }} molecole visualizzate{{ facade.search() ? ' per la ricerca' : '' }}</p></div>
        } @else {
          <div aria-label="Caricamento collezione" aria-busy="true"><m-skeleton width="60%" height="40px" /></div>
        }
        @if (facade.items().length) {
          <m-molecule-collection-detail-grid [items]="facade.items()" [collectionId]="facade.collectionId()"
            (delete)="ask('delete', $event)" (remove)="ask('remove', $event)" />
        }
        <m-molecule-collection-detail-pagination
          [loading]="facade.loading()" [hasItems]="facade.items().length > 0" [search]="facade.search()"
          [empty]="facade.state() === 'empty'" [done]="facade.done()" [error]="facade.pageError()"
          (loadMore)="facade.loadMore()" (retry)="facade.retryPage()"
          (clear)="facade.clearSearch()" (add)="facade.addToCollection()" />
        <div #sentinel class="m-list-sentinel" aria-hidden="true"></div>
      }
    </main>
    <m-dialog-shell [open]="!!confirmation()" [mounted]="!!confirmation()"
      labelledBy="collection-confirm-title" describedBy="collection-confirm-description"
      [dismissalPolicy]="{ escape: !facade.actionPending(), backdrop: !facade.actionPending() }" (dismissed)="cancelConfirmation()">
      <section class="m-detail-confirm" [attr.aria-busy]="facade.actionPending()">
        <h2 id="collection-confirm-title">{{ confirmation()?.kind === 'remove' ? 'Rimuovi dalla collezione?' : 'Conferma eliminazione' }}</h2>
        <p><strong>{{ confirmation()?.name }}</strong></p>
        <p id="collection-confirm-description">
          @switch (confirmation()?.kind) {
            @case ('collection') { La collezione verrà eliminata. Verranno eliminate anche le molecole presenti soltanto in questa collezione. Questa operazione non può essere annullata. }
            @case ('remove') { La molecola verrà rimossa soltanto da questa collezione e resterà disponibile in Le mie molecole. }
            @case ('delete') { La molecola verrà eliminata anche dalle altre collezioni. Questa operazione non può essere annullata. }
          }
        </p>
        @if (facade.actionError()) { <p role="alert">{{ facade.actionError() }}</p> }
        <div class="m-detail-actions">
          <button type="button" cdkFocusInitial class="m-detail-cancel" [disabled]="facade.actionPending()" (click)="cancelConfirmation()">Annulla</button>
          <m-button size="lg" [variant]="confirmation()?.kind === 'remove' ? 'primary' : 'destructive'"
            [loading]="facade.actionPending()" (pressed)="confirm()">{{ confirmation()?.kind === 'remove' ? 'Rimuovi' : 'Elimina definitivamente' }}</m-button>
        </div>
      </section>
    </m-dialog-shell>
  `
})
export class MoleculeCollectionDetailPageComponent implements OnDestroy {

  readonly facade = inject(MoleculeCollectionDetailFacade);
  readonly confirmation = signal<{ kind: 'collection' | 'delete' | 'remove'; id: string; name: string } | null>(null);

  ask(kind: 'collection' | 'delete' | 'remove', id = this.facade.collectionId()): void {
    if (this.facade.actionPending() || this.facade.renamePending()) return;
    this.facade.actionError.set('');
    this.confirmation.set({ kind, id, name: kind === 'collection' ? this.facade.collectionName() : this.facade.items().find(item => item.id === id)?.name ?? 'Molecola' });
  }
  cancelConfirmation(): void {
    if (!this.facade.actionPending()) this.confirmation.set(null);
  }
  async confirm(): Promise<void> {
    const confirmation = this.confirmation();
    if (!confirmation || this.facade.actionPending()) return;
    const ok = confirmation.kind === 'collection' ? await this.facade.deleteCollection()
      : confirmation.kind === 'remove' ? await this.facade.removeItem(confirmation.id)
      : await this.facade.deleteItem(confirmation.id);
    if (ok) this.confirmation.set(null);
  }
  private readonly scrollContext = inject(ScrollContextService);
  private readonly sentinel = viewChild<ElementRef<HTMLDivElement>>('sentinel');
  private observer?: IntersectionObserver;
  readonly breadcrumb: LinkModel[] = [
    { label: 'Collezioni Molecolari', path: '/molecules/collections' }
  ];

  constructor() {
    effect(() => { this.facade.collectionId(); this.confirmation.set(null); });
    effect(() => {
      const sentinel = this.sentinel()?.nativeElement;
      const canLoad = !!this.facade.collectionId() && !this.facade.loading() &&
        !this.facade.done() && !this.facade.error() && !this.facade.pageError();
      const root = this.scrollContext.intersectionRoot();
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
