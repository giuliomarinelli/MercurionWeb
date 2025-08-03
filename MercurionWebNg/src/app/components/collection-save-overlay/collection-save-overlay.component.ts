import { Component, ElementRef, HostListener, OnInit, ViewChild, inject, signal } from '@angular/core';
import { ComboSelectComponent } from '../common/combo-select/combo-select.component'
import { MoleculeCollectionService } from '../../services/graphql/molecule-collection.service';
import { CollectionSaveOverlayContextService } from '../../services/context/save-to-collection-context.service';
import { MoleculeJoinService } from '../../services/graphql/molecule-collection-join.service';
import { ToastService } from '../../services/toast.service';
import { RDKitService } from '../../services/rd-kit-loader.service';
import { MoleculeCollection } from './../../Models/graphql/molecule-collection/molecule-collection.types';
import { MoleculeProperties } from '../../Models/graphql/molecule-properties.interface';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

export type SaveOverlayFormItem = 'name' | 'label' | 'notes'

@Component({
  selector: 'app-collection-save-overlay',
  standalone: true,
  imports: [ComboSelectComponent, NgClass, FormsModule],
  template: `

    @if (ctx.isMounted()) {
    <div
      class="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm transition-all duration-300"
      [class.opacity-0]="!ctx.isVisible()"
      [class.opacity-100]="ctx.isVisible()"
    >
      <div class="flex justify-center items-center min-h-screen px-2">
        <div
          class="w-full max-w-lg bg-white dark:bg-dark-surface-main rounded-xl shadow-lg py-6 px-3 max-h-[80vh] overflow-y-auto flex flex-col gap-4"
        >
          <div class="flex items-center justify-between mb-3 px-4 pb-4 border-b border-b-slate-400 ">
            <h2 class="text-lg font-semibold">
              Salva molecola
            </h2>
            <button class="text-2xl hover:text-emerald-600" (click)="close()">
              &times;
            </button>
          </div>
          <div class="overflow-y-auto px-3">
            <h2 class="font-semibold mb-3">
              Scegli la collezione di destinazione:
            </h2>
            <!-- ComboBox Collezioni -->
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

            <!-- FORM CUSTOM MOLECULE -->
            <form
              class="mt-8 space-y-5"
              autocomplete="off"
              (ngSubmit)="onConfirm()"
              novalidate
            >
              <!-- NOME MOLECOLA -->
              <div class="relative">
                <input #name
                  type="text"
                  class="block py-4 px-4 w-full text-sm bg-transparent border-slate-300 border rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-500 peer dark:text-white"
                  placeholder=" "
                  required
                  name="name"
                  [(ngModel)]="nameModel"
                  (blur)="onBlur('name')"
                  (focus)="onFocus('name')"
                />
                <label
                  (click)="onFocus('name')"
                  for="name"
                  class="peer-focus:font-medium absolute transition-all duration-300 bg-white dark:bg-dark-surface-main px-1 top-[13px] left-4 origin-[0] cursor-text"
                  [ngClass]="{
                        'text-emerald-700 dark:text-emerald-300 scale-110 -translate-y-6 text-sm': nameFocus() || nameModel,
                        'text-slate-500 dark:text-slate-300 text-lg scale-100 translate-y-0': !nameFocus() && !nameModel
                      }"
                >
                  Nome molecola*
                </label>
                <div class="text-sm text-light-error dark:text-dark-error mt-1 min-h-5">
                  @if (!nameModel && nameTouched) { Il nome è obbligatorio. }
                </div>
              </div>

              <!-- LABEL -->
              <div class="relative">
                <input #label
                  type="text"
                  class="block py-4 px-4 w-full text-sm bg-transparent border-slate-300 border rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-500 peer dark:text-white"
                  placeholder=" "
                  name="label"
                  [(ngModel)]="labelModel"
                  (blur)="onBlur('label')"
                  (focus)="onFocus('label')"
                />
                <label
                  (click)="onFocus('label')"
                  for="label"
                  class="peer-focus:font-medium absolute transition-all duration-300 bg-white dark:bg-dark-surface-main px-1 top-[13px] left-4 origin-[0] cursor-text"
                  [ngClass]="{
                        'text-emerald-700 dark:text-emerald-300 scale-110 -translate-y-6 text-sm': labelFocus() || labelModel,
                        'text-slate-500 dark:text-slate-300 text-lg scale-100 translate-y-0': !labelFocus() && !labelModel
                      }"
                >
                  Etichetta (facoltativa)
                </label>
              </div>

              <!-- NOTE -->
              <div class="relative">
                <textarea #notes
                  class="block py-4 px-4 w-full text-sm bg-transparent border-slate-300 border rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-500 peer dark:text-white"
                  placeholder=" "
                  name="notes"
                  [(ngModel)]="notesModel"
                  rows="2"
                  (blur)="onBlur('notes')"
                  (focus)="onFocus('notes')"
                ></textarea>
                <label
                  (click)="onFocus('notes')"
                  for="notes"
                  class="peer-focus:font-medium absolute transition-all duration-300 bg-white dark:bg-dark-surface-main px-1 top-[13px] left-4 origin-[0] cursor-text"
                  [ngClass]="{
                        'text-emerald-700 dark:text-emerald-400 scale-110 -translate-y-6 text-sm': notesFocus() || notesModel,
                        'text-slate-500 dark:text-slate-300 text-lg scale-100 translate-y-0': !notesFocus() && !notesModel
                      }"
                >
                  Note (facoltative)
                </label>
              </div>

              <!-- Proprietà calcolate -->
              <div
                class="bg-emerald-50 dark:bg-emerald-900/40 p-4 rounded-md text-emerald-900 dark:text-emerald-200 mb-2 mt-2"
              >
                <div class="font-semibold mb-2">Proprietà calcolate</div>
                <div class="grid grid-cols-2 gap-y-1 gap-x-6 text-sm">
                  <div>
                    <span class="font-semibold">MW:</span> {{
                    properties()?.mwFreebase ?? '—' }}
                  </div>
                  <div>
                    <span class="font-semibold">LogP:</span> {{ properties()?.alogp
                    ?? '—' }}
                  </div>
                  <div>
                    <span class="font-semibold">HBA:</span> {{ properties()?.hba ??
                    '—' }}
                  </div>
                  <div>
                    <span class="font-semibold">HBD:</span> {{ properties()?.hbd ??
                    '—' }}
                  </div>
                  <div>
                    <span class="font-semibold">PSA:</span> {{ properties()?.psa ??
                    '—' }}
                  </div>
                  <div>
                    <span class="font-semibold">RTB:</span> {{ properties()?.rtb ??
                    '—' }}
                  </div>
                </div>
              </div>

              <!-- Bottoni -->
              <div class="mt-8 flex justify-end gap-2 sticky">
                <button
                  type="button"
                  class="px-4 py-2 rounded bg-slate-200 text-light-on-surface-main dark:bg-slate-100 dark:text-neutral-950 hover:bg-gray-300"
                  (click)="close()"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  class="px-4 py-2 rounded bg-emerald-600 text-white font-semibold shadow hover:bg-emerald-700 disabled:bg-emerald-300 disabled:cursor-not-allowed"
                  [disabled]="!ctx.selectedCollectionId() || !nameModel"
                >
                  Salva
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
}

  `
})
export class CollectionSaveOverlayComponent implements OnInit {

