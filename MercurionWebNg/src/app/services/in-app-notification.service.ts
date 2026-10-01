import { inject, Injectable, signal } from '@angular/core';
import { RealtimeSocketService } from './socket-io/realtime-socket.service';

@Injectable({
  providedIn: 'root',
})
export class InAppNotificationService {

  private readonly realtime = inject(RealtimeSocketService)

  private readonly _unreadCount = signal<number>(0)
  readonly unreadCount = this._unreadCount.asReadonly()


  private incrementUnreadCount() {
    this._unreadCount.update((count) => count + 1)
  }

  private decrementUnreadCount() {
    this._unreadCount.update((count) => Math.max(count - 1, 0))
  }

}
