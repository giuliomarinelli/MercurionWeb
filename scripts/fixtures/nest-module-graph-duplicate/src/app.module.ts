import { Module } from '@nestjs/common';
import { RealtimeModule } from './realtime.module';

@Module({
  imports: [RealtimeModule, RealtimeModule],
})
export class AppModule {}
