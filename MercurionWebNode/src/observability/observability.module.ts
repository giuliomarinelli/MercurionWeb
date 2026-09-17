import { Global, Module } from '@nestjs/common'
import { InMemoryMetrics, MetricsPort } from './metrics'

@Global()
@Module({
  providers: [
    { provide: MetricsPort, useClass: InMemoryMetrics },
  ],
  exports: [MetricsPort],
})
export class ObservabilityModule {}
