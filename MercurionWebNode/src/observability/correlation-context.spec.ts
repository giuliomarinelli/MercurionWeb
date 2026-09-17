import {
  CORRELATION_ID_HEADER,
  createCorrelationContext,
  getCorrelationId,
  isValidCorrelationId,
  runWithCorrelationContext,
  toCorrelatedEnvelope,
  withCorrelationHeader
} from './correlation-context'

describe('correlation context', () => {
  it('validates and replaces untrusted inbound ids', () => {
    expect(isValidCorrelationId('request-123')).toBe(true)
    expect(isValidCorrelationId('bad value')).toBe(false)
    expect(createCorrelationContext('http', 'bad value').correlationId).not.toBe('bad value')
  })

  it('isolates concurrent async operations', async () => {
    const results = await Promise.all(
      ['first', 'second'].map(id => {
        const context = createCorrelationContext('http', id)
        return runWithCorrelationContext(context, async () => {
          await new Promise(resolve => setTimeout(resolve, id === 'first' ? 5 : 1))
          return getCorrelationId()
        })
      })
    )
    expect(results).toEqual(['first', 'second'])
  })

  it('uses the same id for headers and NATS-style envelopes', () => {
    const context = createCorrelationContext('graphql', 'graphql-1')
    expect(withCorrelationHeader({}, context)[CORRELATION_ID_HEADER]).toBe('graphql-1')
    expect(toCorrelatedEnvelope({ ok: true }, context).correlationId).toBe('graphql-1')
  })
})
