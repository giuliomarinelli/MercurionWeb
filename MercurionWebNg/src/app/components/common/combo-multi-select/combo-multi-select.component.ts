import { NgClass } from '@angular/common';
import { Component, Input, Output, EventEmitter, ElementRef, ViewChild, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';

/**
 * ComboMultiSelectComponent
 *
 * Derivato da ComboSelectComponent (single select) → ora multi‑select.
 * Mantiene lo stesso look & feel (Tailwind classes, layout, ricerca, scroll infinito, sezione "Crea nuova").
 *
 * API principali:
 *  - @Input() items: T[]
 *  - @Input() displayFn: (item: T) => string
 *  - @Input() valueFn:   (item: T) => any
 *  - @Input() searchPlaceholder?: string
 *  - @Input() hasMore = false
 *  - @Input() canCreateNew = false
 *  - @Input() selected: any[] = []       // valori selezionati (controllabile dal parent)
 *
 *  - @Output() searchChange = new EventEmitter<string>()
 *  - @Output() loadMore = new EventEmitter<void>()
 *  - @Output() selectionChange = new EventEmitter<any[]>() // emette i valori selezionati
 *  - @Output() createNew = new EventEmitter<string>()
 *
 * Note:
 *  - toggleItem() aggiunge/rimuove un valore in modo immutabile
 *  - È presente una barra con i "chip" dei selezionati (removibili) mantenendo lo stile sobrio
 */
@Component({
  selector: 'm-combo-multiselect',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, NgClass],
  template: `
    <div
      class="relative w-full max-w-xl bg-white dark:bg-neutral-800 rounded-xl shadow p-2 border border-slate-200 dark:border-slate-700"
      role="group"
      aria-label="Seleziona elementi multipli"
    >
      <!-- Selected chips / summary -->
      @if (selected.length) {
        <div class="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 mb-2 px-1">
          @for (val of selected; track val) {
            <span class="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
              {{ labelForValue(val) }}
              <button type="button" (click)="removeValue(val)" class="hover:opacity-80" aria-label="Rimuovi">
                ×
              </button>
            </span>
          }
          <span class="sm:ml-auto text-[11px] text-slate-500 dark:text-slate-400">Selezionati: {{ selected.length }}</span>
          <button type="button" (click)="clearSelection()" class="sm:ml-2 text-[11px] px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-neutral-700 text-slate-600 dark:text-slate-300" aria-label="Pulisci selezione">
            Pulisci
          </button>
        </div>
      }

      <!-- Input di ricerca -->
      <input
        type="text"
        class="w-full px-3 py-2 mb-2 rounded border dark:bg-neutral-800 dark:text-white"
        [placeholder]="searchPlaceholder || 'Cerca...'"
        [(ngModel)]="searchTerm"
        (input)="onInputChange($event)"
        aria-label="Cerca elementi nella lista"
      />

        <!-- Scrollable area -->
        <div
          #scrollContainer
          class="max-h-64 overflow-auto overflow-y-auto flex flex-col gap-1 h-56 m-scroll-thin"
          (scroll)="onScroll($event)"
          role="listbox" aria-multiselectable="true"
          [attr.aria-label]="ariaLabelListbox"
        >
        @if (filteredItems().length > 0) {
          @for (item of filteredItems(); track valueFn(item)) {
            <div
              class="px-3 py-2 cursor-pointer rounded hover:bg-blue-100 dark:hover:bg-blue-900 flex items-center gap-2"
              [ngClass]="{'bg-blue-50 dark:bg-blue-700': isSelected(item)}"
              (click)="toggleItem(item)"
              role="option" [attr.aria-selected]="isSelected(item)"
            >
              <input type="checkbox" class="mr-1" [checked]="isSelected(item)" (click)="$event.stopPropagation(); toggleItem(item)" [attr.aria-label]="'Seleziona ' + displayFn(item)" />
              <span class="truncate">{{ displayFn(item) }}</span>
            </div>
          }
        } @else {
          <div class="text-gray-500 px-3 py-2" role="status" aria-live="polite">Nessun risultato</div>
        }

        <!-- CREA NUOVA -->
        @if (canCreateNew) {
          <div class="px-3 py-2 border-t border-slate-100 dark:border-slate-600 mt-2 sticky bottom-0 z-20 bg-gray-200 dark:bg-neutral-800" aria-live="polite">
            @if (creatingNew) {
              <input
                class="w-2/3 px-2 py-1 mr-2 rounded border dark:bg-neutral-800 dark:text-white"
                placeholder="Nome nuova..."
                [(ngModel)]="newItemName"
                (keydown.enter)="onCreateNewConfirm()"
                #newInput
                aria-label="Nome nuovo elemento"
              />
              <button (click)="onCreateNewConfirm()" class="bg-emerald-600 text-white px-2 py-1 rounded" aria-label="Conferma creazione">Crea</button>
              <button (click)="creatingNew=false" class="ml-1 px-2 py-1 rounded text-gray-500 hover:bg-gray-200" aria-label="Annulla creazione">Annulla</button>
            } @else {
              <button (click)="startCreateNew()" class="text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-2" aria-label="Crea nuovo elemento">
                <span class="text-xl">+</span> Crea nuova...
              </button>
            }
          </div>
        }

        @if (loadingMore()) {
          <div class="px-3 py-2 text-gray-400 text-sm">Caricamento...</div>
        }
      </div>
    </div>
  ` })
