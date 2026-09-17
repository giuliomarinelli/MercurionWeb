import { InMemoryMetrics, assertBoundedDimensions, normalizeOperation } from './metrics'

describe('observability metrics', () => {
  it('normalizes route-like operations without accepting high-cardinality values', () => {
    expect(normalizeOperation(' GET /api/molecules/123 ')).toBe('get-api-molecules-id')
    expect(() => assertBoundedDimensions({
      transport: 'http',
      operation: 'route with spaces',
      outcome: 'success'
    })).not.toThrow()
  })

  it('records only documented bounded dimensions', () => {
    const metrics = new InMemoryMetrics()
    metrics.record({
      name: 'latency_ms',
      value: 12,
      transport: 'graphql',
      operation: 'molecule.read',
      outcome: 'success'
    })
    expect(metrics.snapshot()).toEqual([{
      name: 'latency_ms',
      value: 12,
      transport: 'graphql',
      operation: 'molecule.read',
      outcome: 'success'
    }])
  })
})
