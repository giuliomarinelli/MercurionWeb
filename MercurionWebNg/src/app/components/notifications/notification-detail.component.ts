import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'
import { DatePipe } from '@angular/common'
import type { UserNotificationDTO } from '@mercurion/rest-contracts'
import { ButtonComponent } from '../common/button/button.component'
import { notificationCategoryLabel } from './notification-presentation'

@Component({
  selector: 'm-notification-detail',
  imports: [DatePipe, ButtonComponent],
  host: { class: 'block min-w-0' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (notification(); as item) {
      <section
        class="min-w-0 rounded-token-surface border border-token-border/50 bg-surface-elevated p-4 sm:p-6"
        aria-labelledby="notification-detail-title"
      >
        <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p class="text-xs font-semibold text-on-surface-secondary [overflow-wrap:anywhere]">
            {{ categoryLabel(item.category) }}
          </p>
          <m-button size="sm" variant="ghost" (pressed)="closed.emit()">
            <span class="xl:hidden">Torna alle notifiche</span
            ><span class="hidden xl:inline">Chiudi</span>
          </m-button>
        </div>
        <h2
          id="notification-detail-title"
          tabindex="-1"
          class="focus:outline-none scroll-mt-24 text-xl font-semibold leading-snug [overflow-wrap:anywhere]"
        >
          {{ item.title }}
        </h2>
        <div
          class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-on-surface-secondary"
        >
          <time [attr.datetime]="item.createdAt">{{
            item.createdAt | date: 'dd/MM/yyyy, HH:mm'
          }}</time>
          <span>{{ item.readAt ? 'Letta' : 'Non letta' }}</span>
        </div>
        <p
          class="mt-6 whitespace-pre-wrap text-sm leading-7 text-on-surface-main [overflow-wrap:anywhere]"
        >
          {{ item.body }}
        </p>
        <div class="mt-6 flex flex-wrap gap-2 border-t border-token-border/40 pt-5">
          @if (item.resourceType === 'help_ticket' && item.resourceId) {
            <m-button variant="primary" [disabled]="pending()" (pressed)="targetOpened.emit(item)"
              >Apri contenuto collegato</m-button
            >
          }
          <m-button
            variant="outline"
            [disabled]="pending()"
            (pressed)="readChanged.emit({ notification: item, read: !!item.readAt })"
          >
            {{ item.readAt ? 'Segna non letta' : 'Segna letta' }}
          </m-button>
          <m-button
            variant="ghost"
            [disabled]="pending()"
            class="[&_button]:text-light-error dark:[&_button]:text-dark-error-hc"
            (pressed)="dismissed.emit(item)"
            >Elimina</m-button
          >
        </div>
      </section>
    }
  `,
})
export class NotificationDetailComponent {
  readonly notification = input.required<UserNotificationDTO | null>()
  readonly pending = input(false)
  readonly closed = output<void>()
  readonly targetOpened = output<UserNotificationDTO>()
  readonly dismissed = output<UserNotificationDTO>()
  readonly readChanged = output<{ notification: UserNotificationDTO; read: boolean }>()
  protected readonly categoryLabel = notificationCategoryLabel
}
