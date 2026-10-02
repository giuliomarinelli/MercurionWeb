import type { DataSource } from 'typeorm'
import type { MeiliSearch } from 'meilisearch'
import type { LoggerContext, LoggerPort } from '../../../../logging/logger.port'
import type { MailSenderService } from '../mail-sender/mail-sender.service'
import type { OutboxRepository } from '../../../../persistence/outbox/outbox-repository'
import { OutboxConsumerRegistry } from '../../../../persistence/outbox/outbox-consumer-registry'
import { OutboxMetricsService } from '../../../../persistence/outbox/outbox-metrics.service'
import { OutboxEventType } from '../../models/enums/outbox-event-type.enum'
import { NotificationOutboxDispatcherService } from './notification-outbox-dispatcher.service'
import { RealtimePublisherService } from '../../../socket-io/realtime-publisher.service'
import { socketEventRegistry } from '@mercurion/socket-contracts'

describe('NotificationOutboxDispatcherService', () => {
  const logger = {
    error: jest.fn(),
    warn: jest.fn()
  } as unknown as LoggerContext
  const loggerFactory = {
    forContext: jest.fn().mockReturnValue(logger)
  } as unknown as LoggerPort
  const mailer = {} as MailSenderService
  const meiliClient = {} as MeiliSearch
  const realtimePublisher = {
    emitToUser: jest.fn()
  } as unknown as RealtimePublisherService

  beforeEach(() => jest.clearAllMocks())
  afterEach(() => jest.restoreAllMocks())

  it('fails bootstrap before scheduling polling when the shared repository is unavailable', async () => {
    const failure = new Error('relation "outbox_events" does not exist')
    const outbox = {
      claimBatch: jest.fn().mockRejectedValue(failure)
    } as unknown as OutboxRepository
    const service = new NotificationOutboxDispatcherService(
      {} as DataSource,
      mailer,
      meiliClient,
      new OutboxConsumerRegistry(),
      outbox,
      new OutboxMetricsService(),
      realtimePublisher,
      loggerFactory
    )

    await expect(service.onModuleInit()).rejects.toBe(failure)
  })

  it('contains and logs polling failures after a successful bootstrap dispatch', async () => {
    const outbox = {
      claimBatch: jest.fn().mockResolvedValue([])
    } as unknown as OutboxRepository
    const service = new NotificationOutboxDispatcherService(
      {} as DataSource,
      mailer,
      meiliClient,
      new OutboxConsumerRegistry(),
      outbox,
      new OutboxMetricsService(),
      realtimePublisher,
      loggerFactory
    )
    const failure = new Error('database unavailable')
    jest.spyOn(service, 'dispatchOnce')
      .mockResolvedValueOnce(false)
      .mockRejectedValueOnce(failure)
    const interval = jest.spyOn(global, 'setInterval').mockImplementation(callback => {
      void (callback as () => void)()
      return {} as ReturnType<typeof setInterval>
    })
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval').mockImplementation()

    await service.onModuleInit()
    await new Promise(resolve => setImmediate(resolve))

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(logger.error).toHaveBeenCalledWith(
      '[OUTBOX_DISPATCH_FAILED] database unavailable',
      failure.stack
    )

    await service.onModuleDestroy()
    expect(clearIntervalSpy.mock.calls.length).toBeGreaterThan(0)
    interval.mockRestore()
    clearIntervalSpy.mockRestore()
  })

  it('registers notification wake-ups that publish only to the owning user room', async () => {
    const registry = new OutboxConsumerRegistry()
    const outbox = {
      claimBatch: jest.fn().mockResolvedValue([])
    } as unknown as OutboxRepository
    const service = new NotificationOutboxDispatcherService(
      {} as DataSource,
      mailer,
      meiliClient,
      registry,
      outbox,
      new OutboxMetricsService(),
      realtimePublisher,
      loggerFactory
    )
    const interval = jest.spyOn(global, 'setInterval').mockReturnValue(
      {} as ReturnType<typeof setInterval>
    )
    jest.spyOn(global, 'clearInterval').mockImplementation()

    await service.onModuleInit()
    const consumer = registry.resolve(OutboxEventType.NotificationStateChanged, 1)
    expect(consumer).toBeDefined()

    await consumer?.({
      id: '018f0f12-3d4c-7abc-8def-0123456789aa',
      eventType: OutboxEventType.NotificationStateChanged,
      version: 1,
      aggregateId: '018f0f12-3d4c-7abc-8def-0123456789ab',
      correlationId: null,
      causationId: null,
      payload: {
        recipientUserId: '018f0f12-3d4c-7abc-8def-0123456789ab'
      },
      occurredAt: '1',
      createdAt: '1',
      availableAt: '1',
      attemptCount: 0,
      state: 'pending',
      claimedAt: null,
      claimedBy: null,
      processedAt: null,
      lastError: null
    })

    expect(realtimePublisher.emitToUser).toHaveBeenCalledWith(
      '018f0f12-3d4c-7abc-8def-0123456789ab',
      socketEventRegistry.notificationChanged.name,
      { kind: 'notification-state-changed' }
    )

    await service.onModuleDestroy()
    interval.mockRestore()
  })
})
