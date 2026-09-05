import {
  SOCKET_CONTRACT_VERSION,
  socketEventRegistry,
  type SocketApplicationError,
  type SocketSessionExpiredPayload,
  type SocketSessionInitAcknowledgement
} from '@mercurion/socket-contracts'

describe('Socket.IO contract registry', () => {
  it('keeps public and private test event directions and payloads stable', () => {
    expect(socketEventRegistry.publicTestRequest).toMatchObject({
      name: 'so.pub.public_test',
      direction: 'client-to-server',
      version: SOCKET_CONTRACT_VERSION
    })
    expect(socketEventRegistry.publicTestResponse.payload('PING RESP')).toBe('PING RESP')

    expect(socketEventRegistry.privateTestRequest).toMatchObject({
      name: 'so.pub.private_test',
      direction: 'client-to-server',
      version: SOCKET_CONTRACT_VERSION
    })
    expect(socketEventRegistry.privateTestResponse.payload('PING PRIVATE RESP'))
      .toBe('PING PRIVATE RESP')
  })

  it('defines the session-init acknowledgement without changing its wire value', () => {
    const acknowledgement: SocketSessionInitAcknowledgement = {
      detail: 'websocket session init successful'
    }

    expect(socketEventRegistry.sessionInit).toMatchObject({
      name: 'so.pub.session_init',
      direction: 'client-to-server',
      version: SOCKET_CONTRACT_VERSION
    })
    expect(socketEventRegistry.sessionInit.acknowledgement(acknowledgement))
      .toEqual(acknowledgement)
  })

  it('defines application errors and session expiration as server events', () => {
    const error: SocketApplicationError = {
      code: 'AUTHENTICATION_UNAUTHORIZED',
      detail: 'Unauthorized'
    }
    const expired: SocketSessionExpiredPayload = {
      detail: 'session expired',
      reason: 'expired'
    }

    expect(socketEventRegistry.applicationError.payload(error)).toEqual(error)
    expect(socketEventRegistry.sessionExpired.payload(expired)).toEqual(expired)
    expect(socketEventRegistry.applicationError.direction).toBe('server-to-client')
    expect(socketEventRegistry.sessionExpired.direction).toBe('server-to-client')
  })
})
