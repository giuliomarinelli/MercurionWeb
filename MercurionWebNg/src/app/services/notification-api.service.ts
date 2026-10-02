import { HttpClient, HttpParams } from '@angular/common/http'
import { inject, Injectable } from '@angular/core'
import { Observable } from 'rxjs'
import {
  NotificationListState,
  type NotificationListState as NotificationListStateType,
  type NotificationPageResponse,
  type NotificationRecoveryResponse,
  type UserNotificationDTO
} from '@mercurion/rest-contracts'

@Injectable({ providedIn: 'root' })
export class NotificationApiService {
  private readonly http = inject(HttpClient)

  recover(
    cursor?: string,
    limit = 50
  ): Observable<NotificationRecoveryResponse> {
    let params = new HttpParams().set('limit', limit)
    if (cursor) params = params.set('cursor', cursor)

    return this.http.get<NotificationRecoveryResponse>(
      '/api/notifications/recovery',
      {
        params,
        withCredentials: true
      }
    )
  }

  list(options: {
    cursor?: string
    limit?: number
    state?: NotificationListStateType
  } = {}): Observable<NotificationPageResponse> {
    let params = new HttpParams()
      .set('limit', options.limit ?? 25)
      .set('state', options.state ?? NotificationListState.All)

    if (options.cursor) {
      params = params.set('cursor', options.cursor)
    }

    return this.http.get<NotificationPageResponse>(
      '/api/notifications',
      {
        params,
        withCredentials: true
      }
    )
  }

  get(notificationId: string): Observable<UserNotificationDTO> {
    return this.http.get<UserNotificationDTO>(
      `/api/notifications/${encodeURIComponent(notificationId)}`,
      { withCredentials: true }
    )
  }

  setRead(notificationId: string, read: boolean): Observable<void> {
    return this.http.patch<void>(
      `/api/notifications/${encodeURIComponent(notificationId)}/read`,
      { read },
      { withCredentials: true }
    )
  }

  markAllRead(throughCursor: string): Observable<void> {
    return this.http.patch<void>(
      '/api/notifications/read-all',
      { throughCursor },
      { withCredentials: true }
    )
  }

  markAllSeen(throughCursor: string): Observable<void> {
    return this.http.patch<void>(
      '/api/notifications/seen-all',
      { throughCursor },
      { withCredentials: true }
    )
  }

  dismiss(notificationId: string): Observable<void> {
    return this.http.delete<void>(
      `/api/notifications/${encodeURIComponent(notificationId)}`,
      { withCredentials: true }
    )
  }

  dismissAll(throughCursor: string): Observable<void> {
    return this.http.delete<void>(
      '/api/notifications',
      {
        body: { throughCursor },
        withCredentials: true
      }
    )
  }
}
