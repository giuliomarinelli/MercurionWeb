import type { DataSource, Repository } from 'typeorm'
import type { LoggerContext, LoggerPort } from '../../../../logging/logger.port'
import type { MailSenderService } from '../mail-sender/mail-sender.service'
import type { NotificationOutboxEvent } from '../../models/entities/notification-outbox-event.entity'
import { NotificationOutboxDispatcherService } from './notification-outbox-dispatcher.service'

describe('NotificationOutboxDispatcherService', () => {
  const logger = {
    error: jest.fn()
  } as unknown as LoggerContext
  const loggerFactory = {
    forContext: jest.fn().mockReturnValue(logger)
  } as unknown as LoggerPort
  const repository = {
    update: jest.fn()
  } as unknown as Repository<NotificationOutboxEvent>
  const mailer = {} as MailSenderService
  const meiliClient = {} as never

  beforeEach(() => jest.clearAllMocks())
  afterEach(() => jest.restoreAllMocks())

  it('fails bootstrap with the original database error before scheduling polling', async () => {
    const failure = new Error('relation "notification_outbox_events" does not exist')
    const dataSource = {
      transaction: jest.fn().mockRejectedValue(failure)
    } as unknown as DataSource
    const interval = jest.spyOn(global, 'setInterval')
    const service = new NotificationOutboxDispatcherService(
      dataSource,
      repository,
      mailer,
      meiliClient,
      loggerFactory
    )

    await expect(service.onModuleInit()).rejects.toBe(failure)

    expect(interval).not.toHaveBeenCalled()
  })

  it('contains and logs polling failures after a successful bootstrap dispatch', async () => {
    let scheduled: (() => void) | undefined
    const interval = jest.spyOn(global, 'setInterval').mockImplementation(callback => {
      scheduled = callback as () => void
      return {} as ReturnType<typeof setInterval>
    })
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval').mockImplementation()
    const dataSource = {
      transaction: jest.fn()
    } as unknown as DataSource
    const service = new NotificationOutboxDispatcherService(
      dataSource,
      repository,
      mailer,
      meiliClient,
      loggerFactory
    )
    const failure = new Error('database unavailable')
    jest.spyOn(service, 'dispatchOnce')
      .mockResolvedValueOnce(false)
      .mockRejectedValueOnce(failure)

    await service.onModuleInit()
    scheduled?.()
    await new Promise(resolve => setImmediate(resolve))

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(logger.error).toHaveBeenCalledWith(
      '[NOTIFICATION_OUTBOX_DISPATCH_FAILED] database unavailable',
      failure.stack
    )

    await service.onModuleDestroy()
    expect(clearIntervalSpy).toHaveBeenCalled()
    interval.mockRestore()
    clearIntervalSpy.mockRestore()
  })
})
