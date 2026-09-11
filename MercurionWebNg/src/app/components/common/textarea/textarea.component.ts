import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  model,
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

export type TextareaResizeMode = 'none' | 'vertical' | 'horizontal' | 'both';

type ErrorMap = Record<string, string>;

let nextGeneratedId = 0;

@Component({
  selector: 'm-textarea',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
  host: { class: 'block' },
  template: `
    <div class="w-full">
      <div class="relative">
        <textarea
          #textareaElement
          class="peer block min-h-12 w-full rounded-md border border-slate-400 bg-light-surface-secondary px-4 py-3 text-light-on-surface-main outline-none transition
                 placeholder:text-transparent focus:border-light-accent-primary focus:ring-2 focus:ring-light-accent-primary
                 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-500
                 dark:border-slate-300 dark:bg-dark-surface-secondary dark:text-dark-on-surface-main dark:placeholder:text-transparent
                 dark:focus:border-dark-accent-primary dark:focus:ring-dark-accent-primary
                 dark:disabled:border-slate-700 dark:disabled:bg-slate-900 dark:disabled:text-slate-500"
          [class.resize-none]="resizeMode() === 'none'"
          [class.resize-y]="resizeMode() === 'vertical'"
          [class.resize-x]="resizeMode() === 'horizontal'"
          [class.resize]="resizeMode() === 'both'"
          [attr.id]="fieldId()"
          [attr.name]="name() || null"
          [attr.placeholder]="placeholder() || ' '"
          [attr.rows]="rows()"
          [attr.maxlength]="maxLength()"
          [disabled]="isDisabled()"
          [value]="value()"
          [attr.aria-invalid]="isInvalid() ? 'true' : null"
          [attr.aria-required]="isRequired() ? 'true' : null"
          [attr.aria-describedby]="describedBy()"
          (input)="onInput($any($event.target).value)"
          (focus)="focused.set(true)"
          (blur)="onBlur()"
        ></textarea>

        <label
          class="pointer-events-none absolute left-3 top-3 origin-left bg-light-surface-secondary px-1 text-light-on-surface-secondary transition-all
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
      </div>

      <div class="mt-1 flex min-h-5 items-start justify-between gap-3 text-sm">
        <div>
          @if (currentError()) {
            <p
              class="text-light-error dark:text-dark-error"
              [attr.id]="errorId()"
              role="alert"
              aria-live="polite"
            >
              {{ currentError() }}
            </p>
          } @else if (hint()) {
            <p
              class="text-light-on-surface-secondary dark:text-dark-on-surface-secondary"
              [attr.id]="hintId()"
            >
              {{ hint() }}
            </p>
          }
        </div>

        @if (shouldShowCount()) {
          <span
            class="shrink-0 text-light-on-surface-secondary dark:text-dark-on-surface-secondary"
            [attr.id]="countId()"
            aria-live="off"
          >
            {{ countText() }}
          </span>
        }
      </div>
    </div>
  `
})
export class TextareaComponent implements ControlValueAccessor {
  readonly label = input.required<string>();
  readonly id = input<string>();
  readonly name = input<string>();
  readonly placeholder = input<string>();
  readonly hint = input<string>();
  readonly error = input<string | null>(null);
  readonly errors = input<ErrorMap>({});
  readonly serverError = input<string | null>(null);
  readonly required = input(false);
  readonly disabled = input(false);
  readonly rows = input(3);
  readonly maxLength = input<number | null>(null);
  readonly showCount = input(false);
  readonly resizeMode = input<TextareaResizeMode>('vertical');
  readonly describedById = input<string>();
  readonly value = model<string>('');

  readonly textareaElement = viewChild.required<ElementRef<HTMLTextAreaElement>>('textareaElement');
  readonly ngControl = inject(NgControl, { self: true, optional: true });

  readonly focused = signal(false);
  private disabledByForm = false;
  private readonly generatedId = `m-textarea-${++nextGeneratedId}`;

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
    return this.value().length === 0;
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

  countId(): string {
    return `${this.fieldId()}-count`;
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

  shouldShowCount(): boolean {
    return this.showCount() || this.maxLength() !== null;
  }

  countText(): string {
    const maxLength = this.maxLength();
    return maxLength === null ? `${this.value().length}` : `${this.value().length} / ${maxLength}`;
  }

  describedBy(): string | null {
    const ids: string[] = [];
    const describedById = this.describedById();
    if (describedById) ids.push(describedById);
    if (this.currentError()) ids.push(this.errorId());
    else if (this.hint()) ids.push(this.hintId());
    if (this.shouldShowCount()) ids.push(this.countId());
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
    this.textareaElement().nativeElement.focus();
  }
}
