import { Global, Module } from '@nestjs/common'

import { RealtimePublisherService } from './realtime-publisher.service'
import { RealtimeStateSyncService } from './realtime-state-sync.service'
import { LoggingModule } from 'src/logging/logging.module'

@Global()
@Module({
  imports: [LoggingModule],
  providers: [RealtimePublisherService, RealtimeStateSyncService],
  exports: [RealtimePublisherService, RealtimeStateSyncService]
})
export class RealtimeModule {}
