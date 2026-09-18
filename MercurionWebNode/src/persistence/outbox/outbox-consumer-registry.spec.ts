import { OutboxConsumerRegistry } from './outbox-consumer-registry'

describe('OutboxConsumerRegistry', () => {
  it('resolves consumers by independently versioned event contract', async () => {
    const registry = new OutboxConsumerRegistry()
    const handler = jest.fn().mockResolvedValue(undefined)

    registry.register('molecule.updated', 1, handler)

    await registry.resolve('molecule.updated', 1)?.({
      id: '00000000-0000-0000-0000-000000000001',
      eventType: 'molecule.updated',
      version: 1,
      aggregateId: '00000000-0000-0000-0000-000000000001',
      correlationId: null,
      causationId: null,
      payload: { moleculeId: '1' },
      occurredAt: '100',
      createdAt: '100',
      availableAt: '100',
      attemptCount: 1,
      state: 'processing',
      claimedAt: '100',
      claimedBy: 'worker',
      processedAt: null,
      lastError: null
    })

    expect(handler).toHaveBeenCalledTimes(1)
    expect(registry.resolve('molecule.updated', 2)).toBeUndefined()
  })

  it('rejects duplicate registrations for the same version', () => {
    const registry = new OutboxConsumerRegistry()
    registry.register('help.ticket-opened', 1, jest.fn())

    expect(() => registry.register('help.ticket-opened', 1, jest.fn()))
      .toThrow('Outbox consumer already registered')
  })
})
