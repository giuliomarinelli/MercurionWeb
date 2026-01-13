import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  input,
  model,
  signal
} from '@angular/core'

@Component({
  selector: 'm-star-rating',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="inline-flex items-center gap-1 select-none outline-none focus-visible:ring-2 focus-visible:ring-light-accent-primary-hq/70 dark:focus-visible:ring-sky-300/60 focus-visible:rounded-xl focus-visible:px-2 focus-visible:py-1"
      role="slider"
      [attr.aria-label]="label()"
      [attr.aria-valuemin]="1"
      [attr.aria-valuemax]="max()"
      [attr.aria-valuenow]="value() ?? 0"
      [attr.tabindex]="disabled() ? -1 : 0"
      [class.opacity-60]="disabled()"
      (mouseleave)="onLeave()"
    >
      @for (s of stars(); track $index) {
        <button
          type="button"
          class="p-0 bg-transparent border-0 cursor-pointer disabled:cursor-default leading-none"
          [disabled]="disabled()"
          [attr.aria-label]="'Rate ' + ($index + 1)"
          (mouseenter)="onHover($index + 1)"
          (click)="set($index + 1)"
        >
          <span class="relative inline-block max-[348px]:w-[1.5rem] max-[348px]:h-[1.5rem] max-[348px]:text-[1.5rem] w-[2rem] h-[2rem] text-[2rem]">
            <span class="absolute inset-0 text-slate-500/60 dark:text-slate-400/40">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current">
                <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                <path d="M320.2 11.2L227.6 192.6L26.5 224.6L170.4 368.7L138.7 569.9L320.2 477.6L501.7 569.9L470 368.7L613.9 224.6L412.8 192.6L320.2 11.2z"/>
              </svg>
            </span>

            <span
              class="absolute inset-0 overflow-hidden text-light-accent-primary-hc dark:text-sky-300 drop-shadow-[0_0_10px_rgba(56,189,248,0.18)] transition-[width,transform,filter] duration-150 ease-out origin-[50%_60%]"
              [style.width.%]="fillPercentFor($index)"
              [class.scale-125]="$index === poppedIndex()"
              [class.drop-shadow-[0_0_18px_rgba(56,189,248,0.38)]]="$index === poppedIndex()"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current">
                <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                <path d="M320.2 11.2L227.6 192.6L26.5 224.6L170.4 368.7L138.7 569.9L320.2 477.6L501.7 569.9L470 368.7L613.9 224.6L412.8 192.6L320.2 11.2z"/>
              </svg>
            </span>
          </span>
        </button>
      }

      @if (allowClear() && !disabled() && (value() ?? 0) > 0) {
        <button
          type="button"
          class="ml-3 w-[22px] h-[22px] rounded-lg border border-slate-600 bg-zinc-200/80 text-slate-800 hover:bg-zinc-200/60 dark:border-slate-400/15 dark:bg-zinc-800/80 dark:text-slate-200 dark:hover:bg-zinc-700/80 transform hover:scale-110 leading-none transition-transform"
          aria-label="Clear rating"
          (click)="clear()"
        >
          ×
        </button>
      }
    </div>
  `
})
export class StarRatingComponent {

  label = input<string>('Rating')
  max = input<number>(5)
  disabled = input<boolean>(false)
  allowClear = input<boolean>(true)

  value = model<number | null>(null)

  hovered = signal<number | null>(null)
  poppedIndex = signal<number | null>(null)

  stars = computed(() => Array.from({ length: this.max() }))

  onHover(v: number) {
    if (this.disabled()) return
    this.hovered.set(v)
  }

  onLeave() {
    this.hovered.set(null)
  }

  set(v: number) {
    if (this.disabled()) return
    this.value.set(v)

    this.poppedIndex.set(v - 1)
    setTimeout(() => {
      this.poppedIndex.set(null)
    }, 170)
  }

  clear() {
    if (this.disabled()) {
      return
    }
    this.value.set(null)
  }

  fillPercentFor(index: number): number {
    const active = this.hovered() ?? this.value() ?? 0
    return active >= index + 1 ? 100 : 0
  }

  @HostListener('keydown', ['$event'])
  onKeydown(e: KeyboardEvent) {

    if (this.disabled()) {
      return
    }

    const current = this.value() ?? 0

    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      const next = Math.min(this.max(), current + 1)
      this.set(next)
    }

    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      const next = Math.max(0, current - 1)
      next === 0 ? this.clear() : this.set(next)
    }

    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault()
      this.clear()
    }
  }
}
