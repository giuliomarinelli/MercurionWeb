import {
  BadRequestException,
  NotFoundException
} from '@nestjs/common'

import { InAppNotificationController } from './in-app-notification.controller'
import { InAppNotificationService } from '../services/in-app-notification.service'

describe('InAppNotificationController', () => {
  const userId = '018f0f12-3d4c-7abc-8def-0123456789ab'

  function createController(
    overrides: Partial<InAppNotificationService> = {}
  ) {
    const service = {
      recover: jest.fn(),
      list: jest.fn(),
      get: jest.fn(),
      setRead: jest.fn(),
      markAllReadThrough: jest.fn(),
      markSeenThrough: jest.fn(),
      dismiss: jest.fn(),
      dismissAllThrough: jest.fn(),
      ...overrides
    } as unknown as InAppNotificationService

    return {
      controller: new InAppNotificationController(service),
      service
    }
  }

  it('establishes recovery through the authenticated user boundary', async () => {
    const response = {
      cursor: 'n1.MA',
      snapshotAt: '2026-10-02T20:00:00.000Z',
      unreadCount: 0,
      unseenCount: 0,
      changes: [],
      hasMore: false
    }
    const recover = jest.fn().mockResolvedValue(response)
    const { controller } = createController({ recover })

    await expect(
      controller.recover(userId, undefined, 50)
    ).resolves.toBe(response)
    expect(recover).toHaveBeenCalledWith(userId, undefined, 50)
  })

  it('translates invalid opaque cursors into a bad request', async () => {
    const recover = jest.fn().mockRejectedValue(
      new RangeError('Invalid notification sync cursor')
    )
    const { controller } = createController({ recover })

    await expect(
      controller.recover(userId, 'broken', 50)
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('does not expose another user notification through detail', async () => {
    const get = jest.fn().mockResolvedValue(null)
    const { controller } = createController({ get })

    await expect(
      controller.get(
        userId,
        '018f0f12-3d4c-7abc-8def-0123456789ac'
      )
    ).rejects.toBeInstanceOf(NotFoundException)
  })

  it('keeps read mutations idempotent at the HTTP boundary', async () => {
    const setRead = jest.fn().mockResolvedValue(false)
    const { controller } = createController({ setRead })

    await expect(
      controller.setRead(
        userId,
        '018f0f12-3d4c-7abc-8def-0123456789ac',
        { read: true }
      )
    ).resolves.toBeUndefined()

    expect(setRead).toHaveBeenCalledWith(
      userId,
      '018f0f12-3d4c-7abc-8def-0123456789ac',
      true
    )
  })
})
