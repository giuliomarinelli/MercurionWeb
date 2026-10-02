import { CommonModule } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
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
      <div class="group relative min-w-0">
        <textarea
          #textareaElement
          class="peer block min-h-12 w-full rounded-md bg-transparent px-4 py-3 text-base text-light-on-surface-main outline-none transition
                 placeholder:text-transparent
                 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500
                 dark:text-dark-on-surface-main dark:placeholder:text-transparent
                 dark:disabled:bg-slate-900 dark:disabled:text-slate-500"
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
          (input)="onInput($event)"
          (focus)="focused.set(true)"
          (blur)="onBlur()"
        ></textarea>

        <div class="pointer-events-none absolute inset-y-0 left-0 rounded-b-md border-x border-b border-slate-400 group-focus-within:border-2 group-focus-within:border-t-0 group-focus-within:border-light-accent-primary dark:border-slate-300 dark:group-focus-within:border-dark-accent-primary" [style.width]="outlineWidth() === null ? '100%' : outlineWidth() + 'px'" style="clip-path: inset(6px 0 0 0)" aria-hidden="true"></div>
        <div class="pointer-events-none absolute left-0 top-0 flex h-px text-slate-400 group-focus-within:text-light-accent-primary dark:text-slate-300 dark:group-focus-within:text-dark-accent-primary" [style.width]="outlineWidth() === null ? '100%' : outlineWidth() + 'px'" aria-hidden="true">
          <span class="h-2 w-3 shrink-0 rounded-tl-md border-l border-t border-current group-focus-within:border-2 group-focus-within:border-b-0 group-focus-within:border-r-0"></span>
          @if (focused() || !empty()) { <span class="shrink-0 px-1 text-base leading-none opacity-0">{{ label() }} @if (isRequired()) { * }</span> }
          <span class="min-w-0 flex-1 border-t border-current group-focus-within:border-t-2"></span>
          <span class="h-2 w-2 shrink-0 rounded-tr-md border-r border-t border-current group-focus-within:border-2 group-focus-within:border-b-0 group-focus-within:border-l-0"></span>
        </div>

        <label
          class="pointer-events-none absolute left-3 -translate-y-1/2 px-1 text-base text-light-on-surface-secondary transition-[top,color]
                 peer-focus:text-light-accent-secondary
                 dark:text-dark-on-surface-secondary
                 dark:peer-focus:text-dark-accent-secondary-hc"
          [style.top]="focused() || !empty() ? '0' : '1.5rem'"
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
  readonly outlineWidth = signal<number | null>(null);
  private readonly destroyRef = inject(DestroyRef);
  private disabledByForm = false;
  private readonly generatedId = `m-textarea-${++nextGeneratedId}`;

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor() {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
    afterNextRender(() => {
      const observer = new ResizeObserver(() => {
        this.outlineWidth.set(this.textareaElement().nativeElement.getBoundingClientRect().width);
      });
      observer.observe(this.textareaElement().nativeElement);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  get control(): FormControl<string> | null {
    return (this.ngControl?.control as FormControl<string> | null) ?? null;
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

  onInput(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLTextAreaElement)) return;
    const value = target.value;
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
