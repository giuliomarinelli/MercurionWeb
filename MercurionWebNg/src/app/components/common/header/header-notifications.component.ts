import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core'
import { injectBrowserResourceOwner } from '../../../utils/browser-resource-owner.util'
import { Router } from '@angular/router'
import { routeManifest } from '../../../route-manifest'
import { InAppNotificationService } from '../../../services/in-app-notification.service'
import { NotificationCatchUpComponent } from '../../notifications/notification-catch-up.component'
import { NotificationButtonComponent } from '../notification-button/notification-button.component'
import { RealtimeSyncBadgeComponent } from '../realtime-sync-badge/realtime-sync-badge.component'

@Component({
  selector: 'm-header-notifications',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  imports: [NotificationButtonComponent, NotificationCatchUpComponent, RealtimeSyncBadgeComponent],
  template: `
    <m-realtime-sync-badge class="contents" />
    <div class="relative flex items-center">
      <m-notification-button
        #notificationTrigger
        [unreadCount]="notifications.unreadCount()"
        (pressed)="openNotifications()"
      />
      @if (notifications.catchUpCount() > 0) {
        <m-notification-catch-up
          [count]="notifications.catchUpCount()"
          [acknowledgementFailed]="acknowledgementFailed()"
          [pending]="acknowledgementPending()"
          (retried)="onCatchUpPresented()"
          (presented)="onCatchUpPresented()"
          (opened)="openNotifications()"
          (dismissed)="dismissCatchUp()"
        />
      }
    </div>
  `,
})
export class HeaderNotificationsComponent {
  protected readonly notifications = inject(InAppNotificationService)
  private readonly router = inject(Router)

  protected openNotifications(): void {
    this.notifications.dismissCatchUp()
    void this.router.navigate([routeManifest.notifications.build({})])
  }

  private readonly trigger = viewChild.required<
    NotificationButtonComponent,
    ElementRef<HTMLElement>
  >('notificationTrigger', { read: ElementRef })
  private readonly resources = injectBrowserResourceOwner()
  protected readonly acknowledgementFailed = signal(false)
  protected readonly acknowledgementPending = signal(false)

  protected dismissCatchUp(): void {
    this.notifications.dismissCatchUp()
    this.resources.requestAnimationFrame(() => {
      this.trigger()
        .nativeElement.querySelector<HTMLButtonElement>('button')
        ?.focus({ preventScroll: true })
    })
  }

  protected async onCatchUpPresented(): Promise<void> {
    if (this.acknowledgementPending()) return
    this.acknowledgementPending.set(true)
    this.acknowledgementFailed.set(false)
    try {
      await this.notifications.acknowledgeCatchUpPresented()
    } catch {
      if (!this.resources.isDisposed) this.acknowledgementFailed.set(true)
    } finally {
      if (!this.resources.isDisposed) this.acknowledgementPending.set(false)
    }
  }
}
