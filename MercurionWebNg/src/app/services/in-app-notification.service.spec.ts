import { fakeAsync, flushMicrotasks, TestBed, tick } from '@angular/core/testing'
import { signal } from '@angular/core'
import { of, Subject } from 'rxjs'
import type {
  NotificationRecoveryResponse
} from '@mercurion/rest-contracts'

import { InAppNotificationService } from './in-app-notification.service'
import { NotificationApiService } from './notification-api.service'
import { RealtimeSocketService } from './socket-io/realtime-socket.service'
import { AuthStateStore } from './auth-state.store'
import { ToastService } from './toast.service'
import { NotificationNavigationService } from './notification-navigation.service'
import type { RealtimeConnectionState } from './socket-io/realtime-connection-state-machine'

describe('InAppNotificationService', () => {
  const authenticated = signal(false)
  const clientSession = signal<{
    userId: string
    sessionId: string
  } | null>(null)
  const realtimeState = signal<RealtimeConnectionState>({
    kind: 'authenticating',
    generation: 1
  })
  const notificationChanged = new Subject<{
    kind: 'notification-state-changed'
  }>()

  let recover: jasmine.Spy
  let toast: jasmine.Spy
  let service: InAppNotificationService

  const baseline = (
    overrides: Partial<NotificationRecoveryResponse> = {}
  ): NotificationRecoveryResponse => ({
    cursor: 'n1.OA',
    snapshotAt: '2026-10-02T20:00:00.000Z',
    unreadCount: 2,
    unseenCount: 1,
    changes: [],
    hasMore: false,
    ...overrides
  })

  beforeEach(() => {
    authenticated.set(false)
    clientSession.set(null)
    realtimeState.set({
      kind: 'authenticating',
      generation: 1
    })

    recover = jasmine.createSpy().and.returnValue(of(baseline()))
    toast = jasmine.createSpy()

    TestBed.configureTestingModule({
      providers: [
        InAppNotificationService,
        {
          provide: NotificationApiService,
          useValue: {
            recover,
            list: jasmine.createSpy(),
            get: jasmine.createSpy(),
            setRead: jasmine.createSpy(),
            markAllRead: jasmine.createSpy(),
            markAllSeen: jasmine.createSpy(),
            dismiss: jasmine.createSpy(),
            dismissAll: jasmine.createSpy()
          }
        },
        {
          provide: RealtimeSocketService,
          useValue: {
            state: realtimeState.asReadonly(),
            onNotificationChanged: () => notificationChanged.asObservable()
          }
        },
        {
          provide: AuthStateStore,
          useValue: {
            authenticated: authenticated.asReadonly(),
            clientSession: clientSession.asReadonly()
          }
        },
        {
          provide: ToastService,
          useValue: {
            trigger: toast
          }
        }
,
        {
          provide: NotificationNavigationService,
          useValue: {
            openNotificationDetail: jasmine.createSpy()
          }
        }
      ]
    })

    service = TestBed.inject(InAppNotificationService)
    TestBed.flushEffects()
  })

  afterEach(() => {
    notificationChanged.observers.slice().forEach(observer =>
      observer.complete()
    )
  })

  it('establishes counts without replaying historical toasts', fakeAsync(() => {
    clientSession.set({
      userId: 'user-1',
      sessionId: 'session-1'
    })
    authenticated.set(true)

    TestBed.flushEffects()
    flushMicrotasks()

    expect(service.unreadCount()).toBe(2)
    expect(service.unseenCount()).toBe(1)
    expect(service.syncCursor()).toBe('n1.OA')
    expect(service.catchUpCount()).toBe(1)
    expect(toast).not.toHaveBeenCalled()
  }))

  it('recovers and presents a post-baseline created notification once', fakeAsync(() => {
    recover.and.returnValues(
      of(baseline()),
      of(baseline({
        cursor: 'n1.OQ',
        unreadCount: 3,
        unseenCount: 2,
        changes: [{
          kind: 'created',
          notification: {
            id: 'notification-1',
            type: 'support.reply_received',
            version: 1,
            category: 'support',
            title: 'Nuova risposta',
            summary: 'Il supporto ha risposto.',
            body: 'Dettaglio',
            payload: {},
            resourceType: 'help_ticket',
            resourceId: 'ticket-1',
            createdAt: '2026-10-02T20:01:00.000Z',
            updatedAt: '2026-10-02T20:01:00.000Z',
            seenAt: null,
            readAt: null,
            dismissedAt: null
          }
        }]
      })),
      of(baseline({
        cursor: 'n1.OQ',
        unreadCount: 3,
        unseenCount: 2
      }))
    )

    clientSession.set({
      userId: 'user-1',
      sessionId: 'session-1'
    })
    authenticated.set(true)
    TestBed.flushEffects()
    flushMicrotasks()

    notificationChanged.next({
      kind: 'notification-state-changed'
    })
    flushMicrotasks()

    expect(service.unreadCount()).toBe(3)
    expect(toast).toHaveBeenCalledTimes(1)

    notificationChanged.next({
      kind: 'notification-state-changed'
    })
    flushMicrotasks()

    expect(toast).toHaveBeenCalledTimes(1)
  }))

  it('polls while the private realtime path is degraded', fakeAsync(() => {
    clientSession.set({
      userId: 'user-1',
      sessionId: 'session-1'
    })
    authenticated.set(true)
    TestBed.flushEffects()
    flushMicrotasks()

    realtimeState.set({
      kind: 'degraded',
      mode: 'private',
      attempt: 7,
      reason: 'retry-exhausted'
    })
    TestBed.flushEffects()
    flushMicrotasks()

    const callsAfterDegradation = recover.calls.count()
    tick(25_000)
    flushMicrotasks()

    expect(recover.calls.count()).toBeGreaterThan(callsAfterDegradation)
    expect(service.syncState()).toBe('degraded')
  }))
})
