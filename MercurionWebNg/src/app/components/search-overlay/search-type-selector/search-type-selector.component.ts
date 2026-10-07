import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

@Component({
  selector: 'm-search-type-selector',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    input[type="radio"] {
      appearance: none;
      border: 2px solid var(--m-color-border);
      border-radius: 50%;
      background: var(--m-color-surface-main);
    }
    input[type="radio"]:checked {
      border-color: var(--m-color-accent-primary);
      background: var(--m-color-accent-primary);
      box-shadow: inset 0 0 0 3px var(--m-color-surface-main);
    }
    input[type="radio"]:focus-visible { outline-color: var(--m-color-focus); }
    @media (forced-colors: active) {
      input[type="radio"] { appearance: auto; box-shadow: none; }
    }
  `,
  template: `
    <div class="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Scegli dove cercare le molecole">
      @for (option of options; track option.value) {
        <label class="flex min-w-0 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors border-token-border text-on-surface-main"
          [class.bg-light-surface-secondary]="value() === option.value"
          [class.dark:bg-dark-surface-secondary]="value() === option.value">
          <input type="radio" class="size-4 shrink-0 accent-light-accent-primary dark:accent-dark-accent-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            [attr.aria-label]="option.label" [name]="groupName" [value]="option.value" [checked]="value() === option.value"
            (change)="onViewClick.emit(option.value)" />
          <span>{{ compact() && option.value === 'my' ? 'Le mie' : option.label }}</span>
        </label>
      }
    </div>
  `
})
export class SearchTypeSelectorComponent {
  readonly compact = input(false);
  readonly value = input<'my' | 'chembl'>('chembl');
  readonly onViewClick = output<'my' | 'chembl'>();
  private static nextId = 0;
  readonly groupName = `m-search-source-${++SearchTypeSelectorComponent.nextId}`;
  readonly options = [
    { value: 'chembl', label: 'ChEMBL' },
    { value: 'my', label: 'Le mie molecole' }
  ] as const;
}
