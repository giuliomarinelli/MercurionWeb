import {
  ShutdownCoordinator,
  type ShutdownLogger,
  type ShutdownResource
} from './shutdown.coordinator'

const logger: ShutdownLogger = { log: jest.fn(), warn: jest.fn() }

describe('ShutdownCoordinator', () => {
  beforeEach(() => jest.clearAllMocks())

  it('closes resources in order and is idempotent for concurrent signals', async () => {
    const calls: string[] = []
    const resources: ShutdownResource[] = ['readiness', 'app', 'infrastructure'].map(name => ({
      name,
      close: async () => { calls.push(name) }
    }))
    const coordinator = new ShutdownCoordinator(resources, 100, logger)
    const first = coordinator.shutdown({ kind: 'signal', signal: 'SIGTERM' })
    const second = coordinator.shutdown({ kind: 'signal', signal: 'SIGINT' })

    expect(second).toBe(first)
    await first
    expect(calls).toEqual(['readiness', 'app', 'infrastructure'])
    expect(coordinator.state).toBe('closed')
  })

  it('continues after a resource failure and reports it', async () => {
    const calls: string[] = []
    const result = await new ShutdownCoordinator([
      { name: 'first', close: () => { calls.push('first'); throw new Error('first failed') } },
      { name: 'second', close: () => { calls.push('second') } }
    ], 100, logger).shutdown({ kind: 'fatal', error: new Error('fatal') })

    expect(calls).toEqual(['first', 'second'])
    expect(result.failures).toHaveLength(1)
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(logger.warn).toHaveBeenCalledWith('[SHUTDOWN_RESOURCE_FAILED]', expect.anything())
  })

  it('reports a hard timeout without waiting forever', async () => {
    let release!: () => void
    const result = await new ShutdownCoordinator([
      { name: 'stalled', close: () => new Promise<void>(resolve => { release = resolve }) }
    ], 5, logger).shutdown({ kind: 'signal', signal: 'SIGTERM' })

    expect(result.timedOut).toBe(true)
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(logger.warn).toHaveBeenCalledWith('[SHUTDOWN_TIMEOUT]', { timeoutMs: 5 })
    release()
  })
})
