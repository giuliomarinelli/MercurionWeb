import { effect, inject, Injectable } from '@angular/core'
import { Subscription } from 'rxjs'
import type { SocketStateChangedPayload } from '@mercurion/socket-contracts'
import { DomainInvalidationService, type DomainInvalidation } from './domain-invalidation.service'
import { RealtimeSocketService } from './socket-io/realtime-socket.service'
import { RealtimeSyncStatusService } from './realtime-sync-status.service'

@Injectable({ providedIn: 'root' })
export class RealtimeStateSyncService {
  private readonly socket = inject(RealtimeSocketService)
  private readonly invalidations = inject(DomainInvalidationService)
  private readonly status = inject(RealtimeSyncStatusService)
  private subscription?: Subscription
  private started = false
  private privateConnectionSeen = false
  private privateGapSeen = false

  constructor() {
    effect(() => {
      if (!this.started) return
      const state = this.socket.state()
      if ((state.kind === 'reconnecting' || state.kind === 'degraded') && state.mode === 'private') {
        this.privateGapSeen = true
        return
      }
      if (state.kind !== 'private') return
      if (this.privateConnectionSeen && this.privateGapSeen) {
        this.privateGapSeen = false
        this.invalidations.publish({ domain: 'realtime', action: 'reconcile', remote: true })
        this.status.markSynchronized()
      }
      this.privateConnectionSeen = true
    })
  }

  start(): void {
    if (this.started) return
    this.started = true
    this.subscription = this.socket.onStateChanged().subscribe(payload => {
      this.invalidations.publish(this.toDomainInvalidation(payload))
      this.status.markSynchronized()
    })
  }

  stop(): void {
    this.subscription?.unsubscribe()
    this.subscription = undefined
    this.started = false
    this.privateConnectionSeen = false
    this.privateGapSeen = false
    this.status.clear()
  }

  private toDomainInvalidation(payload: SocketStateChangedPayload): DomainInvalidation {
    const base = { action: 'changed' as const, remote: true as const }
    switch (payload.domain) {
      case 'molecule':
      case 'molecule-collection':
      case 'ticket':
        return {
          domain: payload.domain,
          ...base,
          change: payload.change,
          ...(payload.resourceId ? { resourceId: payload.resourceId } : {})
        }
      case 'profile':
      case 'account-security':
      case 'sessions':
      case 'history':
        return { domain: payload.domain, ...base }
      default: {
        const unreachable: never = payload.domain
        throw new Error(`Unsupported realtime state domain: ${String(unreachable)}`)
      }
    }
  }
}
