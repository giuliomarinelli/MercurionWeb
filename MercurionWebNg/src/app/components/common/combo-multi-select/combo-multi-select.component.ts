import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { SelectCoreComponent } from '../select-core/select-core.component';
import { SelectSelectionChange } from '../select-core/select-core.types';

@Component({
  selector: 'm-combo-multiselect',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SelectCoreComponent],
  template: `
    <m-select-core
      [items]="items()"
      [displayFn]="displayFn()"
      [valueFn]="valueFn()"
      [selectedValues]="selected()"
      [multiple]="true"
      [label]="label()"
      [ariaLabel]="ariaLabel()"
      [id]="id()"
      [hint]="hint()"
      [error]="error()"
      [required]="required()"
      [disabled]="disabled()"
      [invalid]="invalid()"
      [searchPlaceholder]="searchPlaceholder() || 'Cerca...'"
      [hasMore]="hasMore()"
      [canCreateNew]="canCreateNew()"
      (selectionChange)="onSelectionChange($event)"
      (searchChange)="searchChange.emit($event)"
      (loadMore)="loadMore.emit()"
      (createNew)="createNew.emit($event)"
    />
  `
})
export class ComboMultiSelectComponent<TItem, TValue = TItem> {
  readonly items = input.required<readonly TItem[]>();
  readonly displayFn = input.required<(item: TItem) => string>();
  readonly valueFn = input.required<(item: TItem) => TValue>();
  readonly selected = input<readonly TValue[]>([]);
  readonly label = input('');
  readonly ariaLabel = input<string>();
  readonly id = input<string>();
  readonly hint = input('');
  readonly error = input('');
  readonly required = input(false);
  readonly disabled = input(false);
  readonly invalid = input(false);
  readonly searchPlaceholder = input<string>();
  readonly hasMore = input(false);
  readonly canCreateNew = input(false);

  readonly searchChange = output<string>();
  readonly loadMore = output<void>();
  readonly selectionChange = output<TValue[]>();
  readonly createNew = output<string>();

  onSelectionChange(change: SelectSelectionChange<TItem, TValue>): void {
    this.selectionChange.emit([...change.values]);
  }
}
