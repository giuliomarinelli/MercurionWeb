import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'
import { DatePipe } from '@angular/common'
import type { UserNotificationDTO } from '@mercurion/rest-contracts'

@Component({
  selector: 'm-notification-list-item',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article
      class="rounded-lg border p-4 transition-colors"
      [class.border-light-accent-primary-hq]="!notification().readAt"
      [class.dark:border-dark-accent-primary]="!notification().readAt"
      [class.border-slate-200]="notification().readAt"
      [class.dark:border-slate-700]="notification().readAt"
    >
      <div class="flex items-start justify-between gap-4">
        <button
          type="button"
          class="min-w-0 flex-1 text-left"
          (click)="opened.emit(notification())"
        >
          <div class="flex items-center gap-2">
            @if (!notification().readAt) {
              <span
                class="size-2 shrink-0 rounded-full bg-light-accent-primary-hq dark:bg-dark-accent-primary"
                aria-label="Non letta"
              ></span>
            }
            <h2 class="m-0 truncate text-base font-semibold">
              {{ notification().title }}
            </h2>
          </div>
          <p class="mt-1 mb-0 text-sm text-slate-600 dark:text-slate-300">
            {{ notification().summary }}
          </p>
          <time class="mt-2 block text-xs text-slate-500 dark:text-slate-400">
            {{ notification().createdAt | date:'medium' }}
          </time>
        </button>

        <div class="flex shrink-0 flex-col items-end gap-2">
          <button
            type="button"
            class="text-xs font-semibold underline underline-offset-2"
            (click)="readChanged.emit({ notification: notification(), read: !!notification().readAt })"
          >
            {{ notification().readAt ? 'Segna non letta' : 'Segna letta' }}
          </button>
          <button
            type="button"
            class="text-xs text-light-error underline underline-offset-2 dark:text-dark-error"
            (click)="dismissed.emit(notification())"
          >
            Elimina
          </button>
        </div>
      </div>
    </article>
  `
})
export class NotificationListItemComponent {
  readonly notification = input.required<UserNotificationDTO>()
  readonly opened = output<UserNotificationDTO>()
  readonly dismissed = output<UserNotificationDTO>()
  readonly readChanged = output<{
    notification: UserNotificationDTO
    read: boolean
  }>()
}
