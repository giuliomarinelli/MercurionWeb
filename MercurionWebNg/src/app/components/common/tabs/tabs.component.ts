import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Output,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { Breakpoint } from '../../../services/design.service';

@Component({
  selector: 'm-tabs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div
    class="relative w-full select-none"
    [class]="containerClass()"
    role="tablist"
    aria-orientation="horizontal"
  >
    <!-- Tabs -->
   @for (t of tabs(); let i = $index; track i) {
      <button

        type="button"
        role="tab"
        [attr.aria-selected]="i === activeIndex()"
        [attr.aria-controls]="'tab-panel-' + i"
        class="relative px-3 py-2 text-base font-medium transition-colors duration-150
               focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
               focus-visible:ring-[var(--tabs-primary)] focus-visible:ring-offset-transparent"
        [class]="tabClass(i)"
        (click)="onClick(i)"
      >
        {{ t }}

        <!-- Column mode: underline on active tab -->
        <span
          class="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 transition-opacity duration-200
                 bg-[var(--tabs-primary)]"
          [class.opacity-100]="i === activeIndex()"
          [class.hidden]="isRow()"
        ></span>
      </button>
    }

    <!-- Sliding indicator (row mode only) -->
    <div
      class="absolute bottom-0 h-0.5 bg-[var(--tabs-primary)]
             transition-transform duration-200 ease-out"
      [class.hidden]="!isRow()"
      [style.width.%]="indicatorWidth()"
      [style.transform]="indicatorTransform()"
    ></div>
  </div>
  `,
  styles: [`
    :host {
      --tabs-primary: var(--tabs-primary-light);
      --tabs-primary-light: #000; /* fallback */
      --tabs-primary-dark: #000;  /* fallback */
    }
    @media (prefers-color-scheme: dark) {
      :host { --tabs-primary: var(--tabs-primary-dark); }
    }
  `]
})
export class TabsComponent {
  private readonly hostEl = inject(ElementRef<HTMLElement>).nativeElement;

  // signal-inputs
  tabs = input<string[]>([])
  activeIndex = input<number>(0)

  primaryLight = input<string>('light-accent-primary')
  primaryDark = input<string>('dark-accent-primary')

  stackAt = input<Breakpoint>('sm')

  @Output() tabChange = new EventEmitter<number>()

  // ---- layout ----
  containerClass = computed(() => {
    const bp = this.stackAt();
    return `flex flex-col ${bp}:flex-row gap-1 border-b border-neutral-200/70 dark:border-neutral-700/60`
  });

  // qui lasciamo Tailwind decidere il layout reale.
  // usiamo solo per nascondere/mostrare indicator.
  // Se vuoi detection reale via matchMedia, lo aggiungiamo dopo.
  isRow = computed(() => this.stackAt() === '0')

  // ---- indicator ----
  indicatorWidth = computed(() => {
    const n = Math.max(1, this.tabs().length)
    return 100 / n;
  });

  indicatorTransform = computed(() => {
    const w = this.indicatorWidth()
    const x = w * this.activeIndex()
    return `translateX(${x}%)`
  });

  // ---- effects ----
  private readonly colorEffect = effect(() => {
    const light = this.primaryLight()
    const dark = this.primaryDark()

    // assumiamo che i tuoi colori siano CSS vars globali tipo:
    // --light-accent-primary / --dark-accent-primary
    this.hostEl.style.setProperty('--tabs-primary-light', `var(--${light})`)
    this.hostEl.style.setProperty('--tabs-primary-dark', `var(--${dark})`)
  })

  tabClass(i: number): string {
    const active = i === this.activeIndex();
    return [
      active
        ? `text-[var(--tabs-primary)]`
        : `text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white`,
      active ? 'font-semibold' : 'font-medium',
      'rounded-md',
    ].join(' ')
  }

  onClick(i: number) {
    if (i === this.activeIndex()) {
      return
    }
    this.tabChange.emit(i)
  }
}
