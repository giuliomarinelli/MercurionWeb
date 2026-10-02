import { Module } from '@nestjs/common'

import { RealtimePublisherService } from './realtime-publisher.service'

@Module({
  providers: [RealtimePublisherService],
  exports: [RealtimePublisherService]
})
export class RealtimeModule {}
