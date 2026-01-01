import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  inject,
  signal,
  computed,
  OnInit
} from '@angular/core';
import {
  ControlValueAccessor,
  NgControl,
  ReactiveFormsModule,
  FormControl
} from '@angular/forms';
import { ClassicSpinnerComponent } from '../classic-spinner/classic-spinner.component';

type ErrorMap = Record<string, string>;

@Component({
  selector: 'm-floating-input',
  imports: [CommonModule, ReactiveFormsModule, ClassicSpinnerComponent],
  host: { class: 'block' },
  template: `
    <div class="m-floating-field" [ngClass]="[bgClass, darkBgClass]">
      <div class="m-floating-field-bg"></div>

      <input
        #inp
        [type]="type"
        class="m-floating-input-element
               text-dark dark:text-light
               border border-slate-400 dark:border-slate-200
               focus:outline-none focus:ring-2 focus:ring-light-accent-primary
               focus:border-light-accent-primary"
        [ngClass]="[darkFocusBorderClass, darkFocusRingClass]"
        [attr.id]="id"
        [attr.autocomplete]="autocomplete"
        placeholder=" "
        [disabled]="disabled"
        [value]="value()"
        (focus)="focused.set(true)"
        (blur)="onBlur()"
        (input)="onInput($event.target.value)"
        (keyup.enter)="enter.emit()"
        [attr.aria-invalid]="isInvalid() ? 'true' : null"
        [attr.aria-required]="isRequired() ? 'true' : null"
        [attr.aria-describedby]="ariaDescribedby()"
      />

      <label
        [attr.for]="id"
        [ngClass]="activeLabel()
          ? ['m-floating-label--active', labelClass, darkLabelClass]
          : ['m-floating-label--inactive']"
        class="m-floating-label m-floating-label-blocker"
      >
        {{ label }}
      </label>

      <div
        class="mt-1 min-h-5 flex items-center gap-3 text-sm text-light-error relative z-10"
        [ngClass]="[darkTextErrorClass]"
        role="status"
        aria-live="polite"
      >
        <span>{{ getCurrentError() }}</span>

        @if (ngControl?.pending) {
          <div class="text-light-on-surface-secondary dark:text-slate-200">
            <m-classic-spinner [size]="15" />
          </div>
        }
      </div>
    </div>
  `
})
export class FloatingInputComponent implements ControlValueAccessor, OnInit {
  // ===== Inputs / Outputs
  @Input() label!: string;
  @Input() id = `fi-${Math.random().toString(36).slice(2)}`;
  @Input() type: 'text' | 'email' | 'password' | 'tel' = 'text';
  @Input() autocomplete?: string;
  @Input() errors: ErrorMap = {};             // es: { required: 'Obbligatorio', email: 'Formato non valido' }
  @Input() serverError: string | null = null; // es: "Password errata"
  @Input() asyncVerify = false;
  @Input() describedById?: string;

  @Input() bgClass = 'bg-light-surface-main';
  @Input() darkBgClass = 'dark:bg-neutral-950';
  @Input() labelClass = 'text-light-accent-secondary';
  @Input() darkLabelClass = 'dark:text-dark-accent-secondary-hc';
  @Input() darkFocusRingClass = 'dark:focus:ring-dark-accent-primary-btn-hc';
  @Input() darkFocusBorderClass = 'dark:focus:border-dark-accent-primary-btn-hc';
  @Input() darkTextErrorClass = 'dark:text-dark-error';

  @Output() enter = new EventEmitter<void>();

  @ViewChild('inp') inp!: ElementRef<HTMLInputElement>;

  // ===== NgControl binding
  protected readonly ngControl = inject(NgControl, { self: true, optional: true });
  get control(): FormControl | null {
    return (this.ngControl?.control as FormControl) ?? null;
  }

  constructor() {
    // registra questo componente come value accessor del control padre
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  ngOnInit(): void {
    // no-op; validation visibility is driven by user interaction
  }

  // ===== Signals interni
  value = signal<string>('');
  focused = signal<boolean>(false);
  disabled = false;

  empty = computed(() => this.value().trim() === '');
  activeLabel = computed(() => this.focused() || !this.empty());

  // ===== CVA
  private onChange: (v: any) => void = () => { };
  private onTouched: () => void = () => { };

  writeValue(v: any): void {
    this.value.set(v ?? '');
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  // ===== Event handlers
  onInput(v: string): void {
    this.value.set(v);
    this.onChange(v);
  }

  onBlur(): void {
    this.focused.set(false);
    this.onTouched();
  }

  // ===== Error & A11y helpers
  isInvalid(): boolean {
    const c = this.control;
    return !!(c && c.touched && c.invalid);
  }

  isRequired(): boolean {
    const c = this.control;
    return !!(
      c &&
      (c.hasError('required') ||
        (c.validator?.({} as any) as any)?.['required'])
    );
  }

  getCurrentError(): string {
    if (this.serverError) return this.serverError;

    const c = this.control;
    if (!c || !c.touched || !c.errors) return '';

    const key = Object.keys(c.errors)[0];
    return this.errors[key] ?? '';
  }

  ariaDescribedby(): string | null {
    const err = this.getCurrentError();
    if (err) return this.describedById ?? `${this.id}-error`;
    return this.describedById ?? null;
  }

  // helper opzionale se vuoi focus programmatico
  focus(): void {
    this.inp?.nativeElement?.focus();
  }
}
