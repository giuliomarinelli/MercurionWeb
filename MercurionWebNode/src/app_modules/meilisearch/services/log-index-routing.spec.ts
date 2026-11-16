import { Test } from '@nestjs/testing'
import { DataSource, EntityManager } from 'typeorm'
import { createTestConfigurationModule } from 'src/test-utils/configuration'
import { Environment } from 'src/config/config.schema'
import { NotificationOutboxService } from 'src/app_modules/notification/services/outbox/notification-outbox.service'
import { OutboxEventType } from 'src/app_modules/notification/models/enums/outbox-event-type.enum'
import { runInTransaction } from 'src/persistence/transaction-context'
import { MeiliLoggerService } from './meili-logger.service'
import { SecurityAuditService } from './security-audit.service'

describe.each(Object.values(Environment))('log routing for APP_ENV=%s', appEnv => {
  it('records separate destinations for every system level and audit action, including an existing transaction', async () => {
    const manager = {} as EntityManager
    const dataSource = { transaction: jest.fn(async (work: (value: EntityManager) => Promise<void>) => work(manager)) }
    const append = jest.fn().mockResolvedValue(undefined)
    const module = await Test.createTestingModule({
      imports: [createTestConfigurationModule({ APP_ENV: appEnv, NODE_ENV: 'production' })],
      providers: [MeiliLoggerService, SecurityAuditService,
        { provide: NotificationOutboxService, useValue: { append } },
        { provide: DataSource, useValue: dataSource }]
    }).compile()
    try {
      const logger = module.get(MeiliLoggerService)
      for (const level of ['log', 'error', 'warn', 'debug', 'verbose', 'fatal'] as const) {
        logger[level]('synthetic system event')
      }
      await new Promise<void>(resolve => setImmediate(resolve))
      expect(append).toHaveBeenCalledTimes(6)
      for (const [eventManager, event] of append.mock.calls as [EntityManager, { eventType: string; payload: { indexName: string; document: { level: string } } }][]) {
        expect(eventManager).toBe(manager)
        expect(event.eventType).toBe(OutboxEventType.LogRecorded)
        expect(event.payload.indexName).toBe(`logs_${appEnv}`)
      }
      append.mockClear()
      const audit = module.get(SecurityAuditService)
      const user = '00000000-0000-0000-0000-000000000001'
      await audit.passwordChanged(user)
      await audit.emailChanged(user, '***@old.test', '***@new.test')
      await audit.phoneChanged(user, '***111', '***222')
      await audit.mfaEnabled(user, 'APP_TOTP')
      await audit.mfaDisabled(user, 'APP_TOTP')
      await audit.accountRecovery(user, 'ACCOUNT_RECOVERY_TOKEN_GENERATED')
      await runInTransaction(dataSource as unknown as DataSource, async context => {
        await audit.accountRecovery(user, 'ACCOUNT_RECOVERY_ACCOUNT_RECOVERED', context)
      })
      expect(append).toHaveBeenCalledTimes(7)
      for (const [eventManager, event] of append.mock.calls as [EntityManager, { eventType: string; payload: { indexName: string } }][]) {
        expect(eventManager).toBe(manager)
        expect(event.eventType).toBe(OutboxEventType.SecurityAuditRecorded)
        expect(event.payload.indexName).toBe(`security_logs_${appEnv}`)
      }
    } finally {
      await module.close()
    }
  })
})
