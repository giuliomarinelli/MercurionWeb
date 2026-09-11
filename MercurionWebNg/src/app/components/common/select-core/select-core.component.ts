import { NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  output,
  signal,
  viewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectSelectionChange, SelectState } from './select-core.types';

let generatedSelectId = 0;

/**
 * Shared accessible interaction primitive for the single and multi select
 * adapters. The adapters own value typing; this component owns the complete
 * combobox/listbox interaction state.
 */
@Component({
  selector: 'm-select-core',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, NgClass],
  template: `
    <div class="relative w-full">
      @if (label()) {
        <label
          class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200"
          [for]="controlId()"
        >
          {{ label() }} @if (required()) { <span aria-hidden="true">*</span> }
        </label>
      }

      <div
        class="relative rounded-xl border border-slate-300 bg-white p-2 shadow
               dark:border-slate-600 dark:bg-slate-800"
        [class.opacity-60]="disabled()"
        [class.border-red-500]="invalid()"
      >
        @if (multiple() && selectedValues().length) {
          <div
            class="mb-2 flex flex-wrap items-center gap-2 px-1"
            aria-label="Elementi selezionati"
          >
            @for (value of selectedValues(); track value) {
              <span
                class="inline-flex items-center gap-1 rounded-full border border-blue-200
                       bg-blue-50 px-2 py-1 text-xs text-blue-700 dark:border-blue-800
                       dark:bg-blue-900/50 dark:text-blue-200"
              >
                {{ labelForValue(value) }}
                <button
                  type="button"
                  class="rounded-full px-1 hover:bg-blue-100 dark:hover:bg-blue-800"
                  [attr.aria-label]="'Rimuovi ' + labelForValue(value)"
                  (click)="removeValue(value)"
                >
                  ×
                </button>
              </span>
            }
            <button
              type="button"
              class="ml-auto rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100
                     dark:text-slate-300 dark:hover:bg-slate-700"
              aria-label="Pulisci selezione"
              (click)="clearSelection()"
            >
              Pulisci
            </button>
          </div>
        }

        <input
          #searchInput
          class="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900
                 placeholder-slate-500 focus:border-emerald-700 focus:outline-none
                 focus:ring-2 focus:ring-emerald-700 dark:border-slate-500 dark:bg-slate-900
                 dark:text-slate-50 dark:placeholder-slate-300 dark:focus:border-emerald-400
                 dark:focus:ring-emerald-400"
          [id]="controlId()"
          [value]="inputValue()"
          [placeholder]="searchPlaceholder()"
          [disabled]="disabled()"
          [attr.aria-label]="ariaLabel() || (label() ? null : 'Seleziona un elemento')"
          [attr.aria-required]="required() || null"
          [attr.aria-invalid]="invalid() || null"
          [attr.aria-describedby]="describedBy() || null"
          [attr.aria-expanded]="isOpen()"
          [attr.aria-controls]="listboxId()"
          [attr.aria-activedescendant]="activeDescendant()"
          role="combobox"
          autocomplete="off"
          (focus)="onFocus()"
          (blur)="onBlur()"
          (click)="open()"
          (input)="onInput($event)"
          (keydown)="onKeydown($event)"
        />

        @if (isOpen()) {
          <div
            class="mt-2 max-h-64 overflow-y-auto text-slate-800 dark:text-slate-50"
            [id]="listboxId()"
            role="listbox"
            [attr.aria-label]="ariaLabel() || label() || 'Elenco elementi'"
            [attr.aria-multiselectable]="multiple() || null"
            (scroll)="onScroll($event)"
          >
            @if (filteredItems().length) {
              @for (item of filteredItems(); track valueFn()(item); let index = $index) {
                <div
                  class="cursor-pointer rounded-md px-3 py-2 transition-colors
                         hover:bg-emerald-100 dark:hover:bg-emerald-800"
                  [ngClass]="{
                    'bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100':
                      isSelected(item),
                    'bg-slate-100 dark:bg-slate-700':
                      index === activeIndex() && !isSelected(item)
                  }"
                  [id]="optionId(index)"
                  role="option"
                  [attr.aria-selected]="isSelected(item)"
                  (mousedown)="$event.preventDefault()"
                  (mouseenter)="setActiveIndex(index)"
                  (click)="selectItem(item)"
                >
                  {{ displayFn()(item) }}
                </div>
              }
            } @else {
              <div
                class="px-3 py-2 text-slate-600 dark:text-slate-300"
                role="status"
                aria-live="polite"
              >
                Nessun risultato
              </div>
            }

            @if (canCreateNew()) {
              <div
                class="mt-2 border-t border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-600
                       dark:bg-slate-800"
              >
                @if (creatingNew()) {
                  <input
                    #newInput
                    class="w-2/3 rounded-md border border-slate-300 px-2 py-1 dark:border-slate-500
                           dark:bg-slate-900 dark:text-slate-50"
                    aria-label="Nome nuovo elemento"
                    placeholder="Nome nuova..."
                    [value]="newItemName()"
                    (input)="onNewItemInput($event)"
                    (keydown.enter)="confirmCreateNew()"
                  />
                  <button
                    type="button"
                    class="ml-2 rounded-md bg-emerald-600 px-2 py-1 text-white"
                    aria-label="Conferma creazione"
                    (click)="confirmCreateNew()"
                  >
                    Crea
                  </button>
                } @else {
                  <button
                    type="button"
                    class="font-semibold text-emerald-800 dark:text-emerald-200"
                    aria-label="Crea nuovo elemento"
                    (click)="startCreateNew()"
                  >
                    + Crea nuova...
                  </button>
                }
              </div>
            }

            @if (loadingMore()) {
              <div class="px-3 py-2 text-sm text-slate-600 dark:text-slate-300">
                Caricamento...
              </div>
            }
          </div>
        }
      </div>

      @if (hint()) {
        <div [id]="hintId()" class="mt-1 text-sm text-slate-600 dark:text-slate-300">
          {{ hint() }}
        </div>
      }
      @if (invalid() && error()) {
        <div
          [id]="errorId()"
          class="mt-1 text-sm text-red-700 dark:text-red-300"
          role="alert"
        >
          {{ error() }}
        </div>
      }
    </div>
  `
})
export class SelectCoreComponent<TItem, TValue> {
  readonly items = input.required<readonly TItem[]>();
  readonly displayFn = input.required<(item: TItem) => string>();
  readonly valueFn = input.required<(item: TItem) => TValue>();
  readonly selected = input<TValue | null>(null);
  readonly selectedValues = input<readonly TValue[]>([]);
  readonly multiple = input(false);
  readonly label = input('');
  readonly ariaLabel = input<string>();
  readonly id = input<string>();
  readonly hint = input('');
  readonly error = input('');
  readonly required = input(false);
  readonly disabled = input(false);
  readonly invalid = input(false);
  readonly searchPlaceholder = input('Cerca...');
  readonly hasMore = input(false);
  readonly canCreateNew = input(false);

