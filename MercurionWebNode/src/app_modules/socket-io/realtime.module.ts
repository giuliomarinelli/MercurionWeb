import { Module } from '@nestjs/common'

import { RealtimePublisherService } from './realtime-publisher.service'
import { RealtimeStateSyncService } from './realtime-state-sync.service'

@Module({
  providers: [RealtimePublisherService, RealtimeStateSyncService],
  exports: [RealtimePublisherService, RealtimeStateSyncService]
})
export class RealtimeModule {}
