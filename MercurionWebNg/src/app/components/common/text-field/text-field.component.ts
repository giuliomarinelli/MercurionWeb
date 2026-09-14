import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild
} from '@angular/core';
import {
  ControlValueAccessor,
  FormControl,
  NgControl,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

type ErrorMap = Record<string, string>;

let nextGeneratedId = 0;

@Component({
  selector: 'm-text-field, m-floating-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
  host: { class: 'block' },
  template: `
    <div class="w-full">
      <div
        class="relative flex items-center rounded-md bg-light-surface-secondary dark:bg-dark-surface-secondary"
      >
        <span
          class="pointer-events-none absolute left-3 z-10 flex items-center text-light-on-surface-secondary dark:text-dark-on-surface-secondary"
        >
          <ng-content select="[mTextFieldPrefix]" />
        </span>

        <input
          #inputElement
          class="peer block min-h-12 w-full rounded-md border border-slate-400 bg-transparent px-4 py-3 text-light-on-surface-main outline-none transition
                 placeholder:text-transparent focus:border-light-accent-primary focus:ring-2 focus:ring-light-accent-primary
                 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-500
                 dark:border-slate-300 dark:text-dark-on-surface-main dark:placeholder:text-transparent
                 dark:focus:border-dark-accent-primary dark:focus:ring-dark-accent-primary
                 dark:disabled:border-slate-700 dark:disabled:bg-slate-900 dark:disabled:text-slate-500"
          [attr.id]="fieldId()"
          [attr.name]="name() || null"
          [attr.type]="type()"
          [attr.autocomplete]="autocomplete() || null"
          [attr.inputmode]="inputmode() || null"
          [attr.placeholder]="placeholder() || ' '"
          [disabled]="isDisabled()"
          [value]="value()"
          [attr.aria-invalid]="isInvalid() ? 'true' : null"
          [attr.aria-required]="isRequired() ? 'true' : null"
          [attr.aria-describedby]="describedBy()"
          (input)="onInput($any($event.target).value)"
          (focus)="focused.set(true)"
          (blur)="onBlur()"
          (keyup.enter)="enter.emit()"
        />

        <label
          class="pointer-events-none absolute left-3 origin-left bg-light-surface-secondary px-1 text-light-on-surface-secondary transition-all
                 peer-focus:-translate-y-6 peer-focus:scale-90 peer-focus:text-light-accent-secondary
                 dark:bg-dark-surface-secondary dark:text-dark-on-surface-secondary
                 dark:peer-focus:text-dark-accent-secondary-hc"
          [class.-translate-y-6]="focused() || !empty()"
          [class.scale-90]="focused() || !empty()"
          [class.text-light-accent-secondary]="focused() || !empty()"
          [attr.for]="fieldId()"
        >
          {{ label() }} @if (isRequired()) { <span aria-hidden="true">*</span> }
        </label>

        <span
          class="absolute right-3 z-10 flex items-center text-light-on-surface-secondary dark:text-dark-on-surface-secondary"
        >
          <ng-content select="[mTextFieldSuffix]" />
        </span>
      </div>

      @if (currentError()) {
        <p
          class="mt-1 min-h-5 text-sm text-light-error dark:text-dark-error"
          [attr.id]="errorId()"
          role="alert"
          aria-live="polite"
        >
          {{ currentError() }}
        </p>
      } @else if (hint()) {
        <p
          class="mt-1 min-h-5 text-sm text-light-on-surface-secondary dark:text-dark-on-surface-secondary"
          [attr.id]="hintId()"
        >
          {{ hint() }}
        </p>
      } @else {
        <div class="min-h-5" aria-hidden="true"></div>
      }
    </div>
  `
})
export class TextFieldComponent implements ControlValueAccessor {
  readonly label = input.required<string>();
  readonly id = input<string>();
  readonly name = input<string>();
  readonly type = input<'text' | 'email' | 'password' | 'tel' | 'url' | 'search'>('text');
  readonly autocomplete = input<string>();
  readonly inputmode = input<string>();
  readonly placeholder = input<string>();
  readonly hint = input<string>();
  readonly error = input<string | null>(null);
  readonly errors = input<ErrorMap>({});
  readonly serverError = input<string | null>(null);
  readonly required = input(false);
  readonly disabled = input(false);
  readonly describedById = input<string>();
  readonly enter = output<void>();

  readonly inputElement = viewChild.required<ElementRef<HTMLInputElement>>('inputElement');
  readonly ngControl = inject(NgControl, { self: true, optional: true });

  readonly value = signal('');
  readonly focused = signal(false);
  private disabledByForm = false;
  private readonly generatedId = `m-text-field-${++nextGeneratedId}`;

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor() {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  get control(): FormControl | null {
    return (this.ngControl?.control as FormControl) ?? null;
  }

  empty(): boolean {
    return this.value().trim().length === 0;
  }

  fieldId(): string {
    return this.id() || this.generatedId;
  }

  hintId(): string {
    return `${this.fieldId()}-hint`;
  }

  errorId(): string {
    return `${this.fieldId()}-error`;
  }

  isDisabled(): boolean {
    return this.disabledByForm || this.disabled() || Boolean(this.control?.disabled);
  }

  isInvalid(): boolean {
    const control = this.control;
    return Boolean(this.currentError() || (control?.touched && control.invalid));
  }

  isRequired(): boolean {
    return Boolean(this.required() || this.control?.hasValidator(Validators.required));
  }

  currentError(): string {
    const explicitError = this.error() || this.serverError();
    if (explicitError) return explicitError;

    const control = this.control;
    if (!control?.touched || !control.errors) return '';

    const key = Object.keys(control.errors)[0];
    return this.errors()[key] || '';
  }

  describedBy(): string | null {
    const ids = [];
    if (this.describedById()) ids.push(this.describedById());
    if (this.currentError()) ids.push(this.errorId());
    else if (this.hint()) ids.push(this.hintId());
    return ids.length ? ids.join(' ') : null;
  }

  writeValue(value: unknown): void {
    this.value.set(value == null ? '' : String(value));
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabledByForm = isDisabled;
  }

  onInput(value: string): void {
    this.value.set(value);
    this.onChange(value);
  }

  onBlur(): void {
    this.focused.set(false);
    this.onTouched();
  }

  focus(): void {
    this.inputElement().nativeElement.focus();
  }
}
