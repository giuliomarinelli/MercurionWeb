import { inject, Injectable } from '@angular/core';
import { RealtimeSocketService } from './socket-io/realtime-socket.service';

@Injectable({
  providedIn: 'root',
})
export class InAppNotificationService {

  private readonly realtime = inject(RealtimeSocketService)

}