  readonly selectionChange = output<SelectSelectionChange<TItem, TValue>>();
  readonly searchChange = output<string>();
  readonly loadMore = output<void>();
  readonly createNew = output<string>();

  private readonly state = signal<SelectState>({
    isOpen: false,
    activeIndex: -1,
    searchTerm: '',
    hasFocus: false
  });
  readonly creatingNew = signal(false);
  readonly newItemName = signal('');
  readonly loadingMore = signal(false);
  readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  readonly newInput = viewChild<ElementRef<HTMLInputElement>>('newInput');
  private suppressNextFocusOpen = false;

  private readonly generatedId = `select-${++generatedSelectId}`;
  readonly controlId = computed(() => this.id() || this.generatedId);
  readonly listboxId = computed(() => `${this.controlId()}-listbox`);
  readonly hintId = computed(() => `${this.controlId()}-hint`);
  readonly errorId = computed(() => `${this.controlId()}-error`);
  readonly isOpen = computed(() => this.state().isOpen);
  readonly activeIndex = computed(() => this.state().activeIndex);
  readonly activeDescendant = computed(() =>
    this.activeIndex() >= 0 && this.isOpen() ? this.optionId(this.activeIndex()) : null
  );
  readonly filteredItems = computed(() => {
    const term = this.state().searchTerm.trim().toLowerCase();
    if (!term) return this.items();
    return this.items().filter(item => this.displayFn()(item).toLowerCase().includes(term));
  });
  readonly inputValue = computed(() => {
    if (this.multiple() || this.state().hasFocus) return this.state().searchTerm;
    const selectedItem = this.items().find(item => this.sameValue(this.valueFn()(item), this.selected()));
    return selectedItem ? this.displayFn()(selectedItem) : '';
  });
  readonly describedBy = computed(() => {
    const ids: string[] = [];
    if (this.hint()) ids.push(this.hintId());
    if (this.invalid() && this.error()) ids.push(this.errorId());
    return ids.join(' ');
  });

  onFocus(): void {
    if (this.disabled()) return;
    if (this.suppressNextFocusOpen) {
      this.suppressNextFocusOpen = false;
      this.updateState({ hasFocus: true });
      return;
    }
    this.updateState({ hasFocus: true, isOpen: true, activeIndex: -1 });
  }

  onBlur(): void {
    window.setTimeout(() => {
      this.updateState({ hasFocus: false, isOpen: false, activeIndex: -1, searchTerm: '' });
    });
  }

