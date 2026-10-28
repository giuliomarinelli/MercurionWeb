import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'
import { DatePipe } from '@angular/common'
import type { UserNotificationDTO } from '@mercurion/rest-contracts'
import { ButtonComponent } from '../common/button/button.component'
import { notificationCategoryLabel } from './notification-presentation'

@Component({
  selector: 'm-notification-list-item',
  imports: [DatePipe, ButtonComponent],
  host: { class: 'block min-w-0' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article
      class="flex min-h-56 min-w-0 flex-col rounded-token-surface border border-token-border/50 bg-surface-elevated p-4 transition-colors sm:p-5"
      [class.border-light-accent-primary-hc]="selected()"
      [class.dark:border-dark-accent-primary]="selected()"
    >
      <div
        class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-on-surface-secondary"
      >
        <span class="min-w-0 font-medium [overflow-wrap:anywhere]">{{
          categoryLabel(notification().category)
        }}</span>
        <time [attr.datetime]="notification().createdAt">{{
          notification().createdAt | date: 'dd/MM/yyyy, HH:mm'
        }}</time>
      </div>
      <h2 class="mt-2 min-w-0 text-base font-semibold leading-6">
        <button
          type="button"
          class="min-h-12 w-full cursor-pointer rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-token-focus"
          [attr.data-notification-open]="notification().id"
          [attr.aria-current]="selected() ? 'true' : null"
          (click)="opened.emit(notification())"
        >
          <span class="line-clamp-2 [overflow-wrap:anywhere]">{{ notification().title }}</span>
        </button>
      </h2>
      <p class="mt-1 min-h-10 min-w-0 text-sm leading-5 text-on-surface-secondary">
        <span class="line-clamp-2 [overflow-wrap:anywhere]">{{ notification().summary }}</span>
      </p>
      <div
        class="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-token-border/40 pt-3"
      >
        <span class="inline-flex items-center gap-2 text-xs font-medium">
          @if (!notification().readAt) {
            <span
              class="size-1.5 rounded-full bg-light-accent-primary-hc dark:bg-dark-accent-primary"
              aria-hidden="true"
            ></span>
          }
          {{ notification().readAt ? 'Letta' : 'Non letta' }}
        </span>
        <div class="flex flex-wrap gap-1">
          <m-button
            variant="ghost"
            size="sm"
            [disabled]="pending()"
            (pressed)="
              readChanged.emit({ notification: notification(), read: !!notification().readAt })
            "
          >
            {{ notification().readAt ? 'Segna non letta' : 'Segna letta' }}
          </m-button>
          <m-button
            variant="ghost"
            size="sm"
            [disabled]="pending()"
            class="[&_button]:text-light-error dark:[&_button]:text-dark-error-hc"
            (pressed)="dismissed.emit(notification())"
            >Elimina</m-button
          >
        </div>
      </div>
    </article>
  `,
})
export class NotificationListItemComponent {
  readonly notification = input.required<UserNotificationDTO>()
  readonly selected = input(false)
  readonly pending = input(false)
  readonly opened = output<UserNotificationDTO>()
  readonly dismissed = output<UserNotificationDTO>()
  readonly readChanged = output<{ notification: UserNotificationDTO; read: boolean }>()
  protected readonly categoryLabel = notificationCategoryLabel
}
