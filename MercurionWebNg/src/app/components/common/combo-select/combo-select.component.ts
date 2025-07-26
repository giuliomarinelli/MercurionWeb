import { NgClass } from '@angular/common';
import { Component, Input, Output, EventEmitter, ElementRef, ViewChild, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-combo-select',
  standalone: true,
  imports: [FormsModule, NgClass],
  template: `
    <div class="relative w-full max-w-xl bg-white dark:bg-neutral-800 rounded-xl shadow p-2 border border-slate-200 dark:border-slate-700">
      <!-- Input di ricerca -->
      <input
        type="text"
        class="w-full px-3 py-2 mb-2 rounded border dark:bg-neutral-800 dark:text-white"
        [placeholder]="searchPlaceholder || 'Cerca...'"
        [(ngModel)]="searchTerm"
        (input)="onInputChange($event)"
      />

      <!-- Scrollable area -->
      <div
        #scrollContainer
        class="max-h-64 overflow-auto flex flex-col gap-1 h-56 oveflow-y-auto"
        (scroll)="onScroll($event)"
      >
        @if (filteredItems().length > 0) {
          @for (item of filteredItems(); track valueFn(item)) {
            <div
              class="px-3 py-2 cursor-pointer rounded hover:bg-blue-100 dark:hover:bg-blue-900"
              [ngClass]="{'bg-blue-50 dark:bg-blue-700': isSelected(item)}"
              (click)="onSelectItem(item)"
            >
              {{ displayFn(item) }}
            </div>
          }
        } @else {
          <div class="text-gray-500 px-3 py-2">Nessun risultato</div>
        }

        <!-- CREA NUOVA -->
        @if (canCreateNew) {
          <div class="px-3 py-2 border-t border-slate-100 dark:border-slate-600 mt-2 sticky bottom-0 z-20 bg-gray-200 dark:bg-neutral-800">
            @if (creatingNew) {
              <input
                class="w-2/3 px-2 py-1 mr-2 rounded border dark:bg-neutral-800 dark:text-white"
                placeholder="Nome nuova..."
                [(ngModel)]="newItemName"
                (keydown.enter)="onCreateNewConfirm()"
                #newInput
              />
              <button (click)="onCreateNewConfirm()" class="bg-emerald-600 text-white px-2 py-1 rounded">Crea</button>
              <button (click)="creatingNew=false" class="ml-1 px-2 py-1 rounded text-gray-500 hover:bg-gray-200">Annulla</button>
            } @else {
              <button (click)="startCreateNew()" class="text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-2">
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
  `,
})
export class ComboSelectComponent<T> {

  @Input({ required: true }) items: T[] = [];
  @Input({ required: true }) displayFn!: (item: T) => string;
  @Input({ required: true }) valueFn!: (item: T) => any;
  @Input() searchPlaceholder?: string;
  @Input() hasMore = false;
  @Input() canCreateNew = false;
  @Input() selected?: any; // valore attualmente selezionato, controllabile anche dal parent

  @Output() searchChange = new EventEmitter<string>();
  @Output() loadMore = new EventEmitter<void>();
  @Output() select = new EventEmitter<T>();
  @Output() createNew = new EventEmitter<string>();

  searchTerm = '';
  creatingNew = false;
  newItemName = '';
  loadingMore = signal(false);

  @ViewChild('scrollContainer') scrollContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('newInput') newInput?: ElementRef<HTMLInputElement>;

  filteredItems() {
    const t = this.searchTerm.trim().toLowerCase();
    if (!t) return this.items;
    return this.items.filter(item => this.displayFn(item).toLowerCase().includes(t));
  }

  // Ricerca
  onInputChange(event: Event) {
    const value = (event.target as HTMLInputElement)?.value || '';
    this.searchTerm = value;
    this.searchChange.emit(this.searchTerm);
  }

  // Scroll infinito
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

  // Selezione
  onSelectItem(item: T) {
    this.selected = this.valueFn(item);
    this.select.emit(item);
    this.creatingNew = false;
  }

  isSelected(item: T) {
    return this.valueFn(item) === this.selected;
  }

  // Crea nuovo
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
