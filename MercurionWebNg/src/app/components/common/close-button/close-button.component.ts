import { NgClass } from '@angular/common';
import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy, OnInit } from '@angular/core';

@Component({
  selector: 'm-close-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass],
  template: `

    <button
      class="inline-flex items-center justify-center size-8 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-transparent transition"
      type="button"
      (click)="onClick()"
      [attr.aria-label]="ariaLabel"
      [attr.aria-labelledby]="ariaLabelledby ?? null"
      [attr.aria-describedby]="ariaDescribedby ?? null"
      [attr.aria-disabled]="disabled"
      [attr.tabindex]="disabled ? -1 : 0"
      [disabled]="disabled"
      [attr.aria-hidden]="ariaHidden"
      [ngClass]="[sizeClass, accentClass]"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current"
           [ngClass]="[
             sizeClass
           ]">
        <path d="M182.9 137.4L160.3 114.7L115 160L137.6 182.6L275 320L137.6 457.4L115 480L160.3 525.3L182.9 502.6L320.3 365.3L457.6 502.6L480.3 525.3L525.5 480L502.9 457.4L365.5 320L502.9 182.6L525.5 160L480.3 114.7L457.6 137.4L320.3 274.7L182.9 137.4z"/>
      </svg>
    </button>

  `
})
export class CloseButtonComponent implements OnInit {

  @Input({ required: true })
  action?: () => void

  @Input()
  size = 5

  @Input()
  variant: 'default' | 'input' = 'default'

  @Input()
  ariaLabel = 'Chiudi'

  @Input()
  ariaLabelledby?: string

  @Input()
  ariaDescribedby?: string

  @Input()
  ariaHidden = false

  @Input()
  disabled = false

  @Output()
  clicked = new EventEmitter<void>()

  sizeClass!: string

  get accentClass(): string {
    if (this.variant === 'input') {
      return 'hover:text-light-accent-primary-hq dark:hover:text-indigo-300 focus:ring-light-accent-primary-hq dark:focus:ring-indigo-500'
    }
    return 'hover:text-light-accent-primary-hq focus:ring-light-accent-primary-hq'
  }

  ngOnInit(): void {
    this.sizeClass = `size-${this.size}`
  }

  onClick(): void {
    this.action?.()
    this.clicked.emit()
  }
}
