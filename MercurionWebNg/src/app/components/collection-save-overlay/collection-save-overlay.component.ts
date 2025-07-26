import { MoleculeCollection, MoleculeCollectionItemJoinShort } from './../../Models/graphql/molecule-collection/molecule-collection.types';
import { Component, HostListener, OnInit, effect, inject, signal } from '@angular/core';
import { ComboSelectComponent } from '../common/combo-select/combo-select.component'
import { MoleculeCollectionService } from '../../services/graphql/molecule-collection.service';
import { CollectionSaveOverlayContextService } from '../../services/context/save-to-collection-context.service';
import { MoleculeCollectionItemService } from '../../services/graphql/molecule-collection-item.service';
import { MoleculeJoinService } from '../../services/graphql/molecule-collection-join.service';
import { ToastService } from '../../services/toast.service';
import { RDKitService } from '../../services/rd-kit-loader.service';

@Component({
  selector: 'app-collection-save-overlay',
  standalone: true,
  imports: [ComboSelectComponent],
  template: `
    @if (ctx.isMounted()) {
      <div class="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm transition-all duration-300"
           [class.opacity-0]="!ctx.isVisible()"
           [class.opacity-100]="ctx.isVisible()">
        <div class="flex justify-center items-center pt-40 px-4">
          <div class="w-full max-w-lg bg-white dark:bg-dark-surface-main rounded-xl shadow-lg p-6">
            <div class="flex items-center justify-between mb-3">
              <h2 class="text-lg font-semibold">Scegli la collezione di destinazione</h2>
              <button class="text-2xl hover:text-emerald-600" (click)="close()">&times;</button>
            </div>

            <app-combo-select
              [items]="collections()"
              [displayFn]="displayCollection"
              [valueFn]="valueCollection"
              [hasMore]="hasMore()"
              [canCreateNew]="true"
              [searchPlaceholder]="'Cerca collezione...'"
              [selected]="ctx.selectedCollectionId()"
              (searchChange)="onSearchChange($event)"
              (loadMore)="onScrollEnd()"
              (select)="onSelect($event)"
              (createNew)="onCreateNew($event)"
            />

            <div class="mt-6 flex justify-end gap-2">
              <button class="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300" (click)="close()">Annulla</button>
              <button
                class="px-4 py-2 rounded bg-emerald-600 text-white font-semibold shadow hover:bg-emerald-700 disabled:bg-emerald-300"
                [disabled]="!ctx.selectedCollectionId()"
                (click)="onConfirm()"
              >Salva</button>
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class CollectionSaveOverlayComponent implements OnInit {

  ctx = inject(CollectionSaveOverlayContextService);
  collectionService = inject(MoleculeCollectionService);
  moleculeJoinService = inject(MoleculeJoinService)
  toast = inject(ToastService)
  rdkitService = inject(RDKitService)

  collections = signal<MoleculeCollection[]>([]);
  hasMore = signal(true)
  loading = signal(false)

  ngOnInit() {
    this.loadCollections(true)
  }

  displayCollection(item: Pick<MoleculeCollection, 'name'>) {
    return item.name
  }

  valueCollection(item: Pick<MoleculeCollection, 'id'>) {
    return item.id
  }

  loadCollections(reset = false) {
    if (this.loading()) return;
    this.loading.set(true);
    const page = reset ? 1 : this.ctx.page();
    this.collectionService.getPaginatedCollections(page, 12, this.ctx.searchTerm()).subscribe(res => {
      if (reset) this.collections.set(res.items);
      else this.collections.set([...this.collections(), ...res.items]);
      this.hasMore.set(res.currentPage < res.totalPages);
      this.ctx.page.set(res.currentPage + 1);
      this.loading.set(false);
    });
  }

  onSearchChange(term: string) {
    this.ctx.searchTerm.set(term);
    this.ctx.page.set(1);
    this.loadCollections(true);
  }

  onScrollEnd() {
    if (this.hasMore() && !this.loading()) {
      this.loadCollections();
    }
  }

  onSelect(item: Pick<MoleculeCollection, 'id'>) {
    this.ctx.selectedCollectionId.set(item.id)
  }

  onCreateNew(name: string) {
    this.collectionService.createCollection(name).subscribe(newColl => {
      this.collections.set([newColl, ...this.collections()])
      this.ctx.selectedCollectionId.set(newColl.id)
    });
  }

  async onConfirm() {
    if (!this.ctx.selectedCollectionId()) {
      this.toast.trigger('Si è verificato un errore', 'error')
    }
    const propertiesJson = JSON.stringify(
      await this.rdkitService.getMoleculeProperties(this.ctx.smiles())
    )
    this.moleculeJoinService.addCustomMoleculeToCollection({
      collectionId: this.ctx.selectedCollectionId()!,
      input: {
        canonicalSmiles: this.ctx.smiles(),
        propertiesJson
      }
    }).subscribe({
      next: (res) => {
        this.toast.trigger(`Molecola salvata correttamente.`, 'success')
        this.ctx.close()
      },
      error: () => this.toast.trigger('Si è verificato un errore!', 'error')
    })
    this.ctx.close()
  }

  close() {
    this.ctx.close()
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.ctx.isOpened()) this.close()
  }
}
function selectedCollectionId(): string {
  throw new Error('Function not implemented.');
}

