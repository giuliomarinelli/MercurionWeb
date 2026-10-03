import { RealtimeStateSyncService } from './realtime-state-sync.service'

const payload = {
  kind: 'resource-state-changed' as const,
  domain: 'molecule' as const,
  change: 'updated' as const,
  resourceId: '018f0f12-3d4c-7abc-8def-0123456789ab'
}

describe('RealtimeStateSyncService', () => {
  it('excludes the supplied origin client when publishing to a user', () => {
    const emitToUserExceptClient = jest.fn()
    const logger = { warn: jest.fn() }
    const service = new RealtimeStateSyncService(
      { emitToUserExceptClient } as never,
      { forContext: jest.fn().mockReturnValue(logger) } as never
    )

    expect(() => service.publishToUser(
      '018f0f12-3d4c-7abc-8def-0123456789ac',
      payload,
      '0190-client-tab'
    )).not.toThrow()

    expect(emitToUserExceptClient).toHaveBeenCalledWith(
      '018f0f12-3d4c-7abc-8def-0123456789ac',
      '0190-client-tab',
      'sv.pub.state_changed',
      payload
    )
  })

  it('swallows transport failures because state invalidation is best effort', () => {
    const failure = new Error('socket unavailable')
    const logger = { warn: jest.fn() }
    const service = new RealtimeStateSyncService(
      {
        emitToUserExceptClient: jest.fn(() => {
          throw failure
        })
      } as never,
      { forContext: jest.fn().mockReturnValue(logger) } as never
    )

    expect(() => service.publishToUser(
      '018f0f12-3d4c-7abc-8def-0123456789ac',
      payload,
      '0190-client-tab'
    )).not.toThrow()

    expect(logger.warn).toHaveBeenCalledWith(
      'Best-effort realtime state invalidation failed',
      failure
    )
  })

  it('deduplicates affected users before broadcasting', () => {
    const emitToUserExceptClient = jest.fn()
    const service = new RealtimeStateSyncService(
      { emitToUserExceptClient } as never,
      { forContext: jest.fn().mockReturnValue({ warn: jest.fn() }) } as never
    )

    service.publishToUsers(
      ['user-a', 'user-a', 'user-b'],
      payload,
      'client-a'
    )

    expect(emitToUserExceptClient).toHaveBeenCalledTimes(2)
  })
})
