import { Injectable, inject } from '@angular/core'
import {
  classifyCrossTabAuthStorageEvent,
  SessionSyncTransportService,
  type CrossTabAuthStorageEvent,
  type SessionSyncStatus
} from './session-sync.transport.service'

export { classifyCrossTabAuthStorageEvent }
export type { CrossTabAuthStorageEvent, SessionSyncStatus }

/**
 * Public session-sync boundary.
 *
 * Consumers can observe typed state and issue session commands, but cannot
 * reach the socket, protocol ACKs, persistence or retry implementation.
 */
@Injectable({ providedIn: 'root' })
export class SessionSyncService {
  private readonly transport = inject(SessionSyncTransportService)

  readonly status = this.transport.status
  readonly handshakeTick = this.transport.handshakeTick
  readonly voluntaryLogoutTick = this.transport.voluntaryLogoutTick

  get currentStatus(): SessionSyncStatus {
    return this.status()
  }

  checkSession(force = false): Promise<void> {
    return this.transport.checkSession(force)
  }

  resumeSession(initials: string): void {
    this.transport.resumeSession(initials)
  }

  requestHandshake(): void {
    this.transport.requestHandshake()
  }

  notifyVoluntaryLogout(): void {
    this.transport.notifyVoluntaryLogout()
  }

  completeVoluntaryLogout(): void {
    this.transport.completeVoluntaryLogout()
  }

  logout(): void {
    this.transport.logout()
  }
}
