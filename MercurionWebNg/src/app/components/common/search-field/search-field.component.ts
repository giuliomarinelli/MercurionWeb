import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  viewChild,
  ElementRef
} from '@angular/core';

import { IconButtonComponent } from '../icon-button/icon-button.component';

@Component({
  selector: 'm-search-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconButtonComponent],
  host: { class: 'block' },
  template: `
    <div class="relative flex items-center gap-2">
      <label class="sr-only" [attr.for]="fieldId()">{{ label() }}</label>
      <div class="relative flex-1">
        <svg
          class="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 fill-current text-slate-700 dark:text-slate-200"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 512 512"
          aria-hidden="true">
          <path d="M505 442.7L405.3 343c28.4-34.9 45.5-79 45.5-127.3C450.8 103.5 347.3 0 225.4 0S0 103.5 0 215.6s103.5 215.6 225.4 215.6c48.3 0 92.4-17.1 127.3-45.5l99.7 99.7c4.6 4.6 10.6 7 16.7 7s12.1-2.3 16.7-7c9.3-9.2 9.3-24.4 0-33.7zM225.4 367c-83.5 0-151.4-67.9-151.4-151.4s67.9-151.4 151.4-151.4 151.4 67.9 151.4 151.4-67.9 151.4-151.4 151.4z"/>
        </svg>
        <input
          #inputElement
          class="w-full rounded-md border border-slate-400/70 bg-light-surface-secondary py-2.5 pl-10 pr-12 text-light-on-surface-main outline-none transition focus:border-light-accent-primary focus:ring-2 focus:ring-light-accent-primary disabled:cursor-not-allowed disabled:opacity-60 dark:border-dark-border dark:bg-dark-surface-secondary dark:text-dark-on-surface-main dark:focus:border-dark-accent-primary"
          [attr.id]="fieldId()"
          type="search"
          [value]="value()"
          [placeholder]="placeholder()"
          [disabled]="disabled()"
          [attr.aria-label]="label()"
          [attr.aria-describedby]="hint() ? hintId() : null"
          [attr.aria-busy]="pending() ? 'true' : null"
          autocomplete="off"
          (input)="onInput($any($event.target).value)"
          (keydown.enter)="onSubmit()" />
        @if (value() && !pending()) {
          <m-icon-button
            class="absolute right-1 top-1/2 -translate-y-1/2"
            size="sm"
            icon="close"
            ariaLabel="Cancella ricerca"
            [disabled]="disabled()"
            (pressed)="clear()" />
        } @else if (pending()) {
          <span
            class="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin rounded-full border-2 border-slate-400 border-t-transparent"
            role="status"
            aria-label="Ricerca in corso"></span>
        }
      </div>
      @if (hint()) {
        <span class="sr-only" [attr.id]="hintId()">{{ hint() }}</span>
      }
    </div>
  `
})
export class SearchFieldComponent {
  readonly value = input('');
  readonly label = input('Cerca');
  readonly placeholder = input('Cerca...');
  readonly hint = input('');
  readonly pending = input(false);
  readonly disabled = input(false);
  readonly id = input('');

  readonly valueChange = output<string>();
  readonly submitted = output<string>();
  readonly cleared = output<string>();

  readonly inputElement = viewChild.required<ElementRef<HTMLInputElement>>('inputElement');
  private static nextId = 0;
  private readonly generatedId = `m-search-field-${++SearchFieldComponent.nextId}`;

  fieldId(): string {
    return this.id() || this.generatedId;
  }

  hintId(): string {
    return `${this.fieldId()}-hint`;
  }

  onInput(value: string): void {
    if (!this.disabled()) this.valueChange.emit(value);
  }

  onSubmit(): void {
    if (!this.disabled()) this.submitted.emit(this.inputElement().nativeElement.value);
  }

  clear(): void {
    if (this.disabled()) return;
    this.valueChange.emit('');
    this.cleared.emit('');
    queueMicrotask(() => this.inputElement().nativeElement.focus());
  }
}
