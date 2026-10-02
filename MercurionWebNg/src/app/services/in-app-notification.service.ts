import {
  DestroyRef,
  effect,
  inject,
  Injectable,
  signal
} from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import {
  firstValueFrom,
  type Observable
} from 'rxjs'
import type {
  NotificationListState,
  NotificationPageResponse,
  NotificationRecoveryResponse,
  UserNotificationDTO
} from '@mercurion/rest-contracts'

import { AuthStateStore } from './auth-state.store'
import { NotificationApiService } from './notification-api.service'
import { RealtimeSocketService } from './socket-io/realtime-socket.service'
import { ToastService } from './toast.service'
import type { NotificationSyncState } from '../Models/notification.models'

const FALLBACK_POLL_MS = 25_000

@Injectable({
  providedIn: 'root',
})
export class InAppNotificationService {
  private readonly realtime = inject(RealtimeSocketService)
  private readonly api = inject(NotificationApiService)
  private readonly authState = inject(AuthStateStore)
  private readonly toast = inject(ToastService)
  private readonly destroyRef = inject(DestroyRef)

  private readonly _unreadCount = signal(0)
  readonly unreadCount = this._unreadCount.asReadonly()

  private readonly _unseenCount = signal(0)
  readonly unseenCount = this._unseenCount.asReadonly()

  private readonly _syncState = signal<NotificationSyncState>('inactive')
  readonly syncState = this._syncState.asReadonly()

  private readonly _catchUpCount = signal(0)
  readonly catchUpCount = this._catchUpCount.asReadonly()

  private readonly _syncCursor = signal<string | null>(null)
  readonly syncCursor = this._syncCursor.asReadonly()

  private readonly _lastRecovery =
    signal<NotificationRecoveryResponse | null>(null)
  readonly lastRecovery = this._lastRecovery.asReadonly()

  private activeOwner: string | null = null
  private generation = 0
  private baselineReady = false
  private recoveryRequested = false
  private syncInFlight: Promise<boolean> | null = null
  private pollTimer: ReturnType<typeof setInterval> | undefined
  private recoveryErrorFallback = false
  private catchUpCursor: string | null = null
  private catchUpSeenCursor: string | null = null
  private readonly toastedNotificationIds = new Set<string>()

