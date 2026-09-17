import { EntityManager } from 'typeorm'
import { NotificationOutboxService } from './notification-outbox.service'
import { OutboxEventStatus } from '../../models/enums/outbox-event-status.enum'
import { HelpNotificationEventType } from '../../models/enums/help-notification-event-type.enum'

describe('NotificationOutboxService', () => {
  it('creates a pending versioned event with a stable dedupe key', async () => {
    const save = jest.fn(async (event) => event)
    const manager = {
      create: jest.fn((_entity, value) => value),
      save
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
    expect(event.id).toMatch(/[0-9a-f-]{36}/)
    expect(save).toHaveBeenCalledWith(event)
  })
})
