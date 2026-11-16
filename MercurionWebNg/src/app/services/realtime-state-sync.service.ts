import { effect, inject, Injectable, signal } from '@angular/core'
import { Subscription } from 'rxjs'
import type { SocketStateChangedPayload } from '@mercurion/socket-contracts'
import { DomainInvalidationService, type DomainInvalidation } from './domain-invalidation.service'
import { RealtimeSocketService } from './socket-io/realtime-socket.service'

@Injectable({ providedIn: 'root' })
export class RealtimeStateSyncService {
  private readonly socket = inject(RealtimeSocketService)
  private readonly invalidations = inject(DomainInvalidationService)
  private subscription?: Subscription
  private readonly started = signal(false)
  private privateConnectionSeen = false
  private privateGapSeen = false

  constructor() {
    effect(() => {
      const state = this.socket.state()
      if (!this.started()) return
      if ((state.kind === 'reconnecting' || state.kind === 'degraded') && state.mode === 'private') {
        this.privateGapSeen = true
        return
      }
      if (state.kind !== 'private') return
      if (this.privateConnectionSeen && this.privateGapSeen) {
        this.privateGapSeen = false
        this.invalidations.publish({ domain: 'realtime', action: 'reconcile', remote: true })
      }
      this.privateConnectionSeen = true
    })
  }

  start(): void {
    if (this.started()) return
    this.started.set(true)
    this.subscription = this.socket.onStateChanged().subscribe(payload => {
      this.invalidations.publish(this.toDomainInvalidation(payload))
    })
  }

  stop(): void {
    this.subscription?.unsubscribe()
    this.subscription = undefined
    this.started.set(false)
    this.privateConnectionSeen = false
    this.privateGapSeen = false
  }

  private toDomainInvalidation(payload: SocketStateChangedPayload): DomainInvalidation {
    const base = { action: 'changed' as const, remote: true as const }
    switch (payload.domain) {
      case 'molecule':
        return {
          domain: 'molecule',
          ...base,
          change: payload.change,
          ...(payload.resourceId ? { resourceId: payload.resourceId } : {})
        }
      case 'molecule-collection':
        return {
          domain: 'molecule-collection',
          ...base,
          change: payload.change,
          ...(payload.resourceId ? { resourceId: payload.resourceId } : {})
        }
      case 'ticket':
        return {
          domain: 'ticket',
          ...base,
          change: payload.change,
          ...(payload.resourceId ? { resourceId: payload.resourceId } : {})
        }
      case 'profile':
        return { domain: 'profile', ...base }
      case 'account-security':
        return { domain: 'account-security', ...base }
      case 'sessions':
        return { domain: 'sessions', ...base }
      case 'history':
        return { domain: 'history', ...base }
    }
  }
}
