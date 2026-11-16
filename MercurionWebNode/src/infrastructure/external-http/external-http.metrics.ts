export interface ExternalHttpMetric {
    readonly method: string
    readonly host: string
    readonly outcome: 'success' | 'failure'
    readonly status?: number
    readonly kind?: string
    readonly latencyMs: number
}

export abstract class ExternalHttpMetricsPort {
    abstract record(metric: ExternalHttpMetric): void
}

export class NoopExternalHttpMetrics extends ExternalHttpMetricsPort {
    record(metric: ExternalHttpMetric): void {
        void metric
    }
}
