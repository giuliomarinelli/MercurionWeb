import type { DataSource } from 'typeorm'
import type { MeiliSearch } from 'meilisearch'
import type { LoggerContext, LoggerPort } from '../../../../logging/logger.port'
import type { MailSenderService } from '../mail-sender/mail-sender.service'
import type { OutboxRepository } from '../../../../persistence/outbox/outbox-repository'
import { OutboxConsumerRegistry } from '../../../../persistence/outbox/outbox-consumer-registry'
import { OutboxMetricsService } from '../../../../persistence/outbox/outbox-metrics.service'
import { NotificationOutboxDispatcherService } from './notification-outbox-dispatcher.service'

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
})
