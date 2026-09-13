import { Injectable, Module, OnModuleDestroy } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { ShutdownCoordinator } from './shutdown.coordinator'

@Injectable()
class OwnedHandle implements OnModuleDestroy {
  closed = false

  onModuleDestroy(): void {
    this.closed = true
  }
}

@Module({ providers: [OwnedHandle], exports: [OwnedHandle] })
class ShutdownIntegrationModule {}

describe('shutdown application-context integration', () => {
  it('closes the Nest context and its owned handle', async () => {
    const context = await Test.createTestingModule({
      imports: [ShutdownIntegrationModule]
    }).compile()
    const handle = context.get(OwnedHandle)
    const coordinator = new ShutdownCoordinator([
      { name: 'application-context', close: () => context.close() }
    ], 100)

    const result = await coordinator.shutdown({ kind: 'signal', signal: 'SIGTERM' })

    expect(result.timedOut).toBe(false)
    expect(handle.closed).toBe(true)
    expect(coordinator.state).toBe('closed')
  })
})