  open(): void {
    if (this.disabled()) return;
    this.updateState({ isOpen: true, activeIndex: -1 });
  }

  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.updateState({
      searchTerm: value,
      isOpen: true,
      activeIndex: this.items().some(item => this.displayFn()(item).toLowerCase().includes(value.trim().toLowerCase()))
        ? 0
        : -1
    });
    this.searchChange.emit(value);
  }

  onKeydown(event: KeyboardEvent): void {
    if (this.disabled()) return;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.open();
        if (this.activeIndex() < 0) this.setActiveIndex(0);
        else this.moveActive(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.open();
        if (this.activeIndex() < 0) {
          this.setActiveIndex(Math.max(0, this.filteredItems().length - 1));
        } else {
          this.moveActive(-1);
        }
        break;
      case 'Home':
        if (this.isOpen()) {
          event.preventDefault();
          this.setActiveIndex(0);
        }
        break;
      case 'End':
        if (this.isOpen()) {
          event.preventDefault();
          this.setActiveIndex(Math.max(0, this.filteredItems().length - 1));
        }
        break;
      case 'Enter':
        if (this.isOpen() && this.activeIndex() >= 0) {
          event.preventDefault();
          const item = this.filteredItems()[this.activeIndex()];
          if (item) this.selectItem(item);
        } else {
          this.open();
        }
        break;
      case 'Escape':
        if (this.isOpen()) {
          event.preventDefault();
          this.closeAndRestoreFocus();
        }
        break;
      case 'Tab':
        this.updateState({ isOpen: false, activeIndex: -1, searchTerm: '' });
        break;
    }
  }

  setActiveIndex(index: number): void {
    const length = this.filteredItems().length;
    this.updateState({ activeIndex: length ? Math.max(0, Math.min(index, length - 1)) : -1 });
  }

  selectItem(item: TItem): void {
    if (this.disabled()) return;
    const value = this.valueFn()(item);
    if (this.multiple()) {
      const current = [...this.selectedValues()];
      const existingIndex = current.findIndex(currentValue => this.sameValue(currentValue, value));
      const values = existingIndex >= 0
        ? current.filter((_, index) => index !== existingIndex)
        : [...current, value];
      this.selectionChange.emit({ item, value, values });
      this.updateState({ activeIndex: this.filteredItems().indexOf(item), isOpen: true, searchTerm: '' });
    } else {
      this.selectionChange.emit({ item, value, values: [value] });
      this.updateState({ isOpen: false, activeIndex: -1, searchTerm: '' });
      this.suppressNextFocusOpen = true;
      this.searchInput()?.nativeElement.focus();
    }
    this.creatingNew.set(false);
  }

  isSelected(item: TItem): boolean {
    const value = this.valueFn()(item);
    return this.multiple()
      ? this.selectedValues().some(selected => this.sameValue(selected, value))
      : this.sameValue(this.selected(), value);
  }

  labelForValue(value: TValue): string {
    const item = this.items().find(candidate => this.sameValue(this.valueFn()(candidate), value));
    return item ? this.displayFn()(item) : String(value);
  }

  startCreateNew(): void {
    this.creatingNew.set(true);
    window.setTimeout(() => this.newInput()?.nativeElement.focus());
  }

  confirmCreateNew(): void {
    const name = this.newItemName().trim();
    if (!name) return;
    this.createNew.emit(name);
    this.newItemName.set('');
    this.creatingNew.set(false);
  }

  removeValue(value: TValue): void {
    if (!this.multiple()) return;
    const values = this.selectedValues().filter(selected => !this.sameValue(selected, value));
    this.selectionChange.emit({ values });
  }

  clearSelection(): void {
    if (!this.multiple() || !this.selectedValues().length) return;
    this.selectionChange.emit({ values: [] });
  }

  onNewItemInput(event: Event): void {
    this.newItemName.set((event.target as HTMLInputElement).value);
  }

  onScroll(event: Event): void {
    const target = event.target as HTMLElement;
    if (this.hasMore() && target.scrollTop + target.clientHeight >= target.scrollHeight - 10 && !this.loadingMore()) {
      this.loadingMore.set(true);
      this.loadMore.emit();
      window.setTimeout(() => this.loadingMore.set(false), 800);
    }
  }

  optionId(index: number): string {
    return `${this.listboxId()}-option-${index}`;
  }

  private closeAndRestoreFocus(): void {
    this.updateState({ isOpen: false, activeIndex: -1, searchTerm: '' });
    this.suppressNextFocusOpen = true;
    this.searchInput()?.nativeElement.focus();
  }

  private moveActive(delta: number): void {
    const length = this.filteredItems().length;
    if (!length) {
      this.setActiveIndex(-1);
      return;
    }
    const next = this.activeIndex() < 0
      ? 0
      : (this.activeIndex() + delta + length) % length;
    this.setActiveIndex(next);
  }

  private updateState(patch: Partial<SelectState>): void {
    this.state.update(current => ({ ...current, ...patch }));
  }

  private sameValue(left: TValue | null, right: TValue | null): boolean {
    return Object.is(left, right);
  }
}
