import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { SearchFieldComponent } from '../search-field/search-field.component';

/**
 * Compatibility shell for legacy callers. Search behavior lives in the
 * canonical stateless SearchField; callers own debounce and request policy.
 */
@Component({
  selector: 'm-search-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SearchFieldComponent],
  template: `
    <m-search-field
      [value]="value()"
      [placeholder]="placeholder()"
      [label]="ariaLabel() || placeholder()"
      [disabled]="disabled()"
      (valueChange)="valueChange.emit($event)"
      (submitted)="submitted.emit($event)"
      (cleared)="cleared.emit($event)" />
  `
})
export class PmSearchInputComponent {
  readonly value = input('');
  readonly placeholder = input('Cerca molecola...');
  readonly ariaLabel = input<string>();
  readonly disabled = input(false);
  readonly borderDark = input(true);
  readonly useAltDarkStyle = input(false);

  readonly valueChange = output<string>();
  readonly submitted = output<string>();
  readonly cleared = output<string>();
}
