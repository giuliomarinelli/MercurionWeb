import { Global, Module } from '@nestjs/common'

import { UnitOfWork } from './transaction-context'
import { OutboxConsumerRegistry } from './outbox/outbox-consumer-registry'
import { OutboxMetricsService } from './outbox/outbox-metrics.service'

@Global()
@Module({
  providers: [UnitOfWork, OutboxConsumerRegistry, OutboxMetricsService],
  exports: [UnitOfWork, OutboxConsumerRegistry, OutboxMetricsService]
})
export class PersistenceModule {}
