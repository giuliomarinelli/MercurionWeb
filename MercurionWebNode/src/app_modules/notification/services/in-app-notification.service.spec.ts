import { EntityManager } from 'typeorm'

import { InAppNotificationService } from './in-app-notification.service'
import { UserNotificationRepository } from '../repositories/user-notification.repository'
import { UserNotification } from '../models/entities/user-notification.entity'
import { UnitOfWork } from '../../../persistence/transaction-context'
import { NotificationOutboxService } from './outbox/notification-outbox.service'

describe('InAppNotificationService', () => {
  const userId = '018f0f12-3d4c-7abc-8def-0123456789ab'

  const notification = (overrides: Partial<UserNotification> = {}): UserNotification =>
    Object.assign(new UserNotification(), {
      id: '018f0f12-3d4c-7abc-8def-0123456789ac',
      recipientUserId: userId,
      type: 'security.password_changed',
      version: 1,
      category: 'security',
      title: 'Password modificata',
      summary: 'Summary',
      body: 'Body',
      payload: {},
      resourceType: null,
      resourceId: null,
      createdAt: '1790964000000',
      updatedAt: '1790964000000',
      seenAt: null,
      readAt: null,
      dismissedAt: null,
      revision: '8',
      createdRevision: '8',
      dedupeKey: 'dedupe-1',
      ...overrides
    })

  function createService(repositoryOverrides: Partial<UserNotificationRepository> = {}) {
    const repository = {
      getRecoverySnapshot: jest.fn(),
      listActive: jest.fn(),
      findOwned: jest.fn(),
      insert: jest.fn(),
      setRead: jest.fn(),
      markAllReadThrough: jest.fn(),
      markSeenThrough: jest.fn(),
      dismiss: jest.fn(),
      dismissAllThrough: jest.fn(),
      ...repositoryOverrides
    } as unknown as UserNotificationRepository

    const unitOfWork = {
      run: jest.fn(async (work: (context: object, manager: EntityManager) => Promise<unknown>) =>
        work({}, {} as EntityManager))
    } as unknown as UnitOfWork

    const outbox = {
      appendNotificationStateChanged: jest.fn().mockResolvedValue({})
    }

    return {
      service: new InAppNotificationService(repository, unitOfWork, outbox as unknown as NotificationOutboxService),
      repository,
      outbox
    }
  }

  it('establishes a baseline without replaying historic notifications', async () => {
    const getRecoverySnapshot = jest.fn().mockResolvedValue({
      snapshotRevision: '8',
      snapshotAtMs: '1790964000000',
      unreadCount: 3,
      unseenCount: 2,
      rows: [],
      hasMore: false
    })
    const { service } = createService({ getRecoverySnapshot })

    const result = await service.recover(userId)

    expect(result).toMatchObject({
      unreadCount: 3,
      unseenCount: 2,
      changes: [],
      hasMore: false
    })
    expect(result.cursor).toMatch(/^n1\./)
    expect(getRecoverySnapshot).toHaveBeenCalledWith(userId)
  })

  it('classifies rows created after the cursor as created', async () => {
    const getRecoverySnapshot = jest
      .fn()
      .mockResolvedValueOnce({
        snapshotRevision: '4',
        snapshotAtMs: '1790964000000',
        unreadCount: 0,
        unseenCount: 0,
        rows: [],
        hasMore: false
      })
      .mockResolvedValueOnce({
        snapshotRevision: '8',
        snapshotAtMs: '1790964001000',
        unreadCount: 1,
        unseenCount: 1,
        rows: [notification({ revision: '8', createdRevision: '7' })],
        hasMore: false
      })
    const { service } = createService({ getRecoverySnapshot })

    const baseline = await service.recover(userId)
    const result = await service.recover(userId, baseline.cursor)

    expect(result.changes).toHaveLength(1)
    expect(result.changes[0]?.kind).toBe('created')
  })

  it('classifies dismissed state ahead of created/updated semantics', async () => {
    const getRecoverySnapshot = jest
      .fn()
      .mockResolvedValueOnce({
        snapshotRevision: '5',
        snapshotAtMs: '1790964000000',
        unreadCount: 0,
        unseenCount: 0,
        rows: [],
        hasMore: false
      })
      .mockResolvedValueOnce({
        snapshotRevision: '9',
        snapshotAtMs: '1790964001000',
        unreadCount: 0,
        unseenCount: 0,
        rows: [
          notification({
            revision: '9',
            createdRevision: '7',
            dismissedAt: '1790964000500'
          })
        ],
        hasMore: false
      })
    const { service } = createService({ getRecoverySnapshot })

    const baseline = await service.recover(userId)
    const result = await service.recover(userId, baseline.cursor)

    expect(result.changes[0]?.kind).toBe('dismissed')
  })

  it('writes notification creation and its wake-up intent in one unit of work', async () => {
    const insert = jest.fn().mockResolvedValue(notification({
      revision: '11',
      createdRevision: '11'
    }))
    const { service, outbox } = createService({ insert })

    await service.create({
      type: 'security.password_changed',
      recipientUserId: userId,
      dedupeKey: 'security.password_changed:audit-1'
    })

    expect(outbox.appendNotificationStateChanged).toHaveBeenCalledWith(
      expect.anything(),
      {
        recipientUserId: userId,
        dedupeKey: `notification-state:${userId}:created:11`
      }
    )
  })

  it('writes a state-change wake-up for an effective mutation', async () => {
    const setRead = jest.fn().mockResolvedValue({
      affected: 1,
      revision: '12'
    })
    const { service, outbox } = createService({ setRead })

    await expect(
      service.setRead(
        userId,
        '018f0f12-3d4c-7abc-8def-0123456789ac',
        true
      )
    ).resolves.toBe(true)

    expect(outbox.appendNotificationStateChanged).toHaveBeenCalledWith(
      expect.anything(),
      {
        recipientUserId: userId,
        dedupeKey: `notification-state:${userId}:read:12`
      }
    )
  })

  it('does not enqueue a wake-up for an idempotent no-op', async () => {
    const setRead = jest.fn().mockResolvedValue({
      affected: 0,
      revision: null
    })
    const { service, outbox } = createService({ setRead })

    await expect(
      service.setRead(
        userId,
        '018f0f12-3d4c-7abc-8def-0123456789ac',
        true
      )
    ).resolves.toBe(false)

    expect(outbox.appendNotificationStateChanged).not.toHaveBeenCalled()
  })

  it('rejects malformed synchronization cursors before persistence access', async () => {
    const getRecoverySnapshot = jest.fn()
    const { service } = createService({ getRecoverySnapshot })

    await expect(service.recover(userId, 'broken')).rejects.toThrow(
      'Invalid notification sync cursor'
    )
    expect(getRecoverySnapshot).not.toHaveBeenCalled()
  })
})