export class ComboMultiSelectComponent<T> {
  // Dati & configurazione
  @Input({ required: true }) items: T[] = [];
  @Input({ required: true }) displayFn!: (item: T) => string;
  @Input({ required: true }) valueFn!: (item: T) => any;
  @Input() searchPlaceholder?: string;
  @Input() ariaLabelListbox = 'Elenco elementi';
  @Input() hasMore = false;
  @Input() canCreateNew = false;

  /**
   * Valori selezionati (controllabile anche dal parent)
   */
  @Input() selected: any[] = [];

  // Eventi
  @Output() searchChange = new EventEmitter<string>();
  @Output() loadMore = new EventEmitter<void>();
  @Output() selectionChange = new EventEmitter<any[]>();
  @Output() createNew = new EventEmitter<string>();

  // Stato interno
  searchTerm = '';
  creatingNew = false;
  newItemName = '';
  loadingMore = signal(false);

  @ViewChild('scrollContainer') scrollContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('newInput') newInput?: ElementRef<HTMLInputElement>;

  // --- Filtering & Search ----------------------------------------------------
  filteredItems(): T[] {
    const t = this.searchTerm.trim().toLowerCase();
    if (!t) return this.items;
    return this.items.filter(item => this.displayFn(item).toLowerCase().includes(t));
  }

  onInputChange(event: Event) {
    const value = (event.target as HTMLInputElement)?.value || '';
    this.searchTerm = value;
    this.searchChange.emit(this.searchTerm);
  }

  // --- Infinite Scroll -------------------------------------------------------
  onScroll(event: Event) {
    const target = event.target as HTMLElement;
    if (this.hasMore && target.scrollTop + target.clientHeight >= target.scrollHeight - 10) {
      if (!this.loadingMore()) {
        this.loadingMore.set(true);
        this.loadMore.emit();
        setTimeout(() => this.loadingMore.set(false), 800); // debounce minimo
      }
    }
  }

  // --- Selezione multipla ----------------------------------------------------
  isSelected(item: T): boolean {
    const v = this.valueFn(item);
    return this.selected?.some(s => this.equalsValue(s, v));
  }

  toggleItem(item: T) {
    const v = this.valueFn(item);
    const exists = this.selected.some(s => this.equalsValue(s, v));

    let next: any[];
    if (exists) {
      next = this.selected.filter(s => !this.equalsValue(s, v));
    } else {
      next = [...(this.selected || []), v];
    }

    this.selected = next;
    this.selectionChange.emit([...this.selected]);
    this.creatingNew = false;
  }

  removeValue(val: any) {
    this.selected = (this.selected || []).filter(s => !this.equalsValue(s, val));
    this.selectionChange.emit([...this.selected]);
  }

  clearSelection() {
    if (!this.selected?.length) return;
    this.selected = [];
    this.selectionChange.emit([]);
  }

  // --- Helpers ---------------------------------------------------------------
  labelForValue(val: any): string {
    const found = this.items.find(i => this.equalsValue(this.valueFn(i), val));
    return found ? this.displayFn(found) : String(val);
  }

  /**
   * Confronto "morbido" dei valori: se sono oggetti con id o primitive.
   * Puoi personalizzare questa logica se i tuoi value sono complessi.
   */
  private equalsValue(a: any, b: any): boolean {
    // Primitive equality
    if (a === b) return true;

    // Common case: oggetti con chiave id
    if (a && b && typeof a === 'object' && typeof b === 'object') {
      if ('id' in a && 'id' in b) return a.id === b.id;
    }

    // Fallback stringified (non ideale ma utile per casi semplici)
    try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
  }

  // --- Crea nuovo ------------------------------------------------------------
  startCreateNew() {
    this.creatingNew = true;
    setTimeout(() => this.newInput?.nativeElement?.focus(), 100);
  }

  onCreateNewConfirm() {
    if (this.newItemName.trim()) {
      this.createNew.emit(this.newItemName.trim());
      this.newItemName = '';
      this.creatingNew = false;
    }
  }
}
