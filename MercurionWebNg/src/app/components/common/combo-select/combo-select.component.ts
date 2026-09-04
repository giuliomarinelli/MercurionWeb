import { NgClass } from '@angular/common';
import { Component, Input, Output, EventEmitter, ElementRef, ViewChild, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'm-combo-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, NgClass],
  styles: [
    `
    /* Scrollbar sottile cross-browser */

    .m-scroll-thin {
      scrollbar-width: thin; /* Firefox */
      scrollbar-color: #64748b transparent; /* thumb, track */
    }

    :host-context(.dark) .m-scroll-thin {
      scrollbar-color: #94a3b8 transparent;
    }

    .m-scroll-thin::-webkit-scrollbar {
      width: 6px;
    }

    .m-scroll-thin::-webkit-scrollbar-track {
      background: transparent;
    }

    .m-scroll-thin::-webkit-scrollbar-thumb {
      background-color: #cbd5e1; /* slate-300-ish */
      border-radius: 9999px;
    }

    :host-context(.dark) .m-scroll-thin::-webkit-scrollbar-thumb {
      background-color: #475569; /* slate-600-ish */
    }

    .m-scroll-thin::-webkit-scrollbar-thumb:hover {
      background-color: #94a3b8;
    }

    :host-context(.dark) .m-scroll-thin::-webkit-scrollbar-thumb:hover {
      background-color: #e2e8f0;
    }
    `
  ],
  template: `
    <div
      class="relative w-full max-w-3xl bg-slate-50 dark:bg-slate-700 rounded-xl shadow p-2 border border-slate-300 dark:border-slate-500"
      role="group"
      aria-label="Seleziona un elemento"
    >
      <!-- Input di ricerca -->
      <input
        type="text"
        class="w-full px-3 py-2 mb-2 rounded-md border border-slate-300 bg-white text-slate-900
               placeholder-slate-700
               focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700
               dark:bg-slate-800 dark:text-slate-50 dark:border-slate-400 dark:placeholder-slate-200
               dark:focus:ring-emerald-400 dark:focus:border-emerald-400"
        [placeholder]="searchPlaceholder || 'Cerca...'"
        [(ngModel)]="searchTerm"
        (input)="onInputChange($event)"
        aria-label="Cerca elemento"
      />

      <!-- Scrollable area -->
      <div
        #scrollContainer
        class="max-h-64 overflow-auto overflow-y-auto flex flex-col gap-1 h-56 text-slate-800 dark:text-slate-50 m-scroll-thin"
        (scroll)="onScroll($event)"
        role="listbox"
        [attr.aria-label]="ariaLabelListbox"
      >
        @if (filteredItems().length > 0) {
          @for (item of filteredItems(); track valueFn(item)) {
            <div
              class="px-3 py-2 cursor-pointer rounded-md transition-colors duration-150
                     hover:bg-emerald-100 dark:hover:bg-emerald-800"
              [ngClass]="{
                'bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100 border border-emerald-300 dark:border-emerald-500':
                  isSelected(item)
              }"
              (click)="onSelectItem(item)"
              role="option"
              [attr.aria-selected]="isSelected(item)"
            >
              {{ displayFn(item) }}
            </div>
          }
        } @else {
          <div class="px-3 py-2 text-slate-700 dark:text-slate-200">
            Nessun risultato
          </div>
        }

        <!-- CREA NUOVA -->
        @if (canCreateNew) {
          <div
            class="px-3 py-2 border-t border-slate-200 dark:border-slate-500 mt-2 sticky bottom-0 z-20
                   bg-slate-100 dark:bg-slate-800"
            aria-live="polite"
          >
            @if (creatingNew) {
              <input
                class="w-2/3 px-2 py-1 mr-2 rounded-md border border-slate-300 bg-white text-slate-900
                       placeholder-slate-700
                       focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700
                       dark:bg-slate-900 dark:text-slate-50 dark:border-slate-500 dark:placeholder-slate-200
                       dark:focus:ring-emerald-400 dark:focus:border-emerald-400"
                placeholder="Nome nuova..."
                [(ngModel)]="newItemName"
                (keydown.enter)="onCreateNewConfirm()"
                #newInput
                aria-label="Nome nuovo elemento"
              />
              <button
                (click)="onCreateNewConfirm()"
                class="px-2 py-1 rounded-md bg-emerald-100 text-emerald-900 font-semibold
                       hover:bg-emerald-200
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700
                       focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100
                       dark:bg-emerald-900 dark:text-emerald-100 dark:hover:bg-emerald-800
                       dark:focus-visible:ring-emerald-400 dark:focus-visible:ring-offset-slate-800"
                aria-label="Conferma creazione"
              >
                Crea
              </button>
              <button
                (click)="creatingNew=false"
                class="ml-1 px-2 py-1 rounded-md text-slate-700 hover:bg-slate-200
                       dark:text-slate-200 dark:hover:bg-slate-700
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700
                       focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100
                       dark:focus-visible:ring-offset-slate-800"
                aria-label="Annulla creazione"
              >
                Annulla
              </button>
            } @else {
              <button
                (click)="startCreateNew()"
                class="text-emerald-800 dark:text-emerald-200 font-semibold flex items-center gap-2
                       hover:text-emerald-900 dark:hover:text-emerald-100
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700
                       focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100
                       dark:focus-visible:ring-emerald-400 dark:focus-visible:ring-offset-slate-800"
                aria-label="Crea nuovo elemento"
              >
                <span class="text-xl">+</span> Crea nuova...
              </button>
            }
          </div>
        }

        @if (loadingMore()) {
          <div class="px-3 py-2 text-sm text-slate-700 dark:text-slate-300">
            Caricamento...
          </div>
        }
      </div>
    </div>
  ` })
export class ComboSelectComponent<T> {
  @Input({ required: true }) items: T[] = [];
  @Input({ required: true }) displayFn!: (item: T) => string;
  @Input({ required: true }) valueFn!: (item: T) => any;
  @Input() searchPlaceholder?: string;
  @Input() ariaLabelListbox = 'Elenco elementi';
  @Input() hasMore = false;
  @Input() canCreateNew = false;
  @Input() selected?: any;

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

  onInputChange(event: Event) {
    const value = (event.target as HTMLInputElement)?.value || '';
    this.searchTerm = value;
    this.searchChange.emit(this.searchTerm);
  }

  onScroll(event: Event) {
    const target = event.target as HTMLElement;
    if (this.hasMore && target.scrollTop + target.clientHeight >= target.scrollHeight - 10) {
      if (!this.loadingMore()) {
        this.loadingMore.set(true);
        this.loadMore.emit();
        setTimeout(() => this.loadingMore.set(false), 800);
      }
    }
  }

  onSelectItem(item: T) {
    this.selected = this.valueFn(item);
    this.select.emit(item);
    this.creatingNew = false;
  }

  isSelected(item: T) {
    return this.valueFn(item) === this.selected;
  }

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
