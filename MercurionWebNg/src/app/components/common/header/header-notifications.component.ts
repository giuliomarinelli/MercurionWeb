import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { routeManifest } from '../../../route-manifest';
import { InAppNotificationService } from '../../../services/in-app-notification.service';
import { NotificationCatchUpComponent } from '../../notifications/notification-catch-up.component';
import { NotificationButtonComponent } from '../notification-button/notification-button.component';
import { RealtimeSyncBadgeComponent } from '../realtime-sync-badge/realtime-sync-badge.component';

@Component({
  selector: 'm-header-notifications',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  imports: [NotificationButtonComponent, NotificationCatchUpComponent, RealtimeSyncBadgeComponent],
  template: `
    <m-realtime-sync-badge />
    <div class="relative flex items-center">
      <m-notification-button [unreadCount]="notifications.unreadCount()" (pressed)="openNotifications()" />
      @if (notifications.catchUpCount() > 0) {
        <m-notification-catch-up
          [count]="notifications.catchUpCount()"
          (presented)="onCatchUpPresented()"
          (opened)="openNotifications()"
          (dismissed)="notifications.dismissCatchUp()"
        />
      }
    </div>
  `
})
export class HeaderNotificationsComponent {
  protected readonly notifications = inject(InAppNotificationService);
  private readonly router = inject(Router);

  protected openNotifications(): void {
    this.notifications.dismissCatchUp();
    void this.router.navigate([routeManifest.notifications.build({})]);
  }

  protected onCatchUpPresented(): void {
    void this.notifications.acknowledgeCatchUpPresented();
  }
}
