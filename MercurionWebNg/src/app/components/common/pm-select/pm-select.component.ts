import { Component, Input, HostListener, ElementRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface PmOption {
  label: string;
  value: string | number | boolean; // value distinto dal testo
}

@Component({
  selector: 'pm-select',
  standalone: true,
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: PmSelectComponent,
    multi: true
  }],
  // id sull'HOST (così il listener lo vede)
  host: { '[attr.id]': 'id' },
  template: `
    <div class="flex justify-center mx-auto max-w-[500px]">
      <div class="w-full relative">
        @if (label) {
          <label [attr.for]="id + '-btn'"
                 class="block ml-[2px] mb-2 text-base text-light-accent-secondary dark:text-dark-accent-secondary/90">
            {{ label }}
          </label>
        }

        <!-- bottone che replica lo stile del select chiuso -->
        <button
          [id]="id + '-btn'"
          type="button"
          [attr.aria-haspopup]="'listbox'"
          [attr.aria-expanded]="opened"
          [disabled]="disabled"
          (click)="toggle()"
          (keydown)="onKey($event)"
          class="relative w-full appearance-none text-lg text-slate-600 outline outline-1 -outline-offset-1
                 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2
                focus-visible:outline-light-accent-primary dark:bg-transparent dark:text-slate-400
                dark:focus-visible:outline-dark-accent-primary
                 hover:bg-slate-200/60 dark:hover:bg-neutral-800/50
                 block p-4 border border-slate-300 dark:border-slate-200 rounded-md transition duration-300
                 focus:outline-none focus:ring-2 focus:ring-light-accent-primary dark:focus:ring-dark-accent-primary
                 focus:border-light-accent-primary dark:focus:border-dark-accent-primary cursor-pointer
                 text-left pr-10">
          <span>{{ currentLabel || placeholder }}</span>

            <!-- Freccia -->

          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"
               class="fill-current pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5
                      text-slate-600 dark:text-slate-200">
            <path d="M536 224L320 456L104 224L536 224z"/>
          </svg>
        </button>

        @if (opened) {
          <ul role="listbox"
              class="absolute left-0 z-50 mt-2 w-full rounded-md border border-slate-400 dark:border-slate-200
                    bg-slate-100 dark:bg-neutral-800 shadow-lg max-h-60 overflow-auto">
            @for (o of options; let i = $index; track i) {
              @if (o.label) {
                <li role="option"
                    [attr.aria-selected]="o.value === value"
                    (click)="choose(i)"
                    class="px-4 py-3 cursor-pointer text-lg dark:text-slate-200
                          hover:bg-slate-300/45 dark:hover:bg-slate-700/40 transition"
                    [class.bg-slate-300/35]="i === highlighted"
                    [class.dark:bg-slate-700/80]="i === highlighted">
                  {{ o.label }}
                </li>
              }
            }
          </ul>
        }
      </div>
    </div>

  `
})
export class PmSelectComponent implements ControlValueAccessor {
  constructor(private el: ElementRef<HTMLElement>) {}

  @Input() id = 'pm-select';
  @Input() label = '';
  @Input() placeholder = 'Seleziona…';
  @Input() options: PmOption[] = [];
  @Input() disabled = false;

  opened = false;
  value: PmOption['value'] | null = null;
  highlighted = -1;

  private onChange = (_: any) => {};
  private onTouched = () => {};

  get currentLabel(): string {
    return this.options.find(o => o.value === this.value)?.label ?? '';
  }

  writeValue(v: any) { this.value = v; }
  registerOnChange(fn: any) { this.onChange = fn; }
  registerOnTouched(fn: any) { this.onTouched = fn; }
  setDisabledState(d: boolean) { this.disabled = d; }

  toggle() {
    if (this.disabled) return;
    this.opened = !this.opened;
    if (this.opened) {
      const idx = this.options.findIndex(o => o.value === this.value);
      this.highlighted = idx >= 0 ? idx : 0;
    }
  }

  choose(i: number) {
    const opt = this.options[i];
    this.value = opt.value;
    this.onChange(this.value);
    this.opened = false;
    this.onTouched();
  }

  onKey(e: KeyboardEvent) {
    if (!this.opened && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
      e.preventDefault(); this.toggle(); return;
    }
    if (!this.opened) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); this.highlighted = Math.min(this.options.length - 1, this.highlighted + 1); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); this.highlighted = Math.max(0, this.highlighted - 1); }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.choose(this.highlighted); }
    if (e.key === 'Escape') { e.preventDefault(); this.opened = false; }
  }

  // FIX: chiudi solo se il target NON è dentro il componente host
  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent) {
    const target = ev.target as Node;
    if (!this.el.nativeElement.contains(target)) {
      this.opened = false;
    }
  }
}
