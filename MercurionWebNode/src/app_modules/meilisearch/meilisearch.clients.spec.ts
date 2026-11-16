import { Test } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { DataSource } from 'typeorm'
import { Meilisearch } from 'meilisearch'
import { meilisearchClientProviders } from './meilisearch.clients'
import { NotificationOutboxDispatcherService } from '../notification/services/outbox/notification-outbox-dispatcher.service'
import { MailSenderService } from '../notification/services/mail-sender/mail-sender.service'
import { OutboxConsumerRegistry } from '../../persistence/outbox/outbox-consumer-registry'
import { OutboxRepository } from '../../persistence/outbox/outbox-repository'
import { OutboxMetricsService } from '../../persistence/outbox/outbox-metrics.service'
import { RealtimePublisherService } from '../socket-io/realtime-publisher.service'
import { LoggerPort } from '../../logging/logger.port'
import { OutboxEventType } from '../notification/models/enums/outbox-event-type.enum'

describe('Meilisearch consumer credentials', () => {
  afterEach(() => jest.restoreAllMocks())

  it('injects the dedicated writer into every outbox mutation without using search credentials', async () => {
    const registry = new OutboxConsumerRegistry()
    const module = await Test.createTestingModule({
      providers: [
        ...meilisearchClientProviders,
        NotificationOutboxDispatcherService,
        { provide: ConfigService, useValue: new ConfigService({ Meilisearch: {
          host: 'http://meili.invalid:7700', masterKey: 'synthetic-search-key', logKey: 'synthetic-writer-key'
        } }) },
        { provide: DataSource, useValue: {} },
        { provide: MailSenderService, useValue: {} },
        { provide: OutboxConsumerRegistry, useValue: registry },
        { provide: OutboxRepository, useValue: { claimBatch: jest.fn().mockResolvedValue([]) } },
        OutboxMetricsService,
        { provide: RealtimePublisherService, useValue: {} },
        { provide: LoggerPort, useValue: { forContext: () => ({}) } }
      ]
    }).compile()
    const search = module.get<Meilisearch>('MEILISEARCH_CLIENT')
    const writer = module.get<Meilisearch>('MEILISEARCH_LOG_CLIENT')
    expect(search).not.toBe(writer)
    expect(search.config.apiKey).toBe('synthetic-search-key')
    expect(writer.config.apiKey).toBe('synthetic-writer-key')
    expect(search.config.host).toBe(writer.config.host)
    const searchIndex = jest.spyOn(search, 'index')
    const addDocuments = jest.fn().mockResolvedValue({ taskUid: 1 })
    const deleteDocument = jest.fn().mockResolvedValue({ taskUid: 2 })
    const writerIndex = jest.spyOn(writer, 'index').mockReturnValue({ addDocuments, deleteDocument } as never)
    jest.spyOn(global, 'setInterval').mockReturnValue({} as ReturnType<typeof setInterval>)
    jest.spyOn(global, 'clearInterval').mockImplementation()
    try {
      await module.get(NotificationOutboxDispatcherService).onModuleInit()
      for (const [eventType, indexName] of [
        [OutboxEventType.LogRecorded, 'logs_staging'],
        [OutboxEventType.SecurityAuditRecorded, 'security_logs_staging'],
        [OutboxEventType.MeilisearchUpsert, 'legacy-index'],
        [OutboxEventType.MeilisearchDelete, 'legacy-index']
      ] as const) {
        const document = { id: 'synthetic-event' }
        await registry.resolve(eventType, 1)!({
          id: '018f0f12-3d4c-7abc-8def-0123456789aa', eventType, version: 1,
          aggregateId: '018f0f12-3d4c-7abc-8def-0123456789ab', correlationId: null, causationId: null,
          payload: { indexName, document, documentId: document.id }, occurredAt: '1', createdAt: '1', availableAt: '1',
          attemptCount: 0, state: 'pending', claimedAt: null, claimedBy: null, processedAt: null, lastError: null
        })
        expect(writerIndex).toHaveBeenLastCalledWith(indexName)
        if (eventType === OutboxEventType.MeilisearchDelete) {
          expect(deleteDocument).toHaveBeenCalledWith(document.id)
        } else {
          expect(addDocuments).toHaveBeenLastCalledWith([document], { primaryKey: 'id' })
        }
      }
      expect(searchIndex).not.toHaveBeenCalled()
    } finally {
      await module.close()
    }
  })
})
