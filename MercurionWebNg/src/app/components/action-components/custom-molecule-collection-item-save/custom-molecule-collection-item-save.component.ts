import { CustomMoleculeCollectionItemSaveContextService } from './../../../services/context/action-context/custom-molecule-collection-item-save-context.service';
import { NgClass } from '@angular/common';
import { Component, ElementRef, HostListener, inject, signal, ViewChild, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { ComboSelectComponent } from '../../common/combo-select/combo-select.component';
import { ActionOverlayContextService } from '../../../services/context/action-context/action-overlay-context.service';
import { MoleculeCollectionService } from '../../../services/graphql/molecule-collection.service';
import { MoleculeJoinService } from '../../../services/graphql/molecule-collection-join.service';
import { ToastService } from '../../../services/toast.service';
import { RDKitService } from '../../../services/rd-kit.service';
import { Router } from '@angular/router';
import { MoleculeCollection } from '../../../Models/graphql/molecule-collection/molecule-collection.types';
import { FormsModule } from '@angular/forms';
import { MoleculeProperties } from '../../../Models/graphql/molecule-properties.model';
import { SaveOverlayFormItem } from '../../../Models/action/action-overlay.models';

@Component({
  selector: 'm-custom-molecule-collection-item-save',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, ComboSelectComponent, FormsModule],
  template: `

    <div class="flex justify-center items-start md:items-center min-h-screen px-2 sm:px-4 pt-1 md:pt-6 m-overlay-screen">
      <div
        class="action-card max-w-2xl h-full md:h-auto overflow-y-auto m-scroll-thin m-overlay-max-80 m-overscroll-touch"
        role="region"
        aria-labelledby="saveMoleculeHeading"
      >

        <!-- Header -->
        <div class="action-card-header">
          <h2
            id="saveMoleculeHeading"
            class="text-lg font-semibold text-light-on-surface-main dark:text-dark-on-surface-main"
          >
            Salva molecola
          </h2>
          <button
            type="button"
            class="action-card-close-btn"
            (click)="close()"
            aria-label="Chiudi pannello salva molecola"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current w-5 h-auto">
              <path
                d="M182.9 137.4L160.3 114.7L115 160L137.6 182.6L275 320L137.6 457.4L115 480L160.3 525.3L182.9 502.6L320.3 365.3L457.6 502.6L480.3 525.3L525.5 480L502.9 457.4L365.5 320L502.9 182.6L525.5 160L480.3 114.7L457.6 137.4L320.3 274.7L182.9 137.4z"
              />
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="action-card-body bg-light-surface-secondary dark:bg-dark-surface-secondary space-y-5 transition-all">

          <h2 class="font-semibold mt-2 text-light-on-surface-main dark:text-dark-on-surface-main">
            Scegli la collezione di destinazione:
          </h2>

          <!-- ComboBox Collezioni -->
          <m-combo-select class="block relative -top-3"
            [items]="collections()"
            [displayFn]="displayCollection"
            [valueFn]="valueCollection"
            [hasMore]="hasMore()"
            [canCreateNew]="true"
            [searchPlaceholder]="'Cerca collezione...'"
            [selected]="saveCtx.selectedCollectionId()"
            (searchChange)="onSearchChange($event)"
            (loadMore)="onScrollEnd()"
            (select)="onSelect($event)"
            (createNew)="onCreateNew($event)"
            [attr.aria-label]="'Seleziona o crea collezione di destinazione'"
          />

          <!-- FORM CUSTOM MOLECULE -->
          <form
            class="mt-8 space-y-5"
            autocomplete="off"
            (ngSubmit)="onConfirm()"
            novalidate
            role="form"
            aria-labelledby="saveMoleculeHeading"
          >
            <!-- NOME MOLECOLA -->
            <div class="relative">
              <input
                #name
                id="name"
                type="text"
                class="block py-4 px-4 w-full text-sm bg-light-surface-secondary dark:bg-dark-surface-secondary border border-slate-400 dark:border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-light-accent-primary-hq focus:border-light-accent-primary-hq dark:focus:ring-dark-accent-primary-btn-hc dark:focus:border-dark-accent-primary-btn-hc peer text-light-on-surface-main dark:text-dark-on-surface-main"
                placeholder=" "
                required
                name="name"
                [(ngModel)]="nameModel"
                (blur)="onBlur('name')"
                (focus)="onFocus('name')"
                [attr.aria-required]="true"
                [attr.aria-invalid]="!nameModel && nameTouched"
                [attr.aria-describedby]="!nameModel && nameTouched ? 'nameError' : null"
              />
              <label
                (click)="onFocus('name')"
                for="name"
                class="peer-focus:font-medium absolute transition-all duration-300 bg-light-surface-secondary dark:bg-dark-surface-secondary px-1 top-[13px] left-4 origin-[0] cursor-text"
                [ngClass]="{
                  'text-light-accent-secondary dark:text-dark-accent-secondary-hc scale-110 -translate-y-6 text-sm': nameFocus() || nameModel,
                  'text-light-on-surface-secondary dark:text-dark-on-surface-secondary text-lg scale-100 translate-y-0': !nameFocus() && !nameModel
                }"
              >
                Nome molecola*
              </label>
              <div class="text-sm text-light-error dark:text-dark-error-hc mt-1 min-h-2">
                @if (!nameModel && nameTouched) {
                  <span id="nameError" role="alert" aria-live="assertive">
                    Il nome è obbligatorio.
                  </span>
                }
              </div>
            </div>

            <!-- LABEL -->
            <div class="relative">
              <input
                #label
                id="label"
                type="text"
                class="block py-4 px-4 w-full text-sm bg-light-surface-secondary dark:bg-dark-surface-secondary border border-slate-400 dark:border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-light-accent-primary focus:border-light-accent-primary dark:focus:ring-dark-accent-primary-btn-hc dark:focus:border-dark-accent-primary-btn-hc peer text-light-on-surface-main dark:text-dark-on-surface-main"
                placeholder=" "
                name="label"
                [(ngModel)]="labelModel"
                (blur)="onBlur('label')"
                (focus)="onFocus('label')"
              />
              <label
                (click)="onFocus('label')"
                for="label"
                class="peer-focus:font-medium absolute transition-all duration-300 bg-light-surface-secondary dark:bg-dark-surface-secondary px-1 top-[13px] left-4 origin-[0] cursor-text"
                [ngClass]="{
                  'text-light-accent-secondary dark:text-dark-accent-secondary-hc scale-110 -translate-y-6 text-sm': labelFocus() || labelModel,
                  'text-light-on-surface-secondary dark:text-dark-on-surface-secondary text-lg scale-100 translate-y-0': !labelFocus() && !labelModel
                }"
              >
                Etichetta (facoltativa)
              </label>
            </div>

            <!-- NOTE -->
            <div class="relative">
              <textarea
                #notes
                id="notes"
                class="block py-4 px-4 w-full text-sm bg-light-surface-secondary dark:bg-dark-surface-secondary border border-slate-400 dark:border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-light-accent-primary focus:border-light-accent-primary dark:focus:ring-dark-accent-primary-btn-hc dark:focus:border-dark-accent-primary-btn-hc peer text-light-on-surface-main dark:text-dark-on-surface-main"
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
                class="peer-focus:font-medium absolute transition-all duration-300 bg-light-surface-secondary dark:bg-dark-surface-secondary px-1 top-[13px] left-4 origin-[0] cursor-text"
                [ngClass]="{
                  'text-light-accent-secondary dark:text-dark-accent-secondary-hc scale-110 -translate-y-6 text-sm': notesFocus() || notesModel,
                  'text-light-on-surface-secondary dark:text-dark-on-surface-secondary text-lg scale-100 translate-y-0': !notesFocus() && !notesModel
                }"
              >
                Note (facoltative)
              </label>
            </div>

            <!-- Proprietà calcolate -->
            <div
              class="px-5 sm:px-6 py-4 border border-light-border dark:border-dark-border bg-light-surface-main dark:bg-dark-surface-main rounded-lg text-sm text-light-on-surface-secondary dark:text-dark-on-surface-secondary mb-2 mt-2"
            >
              <div class="font-semibold mb-2 text-light-on-surface-main dark:text-dark-on-surface-main flex items-center justify-between gap-3">
                <span>Proprietà calcolate</span>
                <button
                  type="button"
                  class="rounded-md text-sm px-3 py-2 bg-light-accent-primary text-white font-semibold shadow-sm hover:bg-light-accent-primary-hc transition-colors focus:outline-none focus:ring-2 focus:ring-light-accent-primary-hq focus:ring-offset-2 focus:ring-offset-light-surface-main dark:focus:ring-offset-dark-surface-main"
                  (click)="computeProps()"
                  aria-label="Calcola proprietà"
                >
                  Calcola
                </button>
              </div>
              <div class="grid grid-cols-2 gap-y-1 gap-x-6">
                <div>
                  <span class="font-semibold">MW:</span>
                  {{ properties()?.mwFreebase ?? '-' }}
                </div>
                <div>
                  <span class="font-semibold">LogP:</span>
                  {{ properties()?.alogp ?? '-' }}
                </div>
                <div>
                  <span class="font-semibold">HBA:</span>
                  {{ properties()?.hba ?? '-' }}
                </div>
                <div>
                  <span class="font-semibold">HBD:</span>
                  {{ properties()?.hbd ?? '-' }}
                </div>
                <div>
                  <span class="font-semibold">PSA:</span>
                  {{ properties()?.psa ?? '-' }}
                </div>
                <div>
                  <span class="font-semibold">RTB:</span>
                  {{ properties()?.rtb ?? '-' }}
                </div>
              </div>
            </div>

            <!-- Bottoni -->
            <div class="mt-8 flex justify-end gap-2">
              <button
                type="button"
                class="px-4 py-2 rounded-lg bg-light-surface-secondary text-light-on-surface-main dark:bg-slate-200 dark:text-light-on-surface-main hover:bg-white dark:hover:bg-slate-300/80 border border-light-border dark:border-dark-border/80 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-accent-primary-hq focus-visible:ring-offset-2 focus-visible:ring-offset-light-surface-secondary dark:focus-visible:ring-offset-dark-surface-secondary transition-colors duration-200"
                (click)="close()"
                aria-label="Annulla salvataggio molecola"
              >
                Annulla
              </button>

              <button
                type="submit"
                class="relative inline-flex items-center justify-center px-4 py-2 rounded-lg bg-light-accent-primary text-white font-semibold shadow-md hover:bg-light-accent-primary-hc dark:bg-dark-accent-primary-btn dark:hover:bg-dark-accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-accent-primary-hq focus-visible:ring-offset-2 focus-visible:ring-offset-light-surface-secondary dark:focus-visible:ring-offset-dark-surface-secondary disabled:bg-light-accent-primary/50 disabled:cursor-not-allowed transition-colors duration-200 dark:shadow-btn-dark disabled:hover:bg-light-accent-primary-hc/50"
                [disabled]="!saveCtx.selectedCollectionId() || !nameModel"
                [attr.aria-disabled]="!saveCtx.selectedCollectionId() || !nameModel"
                aria-label="Salva molecola nella collezione selezionata"
              >
                Salva
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class CustomMoleculeCollectionItemSaveComponent implements OnInit {
  @ViewChild('name')
  private nameRef!: ElementRef<HTMLInputElement>;

  @ViewChild('label')
  private labelRef!: ElementRef<HTMLInputElement>;

  @ViewChild('notes')
  private notesRef!: ElementRef<HTMLTextAreaElement>;

  protected readonly overlayCtx = inject(ActionOverlayContextService);
  private readonly sessionId = this.overlayCtx.session('MoleculeCollectionItemSave')?.id ?? -1;
  protected readonly saveCtx = inject(CustomMoleculeCollectionItemSaveContextService);
  private readonly collectionService = inject(MoleculeCollectionService);
  private readonly moleculeJoinService = inject(MoleculeJoinService);
  private readonly toast = inject(ToastService);
  private readonly rdkitService = inject(RDKitService);
  private readonly router = inject(Router);

  nameFocus = signal<boolean>(false);
  labelFocus = signal<boolean>(false);
  notesFocus = signal<boolean>(false);

  collections = signal<MoleculeCollection[]>([]);
  hasMore = signal(true);
  loading = signal(false);

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
      await this.rdkitService.getMoleculeProperties(this.saveCtx.smiles())
    );
  }

  computeProps(): void {
    // recompute properties on demand
    this.loadProperties();
  }

  displayCollection(item: Pick<MoleculeCollection, 'name'>) {
    return item.name;
  }

  valueCollection(item: Pick<MoleculeCollection, 'id'>) {
    return item.id;
  }

  loadCollections(reset = false) {
    if (this.loading()) return;
    this.loading.set(true);
    const page = reset ? 1 : this.saveCtx.page();
    this.collectionService
      .getPaginatedCollections(page, 12, this.saveCtx.searchTerm())
      .subscribe(res => {
        if (reset) this.collections.set(res.items);
        else this.collections.set([...this.collections(), ...res.items]);
        this.hasMore.set(res.currentPage < res.totalPages);
        this.saveCtx.page.set(res.currentPage + 1);
        this.loading.set(false);
      });
  }

  onSearchChange(term: string) {
    this.saveCtx.searchTerm.set(term);
    this.saveCtx.page.set(1);
    this.loadCollections(true);
  }

  onScrollEnd() {
    if (this.hasMore() && !this.loading()) {
      this.loadCollections();
    }
  }

  onSelect(item: Pick<MoleculeCollection, 'id'>) {
    this.saveCtx.selectedCollectionId.set(item.id);
  }

  onCreateNew(name: string) {
    this.collectionService.createCollection(name).subscribe(newColl => {
      this.collections.set([newColl, ...this.collections()]);
      this.saveCtx.selectedCollectionId.set(newColl.id);
    });
  }

  onFocus(item: SaveOverlayFormItem): void {
    switch (item) {
      case 'label':
        document.activeElement !== this.labelRef.nativeElement && this.labelRef.nativeElement.focus();
        this.labelFocus.set(true);
        break;
      case 'name':
        document.activeElement !== this.nameRef.nativeElement && this.nameRef.nativeElement.focus();
        this.nameFocus.set(true);
        break;
      case 'notes':
        document.activeElement !== this.notesRef.nativeElement && this.notesRef.nativeElement.focus();
        this.notesFocus.set(true);
    }
  }

  onBlur(item: SaveOverlayFormItem): void {
    switch (item) {
      case 'label':
        this.labelTouched = true;
        this.labelFocus.set(false);
        break;
      case 'name':
        this.nameFocus.set(false);
        this.nameTouched = true;
        break;
      case 'notes':
        this.notesTouched = true;
        this.notesFocus.set(false);
    }
  }

  async onConfirm() {
    if (!this.saveCtx.selectedCollectionId()) {
      this.toast.trigger('Seleziona una collezione', 'error');
      return;
    }
    if (!this.nameModel) {
      this.nameTouched = true;
      this.toast.trigger('Il nome è obbligatorio!', 'error');
      return;
    }

    const propertiesJson = JSON.stringify(this.properties());

    this.moleculeJoinService
      .addCustomMoleculeToCollection({
        collectionId: this.saveCtx.selectedCollectionId()!,
        input: {
          canonicalSmiles: this.saveCtx.smiles(),
          propertiesJson,
          name: this.nameModel,
          label: this.labelModel || undefined,
          notes: this.notesModel || undefined
        }
      })
      .subscribe({
        next: reply => {
          this.toast.trigger(`Molecola salvata correttamente.`, 'success');
          this.router.navigate([`/molecules/detail/${reply.id}`], {
            queryParams: {
              c_id: this.saveCtx.selectedCollectionId()
            }
          });
          this.overlayCtx.close(this.sessionId);
        },
        error: () => this.toast.trigger('Si è verificato un errore!', 'error')
      });
  }

  close() {
    this.overlayCtx.close(this.sessionId);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.overlayCtx.isOpened()) this.close();
  }
}

