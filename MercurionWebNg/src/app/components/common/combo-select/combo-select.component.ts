import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { SelectCoreComponent } from '../select-core/select-core.component';
import { SelectSelectionChange } from '../select-core/select-core.types';

@Component({
  selector: 'm-combo-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SelectCoreComponent],
  template: `
    <m-select-core
      [items]="items()"
      [displayFn]="displayFn()"
      [valueFn]="valueFn()"
      [selected]="selected()"
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
export class ComboSelectComponent<TItem, TValue = TItem> {
  readonly items = input.required<readonly TItem[]>();
  readonly displayFn = input.required<(item: TItem) => string>();
  readonly valueFn = input.required<(item: TItem) => TValue>();
  readonly selected = input<TValue | null>(null);
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
  readonly select = output<TItem>();
  readonly valueChange = output<TValue>();
  readonly createNew = output<string>();

  onSelectionChange(change: SelectSelectionChange<TItem, TValue>): void {
    if (change.item !== undefined && change.value !== undefined) {
      this.select.emit(change.item);
      this.valueChange.emit(change.value);
    }
  }
}
