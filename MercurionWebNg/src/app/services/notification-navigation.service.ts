import { inject, Injectable } from '@angular/core'
import { Router } from '@angular/router'
import type { UserNotificationDTO } from '@mercurion/rest-contracts'

import { routeManifest } from '../route-manifest'

@Injectable({ providedIn: 'root' })
export class NotificationNavigationService {
  private readonly router = inject(Router)

  openNotificationDetail(notificationId: string): Promise<boolean> {
    return this.router.navigate(
      [routeManifest.notifications.build({})],
      { queryParams: { notification: notificationId } }
    )
  }

  openTarget(notification: UserNotificationDTO): Promise<boolean> {
    if (
      notification.resourceType === 'help_ticket' &&
      notification.resourceId
    ) {
      return this.router.navigate(
        [routeManifest.help.build({})],
        {
          queryParams: {
            t_id: notification.resourceId,
            m: 'user'
          }
        }
      )
    }

    return this.openNotificationDetail(notification.id)
  }

  openCenter(): Promise<boolean> {
    return this.router.navigate([routeManifest.notifications.build({})])
  }
}
