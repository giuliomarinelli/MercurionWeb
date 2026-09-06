import {
  INITIAL_SESSION_PROTOCOL,
  SessionConnectionState,
  SessionInvalidationCause,
  SessionState,
  SessionTransition,
  sessionInvalidationCauseForApplicationError,
  transitionSessionProtocol
} from '@mercurion/rest-contracts'
import {
  socketEventRegistry,
  type SocketSessionExpiredPayload
} from '@mercurion/socket-contracts'

describe('session protocol contract', () => {
  it('uses the same authenticated state for REST credential refresh and socket initialization', () => {
    const authenticated = transitionSessionProtocol(
      transitionSessionProtocol(
        INITIAL_SESSION_PROTOCOL,
        SessionTransition.BeginAuthentication,
        SessionConnectionState.Connected
      ),
      SessionTransition.AuthenticationSucceeded,
      SessionConnectionState.Connected
    )
    const refreshed = transitionSessionProtocol(
      authenticated,
      SessionTransition.CredentialsRefreshed
    )

    expect(authenticated.state).toBe(SessionState.Authenticated)
    expect(refreshed).toMatchObject({
      state: SessionState.Authenticated,
      connection: SessionConnectionState.Connected
    })
    expect(socketEventRegistry.sessionInit.acknowledgement({
      detail: 'websocket session init successful',
      state: 'authenticated'
    }).state).toBe(authenticated.state)
  })

  it('maps expired and revoked server events to explicit invalid states', () => {
    const authenticated = transitionSessionProtocol(
      transitionSessionProtocol(INITIAL_SESSION_PROTOCOL, SessionTransition.BeginAuthentication),
      SessionTransition.AuthenticationSucceeded
    )
    const expired = transitionSessionProtocol(authenticated, SessionTransition.SessionExpired)
    const revoked = transitionSessionProtocol(authenticated, SessionTransition.SessionRevoked)
    const socketExpired: SocketSessionExpiredPayload = {
      detail: 'session expired',
      state: 'invalid',
      cause: 'session-expired'
    }

    expect(expired).toMatchObject({
      state: SessionState.Invalid,
      cause: SessionInvalidationCause.SessionExpired
    })
    expect(revoked).toMatchObject({
      state: SessionState.Invalid,
      cause: SessionInvalidationCause.SessionRevoked
    })
    expect(socketEventRegistry.sessionExpired.payload(socketExpired)).toEqual(socketExpired)
  })

  it('keeps validity separate from reconnect and makes logout public', () => {
    const authenticated = transitionSessionProtocol(
      transitionSessionProtocol(INITIAL_SESSION_PROTOCOL, SessionTransition.BeginAuthentication),
      SessionTransition.AuthenticationSucceeded
    )
    const reconnecting = transitionSessionProtocol(
      authenticated,
      SessionTransition.ReconnectRequired
    )
    const loggedOut = transitionSessionProtocol(reconnecting, SessionTransition.Logout)

    expect(reconnecting).toMatchObject({
      state: SessionState.Authenticated,
      connection: SessionConnectionState.ReconnectRequired,
      cause: SessionInvalidationCause.ReconnectRequired
    })
    expect(loggedOut).toEqual({
      state: SessionState.Public,
      connection: SessionConnectionState.ReconnectRequired
    })
  })

  it('maps legacy HTTP error codes to the same typed causes as sockets', () => {
    expect(sessionInvalidationCauseForApplicationError('ACCESS_TOKEN_INVALID_OR_EXPIRED'))
      .toBe(SessionInvalidationCause.SessionExpired)
    expect(sessionInvalidationCauseForApplicationError('TOKEN_REVOKED'))
      .toBe(SessionInvalidationCause.SessionRevoked)
    expect(sessionInvalidationCauseForApplicationError('SESSION_SIGNATURE_INVALID'))
      .toBe(SessionInvalidationCause.InvalidSignature)
    expect(sessionInvalidationCauseForApplicationError('AUTHENTICATION_INVALID_CREDENTIALS'))
      .toBe(SessionInvalidationCause.InvalidCredentials)
  })
})
