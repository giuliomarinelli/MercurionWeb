import { socketEventRegistry } from '@mercurion/socket-contracts'

import { RealtimePublisherService } from './realtime-publisher.service'

describe('RealtimePublisherService', () => {
  it('publishes typed user events to the canonical user room', () => {
    const emit = jest.fn()
    const to = jest.fn().mockReturnValue({ emit })
    const publisher = new RealtimePublisherService()

    publisher.setServer({ to } as never)
    publisher.emitToUser(
      '018f0f12-3d4c-7abc-8def-0123456789ab',
      socketEventRegistry.notificationChanged.name,
      { kind: 'notification-state-changed' }
    )

    expect(to).toHaveBeenCalledWith(
      'ws_user:018f0f12-3d4c-7abc-8def-0123456789ab'
    )
    expect(emit).toHaveBeenCalledWith(
      socketEventRegistry.notificationChanged.name,
      { kind: 'notification-state-changed' }
    )
  })

  it('fails explicitly before the Socket.IO server is initialized', () => {
    const publisher = new RealtimePublisherService()

    expect(() =>
      publisher.emitToUser(
        '018f0f12-3d4c-7abc-8def-0123456789ab',
        socketEventRegistry.notificationChanged.name,
        { kind: 'notification-state-changed' }
      )
    ).toThrow('Realtime Socket.IO server is not initialized')
  })
})
