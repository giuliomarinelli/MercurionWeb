import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, model, signal } from '@angular/core'
import { injectBrowserResourceOwner } from '../../../utils/browser-resource-owner.util'

@Component({
  selector: 'm-star-rating',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(keydown)': 'onKeydown($event)' },
  template: `
    <div class="flex flex-wrap items-center gap-2">
      <div class="inline-flex shrink-0 items-center gap-1" role="radiogroup" [attr.aria-label]="label()" [attr.aria-disabled]="disabled()">
        @for (star of stars(); track $index) {
          <button type="button" role="radio" class="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-light-accent-primary-hq disabled:cursor-default disabled:opacity-60"
            [disabled]="disabled()" [attr.aria-checked]="value() === $index + 1"
            [attr.aria-label]="($index + 1) + ' su ' + max() + ': ' + label()"
            [attr.tabindex]="(value() ?? 1) === $index + 1 ? 0 : -1"
            (mouseenter)="onHover($index + 1)" (mouseleave)="onLeave()" (click)="set($index + 1)">
            <span class="relative inline-block size-8">
              <span class="absolute inset-0 text-slate-500 dark:text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current" aria-hidden="true">
                <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                <path d="M320.2 11.2L227.6 192.6L26.5 224.6L170.4 368.7L138.7 569.9L320.2 477.6L501.7 569.9L470 368.7L613.9 224.6L412.8 192.6L320.2 11.2z"/>
              </svg>
              </span>
              <span class="absolute inset-0 overflow-hidden text-light-accent-primary-hc transition-[width,transform] duration-150 ease-out dark:text-sky-300 motion-reduce:transform-none motion-reduce:transition-none"
                [style.width.%]="fillPercentFor($index)" [class.scale-125]="$index === poppedIndex()">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current" aria-hidden="true">
                <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                <path d="M320.2 11.2L227.6 192.6L26.5 224.6L170.4 368.7L138.7 569.9L320.2 477.6L501.7 569.9L470 368.7L613.9 224.6L412.8 192.6L320.2 11.2z"/>
              </svg>
              </span>
            </span>
          </button>
        }
      </div>
      @if (allowClear()) {
        <button type="button" class="size-11 shrink-0 cursor-pointer rounded-lg border border-token-border text-xl text-on-surface-secondary outline-none hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-light-accent-primary-hq disabled:cursor-default disabled:opacity-40"
          [attr.aria-label]="'Rimuovi valutazione: ' + label()" [disabled]="disabled() || value() === null" (click)="clear()">×</button>
      }
    </div>
  `,
})
export class StarRatingComponent {
  readonly label = input('Valutazione')
  readonly max = input(5)
  readonly disabled = input(false)
  readonly allowClear = input(true)
  readonly value = model<number | null>(null)
  readonly hovered = signal<number | null>(null)
  readonly poppedIndex = signal<number | null>(null)
  readonly stars = computed(() => Array.from({ length: this.max() }))
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef)
  private readonly resources = injectBrowserResourceOwner()
  private popTimer?: ReturnType<typeof setTimeout>

  onHover(value: number): void {
    if (!this.disabled()) this.hovered.set(value)
  }

  onLeave(): void {
    this.hovered.set(null)
  }

  set(value: number): void {
    if (this.disabled() || !Number.isInteger(value) || value < 1 || value > this.max()) return
    this.value.set(value)
    this.hovered.set(null)
    this.poppedIndex.set(value - 1)
    this.resources.clearTimeout(this.popTimer)
    this.popTimer = this.resources.setTimeout(() => {
      this.poppedIndex.set(null)
    }, 170)
  }

  clear(): void {
    if (this.disabled() || !this.allowClear()) return
    this.value.set(null)
    this.hovered.set(null)
    this.poppedIndex.set(null)
  }

  fillPercentFor(index: number): number {
    return (this.hovered() ?? this.value() ?? 0) >= index + 1 ? 100 : 0
  }

  onKeydown(event: KeyboardEvent): void {
    if (this.disabled() || !(event.target instanceof HTMLElement) || event.target.getAttribute('role') !== 'radio') return
    const current = this.value() ?? 0
    let next: number
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        next = Math.min(this.max(), current + 1)
        break
      case 'ArrowLeft':
      case 'ArrowDown':
        next = Math.max(1, current - 1)
        break
      case 'Home':
        next = 1
        break
      case 'End':
        next = this.max()
        break
      case 'Delete':
      case 'Backspace':
        event.preventDefault()
        this.clear()
        this.element.nativeElement.querySelector<HTMLButtonElement>('[role="radio"]')?.focus()
        return
      default: return
    }
    event.preventDefault()
    this.set(next)
    this.element.nativeElement.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next - 1]?.focus()
  }
}
