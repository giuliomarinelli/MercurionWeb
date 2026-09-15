import { Global, Module } from '@nestjs/common'
import { AxiosExternalHttpAdapter } from './axios-external-http.adapter'
import { ExternalHttpMetricsPort, NoopExternalHttpMetrics } from './external-http.metrics'
import { ExternalHttpPort } from './external-http.port'

@Global()
@Module({
    providers: [
        AxiosExternalHttpAdapter,
        { provide: ExternalHttpPort, useExisting: AxiosExternalHttpAdapter },
        { provide: ExternalHttpMetricsPort, useClass: NoopExternalHttpMetrics },
    ],
    exports: [ExternalHttpPort],
})
export class ExternalHttpModule {}
