export type MetricTransport = 'http' | 'graphql' | 'socket.io' | 'nats' | 'database' | 'cache' | 'external'
export type MetricOutcome = 'success' | 'error' | 'timeout' | 'miss' | 'hit'

export interface MetricDimensions {
  readonly transport: MetricTransport
  readonly operation: string
  readonly outcome: MetricOutcome
  readonly statusClass?: '2xx' | '3xx' | '4xx' | '5xx'
}

export interface MetricSample extends MetricDimensions {
  readonly name: 'latency_ms' | 'count' | 'query_count' | 'cache_count'
  readonly value: number
}

const SAFE_OPERATION = /^[a-z0-9._:-]{1,64}$/

export function normalizeOperation(value: string): string {
  const normalized = value.trim().toLowerCase()
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/g, ':id')
    .replace(/\/\d+(?=\/|$)/g, '/:id')
    .replace(/\/:id/g, '-id')
    .replace(/[^a-z0-9._:-]+/g, '-')
  return SAFE_OPERATION.test(normalized) ? normalized : 'unknown'
}

export function assertBoundedDimensions(dimensions: MetricDimensions): MetricDimensions {
  const operation = normalizeOperation(dimensions.operation)
  if (operation === 'unknown' && dimensions.operation.trim() !== 'unknown') {
    throw new Error('Metric operation is not a bounded identifier')
  }
  return { ...dimensions, operation }
}

export abstract class MetricsPort {
  abstract record(sample: MetricSample): void
}

export class InMemoryMetrics extends MetricsPort {
  private readonly samples: MetricSample[] = []

  record(sample: MetricSample): void {
    const dimensions = assertBoundedDimensions(sample)
    this.samples.push({ ...sample, ...dimensions })
  }

  snapshot(): readonly MetricSample[] {
    return this.samples.map(sample => ({ ...sample }))
  }

  clear(): void {
    this.samples.length = 0
  }
}