  constructor() {
    this.realtime.onNotificationChanged()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.activeOwner) {
          void this.requestRecovery()
        }
      })

    effect(() => {
      const authenticated = this.authState.authenticated()
      const session = this.authState.clientSession()
      const owner = authenticated && session
        ? `${session.userId}:${session.sessionId}`
        : null

      this.syncOwner(owner)
    })

    effect(() => {
      const state = this.realtime.state()
      this.handleRealtimeState(state)
    })
  }

  list(options: {
    cursor?: string
    limit?: number
    state?: NotificationListState
  } = {}): Observable<NotificationPageResponse> {
    return this.api.list(options)
  }

  get(notificationId: string): Observable<UserNotificationDTO> {
    return this.api.get(notificationId)
  }

  async setRead(notificationId: string, read: boolean): Promise<void> {
    await firstValueFrom(this.api.setRead(notificationId, read))
    await this.requestRecovery()
  }

  async markAllReadThroughCurrentCursor(): Promise<void> {
    const cursor = this._syncCursor()
    if (!cursor) return

    await firstValueFrom(this.api.markAllRead(cursor))
    await this.requestRecovery()
  }

  async markAllSeenThroughCurrentCursor(): Promise<void> {
    const cursor = this._syncCursor()
    if (!cursor) return

    await firstValueFrom(this.api.markAllSeen(cursor))
    await this.requestRecovery()
  }

  async acknowledgeCatchUpPresented(): Promise<void> {
    const cursor = this.catchUpCursor
    if (
      !cursor ||
      this._catchUpCount() < 1 ||
      this.catchUpSeenCursor === cursor
    ) {
      return
    }

    this.catchUpSeenCursor = cursor
    try {
      await firstValueFrom(this.api.markAllSeen(cursor))
      await this.requestRecovery()
    } catch (error) {
      if (this.catchUpSeenCursor === cursor) {
        this.catchUpSeenCursor = null
      }
      throw error
    }
  }

  dismissCatchUp(): void {
    this._catchUpCount.set(0)
  }

  async dismiss(notificationId: string): Promise<void> {
    await firstValueFrom(this.api.dismiss(notificationId))
    await this.requestRecovery()
  }

  async dismissAllThroughCurrentCursor(): Promise<void> {
    const cursor = this._syncCursor()
    if (!cursor) return

    await firstValueFrom(this.api.dismissAll(cursor))
    await this.requestRecovery()
  }

  private syncOwner(owner: string | null): void {
    if (owner === this.activeOwner) return

    this.generation++
    this.stopPolling()
    this.syncInFlight = null
    this.recoveryRequested = false
    this.baselineReady = false
    this.recoveryErrorFallback = false
    this.catchUpCursor = null
    this.catchUpSeenCursor = null
    this.toastedNotificationIds.clear()

    this.activeOwner = owner
    this._unreadCount.set(0)
    this._unseenCount.set(0)
    this._syncCursor.set(null)
    this._lastRecovery.set(null)
    this._catchUpCount.set(0)

    if (!owner) {
      this._syncState.set('inactive')
      return
    }

    this._syncState.set('baselining')
    void this.ensureSync()
  }

  private handleRealtimeState(
    state: ReturnType<RealtimeSocketService['state']>
  ): void {
    if (!this.activeOwner) return

    if (state.kind === 'private') {
      void this.requestRecovery().then(success => {
        if (
          success &&
          this.activeOwner &&
          this.realtime.state().kind === 'private'
        ) {
          this.recoveryErrorFallback = false
          this.stopPolling()
          this._syncState.set('ready')
        }
      })
      return
    }

    if (
      (state.kind === 'reconnecting' || state.kind === 'degraded') &&
      state.mode === 'private'
    ) {
      this._syncState.set('degraded')
      this.startPolling()
      void this.requestRecovery()
    }
  }

  private requestRecovery(): Promise<boolean> {
    if (!this.activeOwner) return Promise.resolve(false)
    this.recoveryRequested = true
    return this.ensureSync()
  }

  private ensureSync(): Promise<boolean> {
    if (!this.activeOwner) return Promise.resolve(false)
    if (this.syncInFlight) return this.syncInFlight

    const generation = this.generation
    const task = this.runSync(generation)
    this.syncInFlight = task

    void task.finally(() => {
      if (this.syncInFlight === task) {
        this.syncInFlight = null
      }

      if (
        this.isCurrentGeneration(generation) &&
        this.recoveryRequested
      ) {
        void this.ensureSync()
      }
    })

    return task
  }

  private async runSync(generation: number): Promise<boolean> {
    if (!this.baselineReady) {
      const baselineSucceeded = await this.establishBaseline(generation)
      if (!baselineSucceeded) return false
    }

    while (
      this.recoveryRequested &&
      this.isCurrentGeneration(generation)
    ) {
      this.recoveryRequested = false
      const recoverySucceeded = await this.recoverChanges(generation)
      if (!recoverySucceeded) return false
    }

    return this.isCurrentGeneration(generation)
  }

  private async establishBaseline(generation: number): Promise<boolean> {
    this._syncState.set('baselining')

    try {
      const response = await firstValueFrom(this.api.recover())
      if (!this.isCurrentGeneration(generation)) return false

      this.applyRecoveryMetadata(response)
      this.catchUpCursor = response.cursor
      this._catchUpCount.set(response.unseenCount)
      this.baselineReady = true
      this.recoveryErrorFallback = false
      this.setSettledState()
      return true
    } catch {
      if (this.isCurrentGeneration(generation)) {
        this.recoveryErrorFallback = true
        this._syncState.set('degraded')
        this.startPolling()
      }
      return false
    }
  }

  private async recoverChanges(generation: number): Promise<boolean> {
    let cursor = this._syncCursor()
    if (!cursor) return false

    this._syncState.set(
      this.needsSocketFallback() || this.recoveryErrorFallback
        ? 'degraded'
        : 'recovering'
    )

    try {
      for (;;) {
        const response = await firstValueFrom(
          this.api.recover(cursor)
        )
        if (!this.isCurrentGeneration(generation)) return false

        if (response.hasMore && response.cursor === cursor) {
          throw new Error(
            'Notification recovery cursor did not advance while hasMore=true'
          )
        }

        this.applyRecoveryMetadata(response)
        this.presentLiveNotifications(response)
        cursor = response.cursor

        if (!response.hasMore) break
      }

      if (!this.isCurrentGeneration(generation)) return false

      this.recoveryErrorFallback = false
      if (this.realtime.state().kind === 'private') {
        this.stopPolling()
      }
      this.setSettledState()
      return true
    } catch {
      if (this.isCurrentGeneration(generation)) {
        this.recoveryErrorFallback = true
        this._syncState.set('degraded')
        this.startPolling()
      }
      return false
    }
  }

  private applyRecoveryMetadata(
    response: NotificationRecoveryResponse
  ): void {
    this._syncCursor.set(response.cursor)
    this._unreadCount.set(response.unreadCount)
    this._unseenCount.set(response.unseenCount)
    this._lastRecovery.set(response)
  }

  private presentLiveNotifications(
    response: NotificationRecoveryResponse
  ): void {
    for (const change of response.changes) {
      if (change.kind !== 'created') continue
      if (this.toastedNotificationIds.has(change.notification.id)) continue

      this.toastedNotificationIds.add(change.notification.id)
      this.toast.trigger(
        change.notification.summary,
        'success',
        6000
      )
    }
  }

  private setSettledState(): void {
    if (!this.activeOwner) {
      this._syncState.set('inactive')
      return
    }

    this._syncState.set(
      this.needsSocketFallback() || this.recoveryErrorFallback
        ? 'degraded'
        : 'ready'
    )
  }

  private needsSocketFallback(): boolean {
    const state = this.realtime.state()
    return (
      (state.kind === 'reconnecting' || state.kind === 'degraded') &&
      state.mode === 'private'
    )
  }

  private startPolling(): void {
    if (this.pollTimer !== undefined || !this.activeOwner) return

    this.pollTimer = setInterval(() => {
      if (this.activeOwner) {
        void this.requestRecovery()
      }
    }, FALLBACK_POLL_MS)
  }

  private stopPolling(): void {
    if (this.pollTimer !== undefined) {
      clearInterval(this.pollTimer)
    }
    this.pollTimer = undefined
  }

  private isCurrentGeneration(generation: number): boolean {
    return Boolean(this.activeOwner) && generation === this.generation
  }
}
