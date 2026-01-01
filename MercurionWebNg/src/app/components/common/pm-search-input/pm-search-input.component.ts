import { NgClass } from '@angular/common';
import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  OnDestroy
} from '@angular/core';

@Component({
  selector: 'm-search-input',
  imports: [NgClass],
  template: `
    <div class="relative w-[240px] mr-2">
      <svg
        class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700 dark:text-slate-200 pointer-events-none fill-current"
        xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" aria-hidden="true">
        <path
          d="M505 442.7L405.3 343c28.4-34.9 45.5-79 45.5-127.3C450.8 103.5 347.3 0 225.4 0S0 103.5 0 215.6s103.5 215.6 225.4 215.6c48.3 0 92.4-17.1 127.3-45.5l99.7 99.7c4.6 4.6 10.6 7 16.7 7s12.1-2.3 16.7-7c9.3-9.2 9.3-24.4 0-33.7zM225.4 367c-83.5 0-151.4-67.9-151.4-151.4s67.9-151.4 151.4-151.4 151.4 67.9 151.4 151.4-67.9 151.4-151.4 151.4z"/>
      </svg>

      <input
        #inputEl
        type="text"
        [value]="value"
        (input)="onInput($event)"
        (keydown)="onKeydown($event)"
        (focus)="openRequested.emit()"
        [placeholder]="placeholder"
        [disabled]="disabled"
        class="pl-10 pr-8 py-[10px] w-full text-sm text-slate-800 dark:text-slate-200
               bg-slate-100
               border border-slate-500/40
               hover:bg-slate-200/30
               rounded-full outline-none transition
               focus:ring-2 focus:ring-slate-300/60"
        [ngClass]="darkInputClasses"
        autocomplete="off"
        [attr.aria-label]="ariaLabel || placeholder"
        [attr.aria-disabled]="disabled"
      />

      @if (value.length > 0) {
        <button
          type="button"
          (click)="clear()"
          class="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full
                 hover:bg-slate-200/60 focus:outline-none z-10"
          [ngClass]="clearButtonDarkClasses"
          aria-label="Pulisci">
          <svg class="w-3.5 h-3.5 text-slate-700 dark:text-slate-200 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 352 512" aria-hidden="true">
            <path d="M242.7 256l100.1-100.1c12.3-12.3 12.3-32.2 0-44.5s-32.2-12.3-44.5 0L198.3 211.5 98.2 111.4c-12.3-12.3-32.2-12.3-44.5 0s-12.3 32.2 0 44.5L153.8 256 53.7 356.1c-12.3 12.3-12.3 32.2 0 44.5s32.2 12.3 44.5 0l100.1-100.1 100.1 100.1c12.3 12.3 32.2 12.3 44.5 0s12.3-32.2 0-44.5L242.7 256z"/>
          </svg>
        </button>
      }
    </div>
  `
})
export class PmSearchInputComponent implements OnDestroy {
  @Input() value = '';
  @Input() placeholder = 'Cerca molecola...';
  @Input() ariaLabel?: string;
  @Input() disabled = false;
  @Input() borderDark = true;
  @Input() useAltDarkStyle = false;

  /** durata debounce in ms (analogo a debounceTime) */
  @Input() debounceMs = 200;

  @Output() valueChange = new EventEmitter<string>();
  @Output() submitted = new EventEmitter<string>();
  @Output() cleared = new EventEmitter<void>();
  @Output() openRequested = new EventEmitter<void>();

  @ViewChild('inputEl') inputEl!: ElementRef<HTMLInputElement>;

  private debounceId: number | null = null;
  private lastEmittedValue = '';

  ngOnDestroy(): void {
    this.clearDebounce();
  }

  private clearDebounce() {
    if (this.debounceId !== null) {
      clearTimeout(this.debounceId);
      this.debounceId = null;
    }
  }

  onKeydown(event: KeyboardEvent) {
    if (this.disabled) return;

    // sempre: annulla il timer in corso
    this.clearDebounce();

    // Enter = "submit immediato" (nessun debounce)
    if (event.key === 'Enter') {
      this.onEnter();
    }
  }

  onInput(e: Event) {
    if (this.disabled) return;
    const v = (e.target as HTMLInputElement)?.value ?? '';

    // nuovo valore ⇒ riparti con il debounce
    this.clearDebounce();
    this.debounceId = window.setTimeout(() => {
      if (this.disabled) return;
      if (v === this.lastEmittedValue) return;
      this.lastEmittedValue = v;
      this.valueChange.emit(v);
    }, this.debounceMs);
  }

  onEnter() {
    if (this.disabled) return;
    this.clearDebounce();

    const current = this.inputEl?.nativeElement?.value ?? this.value ?? '';
    this.lastEmittedValue = current;

    // come una search "forzata": invio immediato
    this.submitted.emit(current);
    this.valueChange.emit(current);
  }

  clear() {
    if (this.disabled) return;
    this.clearDebounce();

    this.lastEmittedValue = '';
    this.valueChange.emit('');
    this.cleared.emit();

    queueMicrotask(() => this.inputEl?.nativeElement?.focus());
  }

  get darkInputClasses() {
    if (this.useAltDarkStyle) {
      return {
        'dark:bg-dark-surface-secondary': true,
        'dark:text-slate-200': true,
        'dark:hover:bg-dark-surface-secondary/80': true,
        'dark:focus:ring-slate-400/70': true,
        'dark:border-dark-border/80': this.borderDark,
        'dark:border-none': !this.borderDark,
      };
    }
    return {
      'dark:bg-neutral-800': true,
      'dark:text-slate-200': true,
      'dark:hover:bg-neutral-700': true,
      'dark:focus:ring-neutral-600/60': true,
      'dark:border-none': !this.borderDark,
      'dark:border-neutral-600/60': !this.borderDark,
    };
  }

  get clearButtonDarkClasses() {
    return this.useAltDarkStyle
      ? 'dark:hover:bg-dark-surface-secondary/70'
      : 'dark:hover:bg-neutral-700';
  }
}
