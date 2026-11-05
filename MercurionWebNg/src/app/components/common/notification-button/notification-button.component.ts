import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  NgZone,
  output,
  signal,
  untracked,
} from '@angular/core'
import { IconButtonComponent } from '../icon-button/icon-button.component'
import { injectBrowserResourceOwner } from '../../../utils/browser-resource-owner.util'

@Component({
  selector: 'm-notification-button',
  imports: [IconButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <m-icon-button
      icon="custom"
      variant="ghost"
      size="md"
      [ariaLabel]="label()"
      (pressed)="pressed.emit()"
    >
      <span class="relative inline-flex">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 640 640"
          class="fill-current size-6 scale-125"
        >
          <!--!Font Awesome Pro v7.3.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2026 Fonticons, Inc.-->
          <path
            d="M352 64L288 64L288 99.2C215 114 160 178.6 160 256L160 352L80 480L560 480L480 352L480 256C480 178.6 425 114 352 99.2L352 64zM258 528C265.1 555.6 290.2 576 320 576C349.8 576 374.9 555.6 382 528L258 528z"
          />
        </svg>
        @if (badgeMounted()) {
          <span
            class="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full border border-white bg-light-error px-1 text-[10px] font-bold leading-none text-white transition-opacity duration-350 ease-in-out motion-reduce:transition-none dark:border-slate-900 dark:bg-dark-error dark:text-neutral-950"
            [class.opacity-0]="!badgeVisible()"
            [class.opacity-100]="badgeVisible()"
            data-notification-badge
            aria-hidden="true"
          >
            {{ displayedCount() > 99 ? '99+' : displayedCount() }}
          </span>
        }
      </span>
    </m-icon-button>
  `,
})
export class NotificationButtonComponent {
  readonly unreadCount = input.required<number>()
  readonly pressed = output<void>()
  protected readonly badgeMounted = signal(false)
  protected readonly badgeVisible = signal(false)
  protected readonly displayedCount = signal(0)
  private readonly resources = injectBrowserResourceOwner()
  private readonly zone = inject(NgZone)
  protected readonly label = computed(() =>
    this.unreadCount() > 0
      ? `Notifiche: ${this.unreadCount()} ${this.unreadCount() === 1 ? 'non letta' : 'non lette'}`
      : 'Notifiche'
  )

  constructor() {
    effect((onCleanup) => {
      const count = this.unreadCount()
      let firstFrame: number | undefined
      let secondFrame: number | undefined
      let hideTimer: ReturnType<typeof setTimeout> | undefined
      untracked(() =>
        this.zone.runOutsideAngular(() => {
          if (count > 0) {
            this.displayedCount.set(count)
            if (this.badgeMounted()) {
              // A new count cancels an in-progress fade-out on the same element.
              this.badgeVisible.set(true)
            } else {
              this.badgeVisible.set(false)
              this.badgeMounted.set(true)
              firstFrame = this.resources.requestAnimationFrame(() => {
                secondFrame = this.resources.requestAnimationFrame(() =>
                  this.badgeVisible.set(true)
                )
              })
            }
          } else if (this.badgeMounted()) {
            this.badgeVisible.set(false)
            // Keep the previous count until its 350 ms fade has completed.
            hideTimer = this.resources.setTimeout(() => {
              if (this.unreadCount() === 0) this.badgeMounted.set(false)
            }, 400)
          }
        })
      )
      onCleanup(() => {
        this.resources.cancelAnimationFrame(firstFrame)
        this.resources.cancelAnimationFrame(secondFrame)
        this.resources.clearTimeout(hideTimer)
      })
    })
  }
}
