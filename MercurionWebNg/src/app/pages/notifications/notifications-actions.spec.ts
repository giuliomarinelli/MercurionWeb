import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router'
import { BehaviorSubject, of, Subject } from 'rxjs'
import type {
  NotificationPageResponse,
  NotificationRecoveryResponse,
} from '@mercurion/rest-contracts'
import { NotificationsFacade } from './notifications.facade'
import { notificationFixture } from './notifications.testing'
import { InAppNotificationService } from '../../services/in-app-notification.service'
import { NotificationNavigationService } from '../../services/notification-navigation.service'

describe('Notification actions and concurrent recovery', () => {
  let vm: NotificationsFacade
  let service: jasmine.SpyObj<InAppNotificationService>
  const recovery = signal<NotificationRecoveryResponse | null>(null)
  const syncCursor = signal<string | null>('baseline')

  const recoveryEvents = new Subject<NotificationRecoveryResponse>()

  function publishRecovery(value: NotificationRecoveryResponse): void {
    recovery.set(value)
    recoveryEvents.next(value)
  }

  beforeEach(async () => {
    syncCursor.set('baseline')
    publishRecovery({
      cursor: 'baseline',
      snapshotAt: notificationFixture('A').createdAt,
      unreadCount: 2,
      unseenCount: 0,
      changes: [],
      hasMore: false,
    })
    service = jasmine.createSpyObj(
      'Notifications',
      [
        'list',
        'get',
        'setRead',
        'dismiss',
        'markAllReadThroughCurrentCursor',
        'dismissAllThroughCurrentCursor',
        'refresh',
      ],
      {
        lastRecovery: recovery,
        recoveryApplied: recoveryEvents.asObservable(),
        unreadCount: signal(2),
        syncCursor: syncCursor.asReadonly(),
        syncState: signal('ready'),
      }
    )
    service.list.and.returnValue(of({ items: [notificationFixture('A')], nextCursor: 'next' }))
    service.get.and.callFake((id) => of(notificationFixture(id)))
    service.setRead.and.resolveTo()
    service.dismiss.and.resolveTo()
    service.markAllReadThroughCurrentCursor.and.resolveTo()
    service.dismissAllThroughCurrentCursor.and.resolveTo()
    TestBed.configureTestingModule({
      providers: [
        NotificationsFacade,
        { provide: InAppNotificationService, useValue: service },
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: new BehaviorSubject(convertToParamMap({})) },
        },
        { provide: Router, useValue: { navigate: jasmine.createSpy().and.resolveTo(true) } },
        {
          provide: NotificationNavigationService,
          useValue: { openTarget: jasmine.createSpy().and.resolveTo(false) },
        },
      ],
    })
    vm = TestBed.inject(NotificationsFacade)
    TestBed.flushEffects()
    await Promise.resolve()
    await Promise.resolve()
  })

  it('preserves loaded pages after changing a single read state', async () => {
    service.list.and.returnValue(of({ items: [notificationFixture('B')], nextCursor: 'third' }))
    await vm.loadMore()
    const calls = service.list.calls.count()
    await vm.setRead(notificationFixture('A'), false)
    expect(vm.items().map((item) => item.id)).toEqual(['A', 'B'])
    expect(vm.items()[0].readAt).toBeNull()
    expect(vm.nextCursor()).toBe('third')
    expect(service.list.calls.count()).toBe(calls)
  })

  it('does not resurrect an item dismissed remotely while a page request is pending', async () => {
    const pending = new Subject<NotificationPageResponse>()
    service.list.and.returnValue(pending)
    const loading = vm.loadMore()
    publishRecovery({
      ...recovery()!,
      cursor: 'newer',
      changes: [
        {
          kind: 'dismissed',
          notification: notificationFixture('B', {
            dismissedAt: notificationFixture('B').createdAt,
          }),
        },
      ],
    })
    TestBed.flushEffects()
    pending.next({ items: [notificationFixture('B')], nextCursor: null })
    pending.complete()
    await loading
    expect(vm.items().map((item) => item.id)).toEqual(['A'])
  })

  it('requires confirmation and cancellation never sends a deletion', async () => {
    vm.askDismiss(notificationFixture('A'))
    expect(service.dismiss).not.toHaveBeenCalled()
    vm.cancelConfirmation()
    await vm.confirmDismiss()
    expect(service.dismiss).not.toHaveBeenCalled()
    expect(vm.items().map((item) => item.id)).toEqual(['A'])
  })

  it('guards repeated confirmation and removes only the confirmed item without reloading pages', async () => {
    let complete!: () => void
    service.dismiss.and.returnValue(
      new Promise<void>((resolve) => {
        complete = resolve
      })
    )
    vm.askDismiss(notificationFixture('A'))
    const pending = vm.confirmDismiss()
    await vm.confirmDismiss()
    vm.cancelConfirmation()
    expect(service.dismiss).toHaveBeenCalledOnceWith('A')
    expect(vm.mutationPending()).toBeTrue()
    expect(vm.confirmation()).not.toBeNull()
    const calls = service.list.calls.count()
    complete()
    await pending
    expect(vm.items()).toEqual([])
    expect(vm.confirmation()).toBeNull()
    expect(vm.mutationPending()).toBeFalse()
    expect(service.list.calls.count()).toBe(calls)
  })

  it('retains the original bulk boundary across new events and a failed deletion retry', async () => {
    service.dismissAllThroughCurrentCursor.and.rejectWith(new Error('offline'))
    vm.askDismissAll()
    syncCursor.set('newer-events')
    await vm.confirmDismiss()
    expect(vm.confirmation()).not.toBeNull()
    expect(vm.actionMessage()).toBeNull()
    expect(vm.actionError()).toContain('confermare')
    service.dismissAllThroughCurrentCursor.and.resolveTo()
    await vm.confirmDismiss()
    expect(service.dismissAllThroughCurrentCursor.calls.allArgs()).toEqual([
      ['baseline'],
      ['baseline'],
    ])
    expect(vm.confirmation()).toBeNull()
  })

  it('does not expose a bulk confirmation before synchronization has a cursor', async () => {
    syncCursor.set(null)
    vm.askDismissAll()
    await vm.markAllRead()
    expect(vm.confirmation()).toBeNull()
    expect(service.markAllReadThroughCurrentCursor).not.toHaveBeenCalled()
  })

  it('does not change local read state on failure and retries the intended state once', async () => {
    service.setRead.and.rejectWith(new Error('offline'))
    await vm.setRead(notificationFixture('A'), false)
    expect(vm.items()[0].readAt).not.toBeNull()
    expect(vm.retryAvailable()).toBeTrue()
    service.setRead.and.resolveTo()
    await vm.retryAction()
    expect(service.setRead.calls.allArgs()).toEqual([
      ['A', false],
      ['A', false],
    ])
    expect(vm.items()[0].readAt).toBeNull()
    expect(vm.actionError()).toBeNull()
  })

  it('does not resurrect a remotely dismissed item when a pending read action completes', async () => {
    let complete!: () => void
    service.setRead.and.returnValue(
      new Promise<void>((resolve) => {
        complete = resolve
      })
    )
    const pending = vm.setRead(notificationFixture('A'), false)
    publishRecovery({
      ...recovery()!,
      cursor: 'dismissed',
      changes: [
        {
          kind: 'dismissed',
          notification: notificationFixture('A', {
            dismissedAt: notificationFixture('A').createdAt,
          }),
        },
      ],
    })
    complete()
    await pending
    expect(vm.items()).toEqual([])
  })

  it('does not replay a failed read after the notification has been dismissed remotely', async () => {
    service.setRead.and.rejectWith(new Error('offline'))
    await vm.setRead(notificationFixture('A'), false)
    publishRecovery({
      ...recovery()!,
      cursor: 'dismissed',
      changes: [
        {
          kind: 'dismissed',
          notification: notificationFixture('A', {
            dismissedAt: notificationFixture('A').createdAt,
          }),
        },
      ],
    })
    await vm.retryAction()
    expect(service.setRead).toHaveBeenCalledTimes(1)
    expect(vm.items()).toEqual([])
    expect(vm.retryAvailable()).toBeFalse()
    expect(vm.actionError()).toContain('non è più disponibile')
  })

  it('preserves new-event feedback when recovery arrives during a list refresh', async () => {
    const response = new Subject<NotificationPageResponse>()
    service.list.and.returnValue(response)
    const pending = vm.reload()
    publishRecovery({
      ...recovery()!,
      cursor: 'created',
      changes: [{ kind: 'created', notification: notificationFixture('B') }],
    })
    response.next({ items: [notificationFixture('A')], nextCursor: null })
    response.complete()
    await pending
    expect(vm.updatesAvailable()).toBeTrue()
    expect(vm.items().map((item) => item.id)).toEqual(['A'])
  })

  it('reconciles every recovery page even when multiple pages arrive in the same render turn', () => {
    publishRecovery({
      ...recovery()!,
      cursor: 'one',
      hasMore: true,
      changes: [
        {
          kind: 'dismissed',
          notification: notificationFixture('A', {
            dismissedAt: notificationFixture('A').createdAt,
          }),
        },
      ],
    })
    publishRecovery({ ...recovery()!, cursor: 'two', hasMore: false, changes: [] })
    TestBed.flushEffects()
    expect(vm.items()).toEqual([])
  })

  it('does not apply a late successful write after the page has been destroyed', async () => {
    let complete!: () => void
    service.setRead.and.returnValue(
      new Promise<void>((resolve) => {
        complete = resolve
      })
    )
    const pending = vm.setRead(notificationFixture('A'), false)
    TestBed.resetTestingModule()
    complete()
    await pending
    expect(vm.items()[0].readAt).not.toBeNull()
    expect(vm.actionMessage()).toBeNull()
  })

  it('keeps a successful bulk write separate from a failed subsequent refresh', async () => {
    const response = new Subject<NotificationPageResponse>()
    service.list.and.returnValue(response)
    const pending = vm.markAllRead()
    await Promise.resolve()
    response.error(new Error('offline'))
    await pending
    expect(service.markAllReadThroughCurrentCursor).toHaveBeenCalledOnceWith('baseline')
    expect(vm.actionMessage()).toContain('Segnate come lette')
    expect(vm.listError()).not.toBeNull()
    expect(vm.retryAvailable()).toBeFalse()
  })
})
