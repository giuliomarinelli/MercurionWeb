import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'
import type { UserNotificationDTO } from '@mercurion/rest-contracts'

import { NotificationListItemComponent } from './notification-list-item.component'

@Component({
  selector: 'm-notification-list',
  imports: [NotificationListItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-label="Elenco notifiche" class="space-y-3">
      @for (notification of notifications(); track notification.id) {
        <m-notification-list-item
          [notification]="notification"
          (opened)="opened.emit($event)"
          (dismissed)="dismissed.emit($event)"
          (readChanged)="readChanged.emit($event)"
        />
      } @empty {
        <p class="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Nessuna notifica da mostrare.
        </p>
      }
    </section>
  `
})
export class NotificationListComponent {
  readonly notifications = input.required<UserNotificationDTO[]>()
  readonly opened = output<UserNotificationDTO>()
  readonly dismissed = output<UserNotificationDTO>()
  readonly readChanged = output<{
    notification: UserNotificationDTO
    read: boolean
  }>()
}
