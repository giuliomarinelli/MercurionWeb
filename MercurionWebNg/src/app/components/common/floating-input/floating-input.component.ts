import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, inject, signal, computed, OnDestroy } from '@angular/core';
import { ControlValueAccessor, NgControl, ReactiveFormsModule, FormControl } from '@angular/forms';
import { ClassicSpinnerComponent } from '../classic-spinner/classic-spinner.component';
import { Subscription } from 'rxjs';

type ErrorMap = Record<string, string>;

@Component({
  selector: 'app-floating-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ClassicSpinnerComponent],
  template: `
  <div class="relative">
    <input
      #inp
      [type]="type"
      class="block py-4 px-4 w-full text-sm text-dark dark:text-light bg-transparent border border-slate-400 dark:border-slate-200 rounded-md transition duration-300
             focus:outline-none focus:ring-2 focus:ring-light-accent-primary dark:focus:ring-dark-accent-primary
             focus:border-light-accent-primary dark:focus:border-dark-accent-primary"
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
    />

    <label
      [attr.for]="id"
      [ngClass]="{
        'text-light-accent-secondary dark:text-dark-accent-secondary/90 scale-110 -translate-y-6 text-sm': activeLabel(),
        'dark:text-slate-400 text-slate-500 text-lg scale-100 translate-y-0 cursor-text': !activeLabel()
      }"
      class="absolute transition-all duration-300 bg-light-surface-main dark:bg-neutral-950 px-1 top-[13px] left-4 origin-[0]">
      {{ label }}
    </label>

    <div class="flex items-center gap-3 text-sm text-light-error dark:text-dark-error mt-1 min-h-5">
      <span>{{ getCurrentError() }}</span>
      @if (ngControl?.pending) {
        <div class="text-light-on-surface-secondary dark:text-slate-200">
          <app-classic-spinner [size]="15" />
        </div>
      }
    </div>
  </div>
  `
})
export class FloatingInputComponent implements ControlValueAccessor, OnDestroy {
  // ===== Inputs / Outputs
  @Input() label!: string;
  @Input() id = `fi-${Math.random().toString(36).slice(2)}`;
  @Input() type: 'text' | 'email' | 'password' = 'text';
  @Input() autocomplete?: string;
  @Input() errors: ErrorMap = {};              // es: { required: 'Obbligatorio', email: 'Formato non valido' }
  @Input() serverError: string | null = null;  // es: "Password errata"
  @Input() asyncVerify = false
  @Output() enter = new EventEmitter<void>();

  private sub?: Subscription

  @ViewChild('inp') inp!: ElementRef<HTMLInputElement>;

  // ===== NgControl binding (fondamentale per validazione)
  protected readonly ngControl = inject(NgControl, { self: true, optional: true });
  get control(): FormControl | null { return (this.ngControl?.control as FormControl) ?? null; }

  constructor() {
    // registra questo componente come value accessor del control padre
    if (this.ngControl) this.ngControl.valueAccessor = this;
    if (this.asyncVerify) {
        this.ngControl?.control?.markAsDirty()
        this.ngControl?.control?.markAsTouched()
    }
  }

  // ===== Signals interni (come chiedi tu)
  value = signal<string>('');
  focused = signal<boolean>(false);
  disabled = false;

  empty = computed(() => this.value().trim() === '');
  activeLabel = computed(() => this.focused() || !this.empty());

  // ===== CVA
  private onChange: (v: any) => void = () => { };
  private onTouched: () => void = () => { };

  writeValue(v: any): void { this.value.set(v ?? ''); }
  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.disabled = isDisabled; }

  onInput(v: string) { this.value.set(v); this.onChange(v); }
  onBlur() { this.focused.set(false); this.onTouched(); }

  // ===== Error & A11y helpers
  isInvalid(): boolean {
    const c = this.control;
    return !!(c && c.touched && c.invalid);
  }
  isRequired(): boolean {
    const c = this.control;
    // Angular non espone un flag ufficiale; inferenza sugli errori/validatori è best-effort.
    return !!(c && (c.hasError('required') || (c.validator?.({} as any) as any)?.['required']));
  }
  getCurrentError(): string {
    if (this.serverError) return this.serverError;
    const c = this.control;
    if (!c || !c.touched || !c.errors) return '';
    const key = Object.keys(c.errors)[0];
    return this.errors[key] ?? '';
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe()
  }


}