  @ViewChild('name')
  private nameRef!: ElementRef<HTMLInputElement>

  @ViewChild('label')
  private labelRef!: ElementRef<HTMLInputElement>

  @ViewChild('notes')
  private notesRef!: ElementRef<HTMLTextAreaElement>


  protected readonly ctx = inject(CollectionSaveOverlayContextService);
  private readonly collectionService = inject(MoleculeCollectionService);
  private readonly moleculeJoinService = inject(MoleculeJoinService)
  private readonly toast = inject(ToastService)
  private readonly rdkitService = inject(RDKitService)
  private readonly router = inject(Router)

  nameFocus = signal<boolean>(false)
  labelFocus = signal<boolean>(false)
  notesFocus = signal<boolean>(false)

  collections = signal<MoleculeCollection[]>([]);
  hasMore = signal(true)
  loading = signal(false)

  // ngModel fields
  nameModel: string = '';
  nameTouched: boolean = false;
  labelModel: string = '';
  labelTouched: boolean = false;
  notesModel: string = '';
  notesTouched: boolean = false;
  properties = signal<MoleculeProperties | null>(null);

  ngOnInit() {
    this.loadCollections(true);
    this.loadProperties();
  }

  async loadProperties() {
    this.properties.set(
      await this.rdkitService.getMoleculeProperties(this.ctx.smiles())
    );
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

  onFocus(item: SaveOverlayFormItem): void {
    switch (item) {
      case 'label':
        document.activeElement !== this.labelRef.nativeElement && this.labelRef.nativeElement.focus()
        this.labelFocus.set(true)
        break
      case 'name':
        document.activeElement !== this.nameRef.nativeElement && this.nameRef.nativeElement.focus()
        this.nameFocus.set(true)
        break
      case 'notes':
        document.activeElement !== this.notesRef.nativeElement && this.notesRef.nativeElement.focus()
        this.notesFocus.set(true)
    }
  }

  onBlur(item: SaveOverlayFormItem): void {
    switch (item) {
      case 'label':
        this.labelTouched = true
        this.labelFocus.set(false)
        break
      case 'name':
        this.nameFocus.set(false)
        this.nameTouched = true
        break
      case 'notes':
        this.notesTouched = true
        this.notesFocus.set(false)
    }
  }

  async onConfirm() {
    if (!this.ctx.selectedCollectionId()) {
      this.toast.trigger('Seleziona una collezione', 'error');
      return;
    }
    if (!this.nameModel) {
      this.nameTouched = true;
      this.toast.trigger('Il nome è obbligatorio!', 'error');
      return;
    }

    const propertiesJson = JSON.stringify(this.properties());

    this.moleculeJoinService.addCustomMoleculeToCollection({
      collectionId: this.ctx.selectedCollectionId()!,
      input: {
        canonicalSmiles: this.ctx.smiles(),
        propertiesJson,
        name: this.nameModel,
        label: this.labelModel || undefined,
        notes: this.notesModel || undefined,
      }
    }).subscribe({
      next: (reply) => {
        this.toast.trigger(`Molecola salvata correttamente.`, 'success')
        this.router.navigate(['/molecules/editor'], {
          queryParams: {
            mode: 'edit',
            m_id: reply.id
          }
        })
        this.ctx.close()
      },
      error: () => this.toast.trigger('Si è verificato un errore!', 'error')
    })
  }

  close() {
    this.ctx.close()
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.ctx.isOpened()) this.close()
  }
}
