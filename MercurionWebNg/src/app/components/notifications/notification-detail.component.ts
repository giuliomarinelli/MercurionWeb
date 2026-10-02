import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'
import { DatePipe } from '@angular/common'
import type { UserNotificationDTO } from '@mercurion/rest-contracts'

@Component({
  selector: 'm-notification-detail',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (notification(); as item) {
      <section
        class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-neutral-900"
        aria-labelledby="notification-detail-title"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="m-0 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {{ item.category }}
            </p>
            <h2 id="notification-detail-title" class="mt-1 mb-0 text-xl font-semibold">
              {{ item.title }}
            </h2>
          </div>
          <button
            type="button"
            class="text-sm underline underline-offset-2"
            (click)="closed.emit()"
          >
            Chiudi
          </button>
        </div>

        <p class="mt-5 whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-200">
          {{ item.body }}
        </p>

        <time class="mt-4 block text-xs text-slate-500 dark:text-slate-400">
          {{ item.createdAt | date:'medium' }}
        </time>

        <div class="mt-5 flex flex-wrap gap-3">
          @if (item.resourceType && item.resourceId) {
            <button
              type="button"
              class="rounded-md bg-light-accent-primary-hq px-4 py-2 text-sm font-semibold text-white dark:bg-dark-accent-primary-btn"
              (click)="targetOpened.emit(item)"
            >
              Apri contenuto collegato
            </button>
          }
          <button
            type="button"
            class="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-600"
            (click)="readChanged.emit({ notification: item, read: !!item.readAt })"
          >
            {{ item.readAt ? 'Segna non letta' : 'Segna letta' }}
          </button>
          <button
            type="button"
            class="rounded-md border border-light-error px-4 py-2 text-sm font-semibold text-light-error dark:border-dark-error dark:text-dark-error"
            (click)="dismissed.emit(item)"
          >
            Elimina
          </button>
        </div>
      </section>
    }
  `
})
export class NotificationDetailComponent {
  readonly notification = input.required<UserNotificationDTO | null>()
  readonly closed = output<void>()
  readonly targetOpened = output<UserNotificationDTO>()
  readonly dismissed = output<UserNotificationDTO>()
  readonly readChanged = output<{
    notification: UserNotificationDTO
    read: boolean
  }>()
}
