import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'pm-search-input',
  template: `
    <div class="relative w-[240px] mr-2">
      <svg
        class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
        xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" aria-hidden="true">
        <path
          d="M505 442.7L405.3 343c28.4-34.9 45.5-79 45.5-127.3C450.8 103.5 347.3 0 225.4 0S0 103.5 0 215.6s103.5 215.6 225.4 215.6c48.3 0 92.4-17.1 127.3-45.5l99.7 99.7c4.6 4.6 10.6 7 16.7 7s12.1-2.3 16.7-7c9.3-9.2 9.3-24.4 0-33.7zM225.4 367c-83.5 0-151.4-67.9-151.4-151.4s67.9-151.4 151.4-151.4 151.4 67.9 151.4 151.4-67.9 151.4-151.4 151.4z"/>
      </svg>

      <input
        #inputEl
        type="text"
        [value]="value"
        (input)="onInput($event)"
        (focus)="openRequested.emit()"
        (keydown.enter)="onEnter()"
        [placeholder]="placeholder"
        [disabled]="disabled"
        class="pl-8 pr-8 py-2 w-full text-sm text-slate-800 dark:text-slate-200
               bg-slate-100 dark:bg-neutral-800
               border border-slate-500/40 dark:border-none
               hover:bg-slate-200/30 dark:hover:bg-neutral-700
               rounded-full outline-none transition
               focus:ring-2 focus:ring-slate-300/60 dark:focus:ring-neutral-600/60"
        autocomplete="off"
        [attr.aria-label]="ariaLabel || placeholder"
      />

      @if ((value).length > 0) {
        <button
          type="button"
          (click)="clear()"
          class="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full
                 hover:bg-slate-200/60 dark:hover:bg-neutral-700 focus:outline-none"
          aria-label="Pulisci">
          <svg class="w-3.5 h-3.5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 352 512" aria-hidden="true">
            <path d="M242.7 256l100.1-100.1c12.3-12.3 12.3-32.2 0-44.5s-32.2-12.3-44.5 0L198.3 211.5 98.2 111.4c-12.3-12.3-32.2-12.3-44.5 0s-12.3 32.2 0 44.5L153.8 256 53.7 356.1c-12.3 12.3-12.3 32.2 0 44.5s32.2 12.3 44.5 0l100.1-100.1 100.1 100.1c12.3 12.3 32.2 12.3 44.5 0s12.3-32.2 0-44.5L242.7 256z"/>
          </svg>
        </button>
      }
    </div>
  `
})
export class PmSearchInputComponent {
  @Input() value = '';
  @Input() placeholder = 'Cerca molecola...';
  @Input() ariaLabel?: string;
  @Input() disabled = false;

  @Output() valueChange = new EventEmitter<string>();
  @Output() submitted = new EventEmitter<string>();
  @Output() cleared = new EventEmitter<void>();
  @Output() openRequested = new EventEmitter<void>();

  @ViewChild('inputEl') inputEl!: ElementRef<HTMLInputElement>;

  // ✅ tip-safe: cast nel TS, non nel template
  onInput(e: Event) {
    const v = (e.target as HTMLInputElement)?.value ?? '';
    this.valueChange.emit(v);
  }

  onEnter() {
    const current = this.inputEl?.nativeElement?.value ?? this.value ?? '';
    this.submitted.emit(current);
  }

  clear() {
    if (this.disabled) return;
    this.valueChange.emit('');
    this.cleared.emit();
    queueMicrotask(() => this.inputEl?.nativeElement?.focus());
  }
}
