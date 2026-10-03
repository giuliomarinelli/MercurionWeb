import { EntityManager } from 'typeorm'
import { NotificationOutboxService } from './notification-outbox.service'
import { OutboxEventStatus } from '../../models/enums/outbox-event-status.enum'
import { HelpNotificationEventType } from '../../models/enums/help-notification-event-type.enum'
import { OutboxEventType } from '../../models/enums/outbox-event-type.enum'

describe('NotificationOutboxService', () => {
  it('persists notification invalidation for the recipient with deduplication and trace metadata', async () => {
    const recipientUserId = '00000000-0000-0000-0000-000000000001'
    const correlationId = '00000000-0000-0000-0000-000000000002'
    const causationId = '00000000-0000-0000-0000-000000000003'
    const persisted = { id: '018f0f12-3d4c-7abc-8def-0123456789ab' }
    const query = jest.fn().mockResolvedValue([persisted])
    const findOneByOrFail = jest.fn().mockResolvedValue(persisted)
    const manager = {
      query,
      getRepository: jest.fn().mockReturnValue({ findOneByOrFail })
    } as unknown as EntityManager

    const event = await new NotificationOutboxService().appendNotificationStateChanged(manager, {
      recipientUserId,
      dedupeKey: 'notification:state:changed',
      correlationId,
      causationId
    })

    expect(event).toBe(persisted)
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT (dedupe_key) DO NOTHING'),
      [
        expect.any(String), recipientUserId, OutboxEventType.NotificationStateChanged, 1,
        JSON.stringify({ recipientUserId }), OutboxEventStatus.Pending, 0,
        expect.any(String), expect.any(String), null, null, null, null,
        'notification:state:changed', correlationId, causationId, expect.any(String)
      ]
    )
    expect(findOneByOrFail).toHaveBeenCalledWith(persisted)
  })

  it('creates a pending versioned event with a stable dedupe key', async () => {
    const findOneByOrFail = jest.fn(async (criteria: { id?: string }) => ({
      id: criteria.id,
      aggregateId: '00000000-0000-0000-0000-000000000001',
      eventType: HelpNotificationEventType.UserMessageAdded,
      version: 1,
      payload: { ticketId: '00000000-0000-0000-0000-000000000001' },
      status: OutboxEventStatus.Pending,
      attemptCount: 0,
      availableAt: '123',
      createdAt: '123',
      claimedAt: null,
      claimedBy: null,
      processedAt: null,
      lastError: null,
      dedupeKey: 'help:ticket:message:user',
      correlationId: null,
      causationId: null,
      occurredAt: '123'
    }))
    const query = jest.fn().mockResolvedValue([
      { id: '018f0f12-3d4c-7abc-8def-0123456789ab' }
    ])
    const manager = {
      query,
      getRepository: jest.fn().mockReturnValue({ findOneByOrFail })
    } as unknown as EntityManager

    const service = new NotificationOutboxService()
    const event = await service.append(manager, {
      aggregateId: '00000000-0000-0000-0000-000000000001',
      eventType: HelpNotificationEventType.UserMessageAdded,
      payload: { ticketId: '00000000-0000-0000-0000-000000000001' },
      dedupeKey: 'help:ticket:message:user',
      now: 123
    })

    expect(event).toMatchObject({
      aggregateId: '00000000-0000-0000-0000-000000000001',
      eventType: HelpNotificationEventType.UserMessageAdded,
      version: 1,
      status: OutboxEventStatus.Pending,
      attemptCount: 0,
      availableAt: '123',
      createdAt: '123',
      dedupeKey: 'help:ticket:message:user'
    })
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT (dedupe_key) DO NOTHING'),
      expect.arrayContaining(['help:ticket:message:user'])
    )
  })

  it('reuses the dedupe winner without aborting the transaction', async () => {
    const existing = {
      id: '018f0f12-3d4c-7abc-8def-0123456789ab',
      dedupeKey: 'same-event'
    }
    const findOneByOrFail = jest.fn().mockResolvedValue(existing)
    const manager = {
      query: jest.fn().mockResolvedValue([]),
      getRepository: jest.fn().mockReturnValue({ findOneByOrFail })
    } as unknown as EntityManager

    const service = new NotificationOutboxService()
    const event = await service.append(manager, {
      aggregateId: '00000000-0000-0000-0000-000000000001',
      eventType: HelpNotificationEventType.UserMessageAdded,
      payload: {},
      dedupeKey: 'same-event',
      now: 123
    })

    expect(event).toBe(existing)
    expect(findOneByOrFail).toHaveBeenCalledWith({
      dedupeKey: 'same-event'
    })
  })
})
