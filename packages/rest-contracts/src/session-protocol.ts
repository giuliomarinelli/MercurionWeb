/**
 * Canonical session protocol (SYS-010).
 *
 * This contract describes session validity, not Socket.IO connectivity. A
 * public socket is valid while the browser is in `public`; a disconnected
 * socket is represented by `connection`, without changing session validity.
 */
export const SessionState = Object.freeze({
  Public: 'public',
  Authenticating: 'authenticating',
  Authenticated: 'authenticated',
  Invalid: 'invalid'
} as const)
export type SessionState = (typeof SessionState)[keyof typeof SessionState]

export const SessionConnectionState = Object.freeze({
  Connected: 'connected',
  Disconnected: 'disconnected',
  ReconnectRequired: 'reconnect-required'
} as const)
export type SessionConnectionState =
  (typeof SessionConnectionState)[keyof typeof SessionConnectionState]

export const SessionInvalidationCause = Object.freeze({
  SessionExpired: 'session-expired',
  SessionRevoked: 'session-revoked',
  InvalidSignature: 'invalid-signature',
  InvalidCredentials: 'invalid-credentials',
  InvalidSession: 'invalid-session',
  ReconnectRequired: 'reconnect-required'
} as const)
export type SessionInvalidationCause =
  (typeof SessionInvalidationCause)[keyof typeof SessionInvalidationCause]

export const SessionTransition = Object.freeze({
  BeginAuthentication: 'begin-authentication',
  AuthenticationSucceeded: 'authentication-succeeded',
  CredentialsRefreshed: 'credentials-refreshed',
  SessionExpired: 'session-expired',
  SessionRevoked: 'session-revoked',
  InvalidSignature: 'invalid-signature',
  InvalidCredentials: 'invalid-credentials',
  InvalidSession: 'invalid-session',
  ReconnectRequired: 'reconnect-required',
  Logout: 'logout'
} as const)
export type SessionTransition =
  (typeof SessionTransition)[keyof typeof SessionTransition]

export interface SessionProtocolSnapshot {
  readonly state: SessionState
  readonly connection: SessionConnectionState
  readonly cause?: SessionInvalidationCause
}

export const INITIAL_SESSION_PROTOCOL: SessionProtocolSnapshot = Object.freeze({
  state: SessionState.Public,
  connection: SessionConnectionState.Disconnected
})

const invalidationCauseForTransition: Partial<
  Record<SessionTransition, SessionInvalidationCause>
> = {
  [SessionTransition.SessionExpired]: SessionInvalidationCause.SessionExpired,
  [SessionTransition.SessionRevoked]: SessionInvalidationCause.SessionRevoked,
  [SessionTransition.InvalidSignature]: SessionInvalidationCause.InvalidSignature,
  [SessionTransition.InvalidCredentials]: SessionInvalidationCause.InvalidCredentials,
  [SessionTransition.InvalidSession]: SessionInvalidationCause.InvalidSession
}

export function isSessionTransitionAllowed(
  state: SessionState,
  transition: SessionTransition
): boolean {
  switch (transition) {
    case SessionTransition.BeginAuthentication:
      return state !== SessionState.Authenticating
    case SessionTransition.AuthenticationSucceeded:
      return state === SessionState.Authenticating
    case SessionTransition.CredentialsRefreshed:
      return state === SessionState.Authenticated
    case SessionTransition.Logout:
    case SessionTransition.ReconnectRequired:
    case SessionTransition.SessionExpired:
    case SessionTransition.SessionRevoked:
    case SessionTransition.InvalidSignature:
    case SessionTransition.InvalidCredentials:
    case SessionTransition.InvalidSession:
      return true
  }
}

/**
 * Applies the finite protocol state machine. Invalid transitions are rejected
 * so a transport cannot silently manufacture an authenticated session.
 */
export function transitionSessionProtocol(
  snapshot: SessionProtocolSnapshot,
  transition: SessionTransition,
  connection: SessionConnectionState = snapshot.connection
): SessionProtocolSnapshot {
  if (!isSessionTransitionAllowed(snapshot.state, transition)) {
    throw new Error(`Illegal session transition: ${snapshot.state} -> ${transition}`)
  }

  if (transition === SessionTransition.BeginAuthentication) {
    return { state: SessionState.Authenticating, connection }
  }
  if (
    transition === SessionTransition.AuthenticationSucceeded ||
    transition === SessionTransition.CredentialsRefreshed
  ) {
    return { state: SessionState.Authenticated, connection }
  }
  if (transition === SessionTransition.ReconnectRequired) {
    return {
      state: snapshot.state,
      connection: SessionConnectionState.ReconnectRequired,
      cause: SessionInvalidationCause.ReconnectRequired
    }
  }
  if (transition === SessionTransition.Logout) {
    return { state: SessionState.Public, connection }
  }

  return {
    state: SessionState.Invalid,
    connection,
    cause: invalidationCauseForTransition[transition]!
  }
}

/** Maps existing HTTP error codes to the public invalidation vocabulary. */
export function sessionInvalidationCauseForApplicationError(
  code: import('./application-errors').ApplicationErrorCode
): SessionInvalidationCause | undefined {
  switch (code) {
    case 'SESSION_SIGNATURE_INVALID':
    case 'SECURE_COOKIE_SIGNATURE_INVALID':
      return SessionInvalidationCause.InvalidSignature
    case 'AUTHENTICATION_INVALID_CREDENTIALS':
      return SessionInvalidationCause.InvalidCredentials
    case 'TOKEN_REVOKED':
      return SessionInvalidationCause.SessionRevoked
    case 'ACCESS_TOKEN_INVALID_OR_EXPIRED':
    case 'TOKEN_INVALID_OR_EXPIRED':
      return SessionInvalidationCause.SessionExpired
    case 'SESSION_INVALID':
    case 'SESSION_NOT_FOUND':
    case 'ACCESS_TOKEN_SESSION_MISSING':
    case 'AUTHENTICATION_UNAUTHORIZED':
    case 'AUTHENTICATION_UNAUTHENTICATED':
    case 'AUTHENTICATION_UNAUTHENTICATED_LEGACY_TYPO':
    case 'AUTHENTICATION_UNAUTHENTICATED_SOFT':
    case 'AUTHENTICATION_UNAUTHENTICATED_FATAL':
    case 'ACCESS_TOKEN_MISSING':
    case 'TOKEN_TYPE_INVALID':
      return SessionInvalidationCause.InvalidSession
    default:
      return undefined
  }
}
