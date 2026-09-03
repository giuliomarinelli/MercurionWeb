export const SOCKET_CONTRACT_VERSION = '1.0.0' as const

export type SocketContractVersion = typeof SOCKET_CONTRACT_VERSION
export type SocketEventDirection = 'client-to-server' | 'server-to-client'

export interface SocketApplicationError {
  detail: 'Unauthorized' | 'Forbidden::missing permissions'
}

export interface SocketSessionInitAcknowledgement {
  detail: 'websocket session init successful'
}

export interface SocketSessionExpiredPayload {
  detail: 'session expired'
  reason: 'expired' | 'del'
}

type TypeMarker<T> = (value: T) => T

const typeMarker = <T>(): TypeMarker<T> => (value) => value

export const socketEventRegistry = {
  authRefresh: {
    name: 'auth_refresh',
    direction: 'client-to-server',
    version: SOCKET_CONTRACT_VERSION,
    payload: typeMarker<string>(),
    acknowledgement: null,
    error: null,
    errorSemantics:
      'Best-effort legacy token refresh signal. It has no acknowledgement; handshake authentication remains authoritative.'
  },
  publicTestRequest: {
    name: 'so.pub.public_test',
    direction: 'client-to-server',
    version: SOCKET_CONTRACT_VERSION,
    payload: typeMarker<string>(),
    acknowledgement: null,
    error: null,
    errorSemantics:
      'Public request. Its response is delivered separately through sv.pub.public_test.'
  },
  publicTestResponse: {
    name: 'sv.pub.public_test',
    direction: 'server-to-client',
    version: SOCKET_CONTRACT_VERSION,
    payload: typeMarker<string>(),
    acknowledgement: null,
    error: null,
    errorSemantics: 'No event-specific error payload.'
  },
  privateTestRequest: {
    name: 'so.pub.private_test',
    direction: 'client-to-server',
    version: SOCKET_CONTRACT_VERSION,
    payload: typeMarker<string>(),
    acknowledgement: null,
    error: typeMarker<SocketApplicationError>(),
    errorSemantics:
      'Authentication or authorization failures are delivered separately through sv.pub.err.'
  },
  privateTestResponse: {
    name: 'sv.pub.private_test',
    direction: 'server-to-client',
    version: SOCKET_CONTRACT_VERSION,
    payload: typeMarker<string>(),
    acknowledgement: null,
    error: null,
    errorSemantics: 'No event-specific error payload.'
  },
  sessionInit: {
    name: 'so.pub.session_init',
    direction: 'client-to-server',
    version: SOCKET_CONTRACT_VERSION,
    payload: typeMarker<undefined>(),
    acknowledgement: typeMarker<SocketSessionInitAcknowledgement>(),
    error: typeMarker<SocketApplicationError>(),
    errorSemantics:
      'Successful validation uses the typed acknowledgement. Authentication or authorization failures are delivered through sv.pub.err.'
  },
  applicationError: {
    name: 'sv.pub.err',
    direction: 'server-to-client',
    version: SOCKET_CONTRACT_VERSION,
    payload: typeMarker<SocketApplicationError>(),
    acknowledgement: null,
    error: null,
    errorSemantics: 'This event is the application-level WebSocket error envelope.'
  },
  sessionExpired: {
    name: 'sv.pub.session_expired',
    direction: 'server-to-client',
    version: SOCKET_CONTRACT_VERSION,
    payload: typeMarker<SocketSessionExpiredPayload>(),
    acknowledgement: null,
    error: null,
    errorSemantics:
      'Terminal session notification caused by Redis expiration or deletion; no acknowledgement is expected.'
  }
} as const

type SocketRegistry = typeof socketEventRegistry
type SocketRegistryEvent = SocketRegistry[keyof SocketRegistry]
type SocketRegistryEventForDirection<Direction extends SocketEventDirection> =
  Extract<SocketRegistryEvent, { direction: Direction }>
type SocketRegistryEventByName<Name extends SocketEventName> =
  Extract<SocketRegistryEvent, { name: Name }>

type EventHandler<Event extends SocketRegistryEvent> =
  Event['acknowledgement'] extends TypeMarker<infer Acknowledgement>
    ? (
        payload: ReturnType<Event['payload']>,
        acknowledgement: (value: Acknowledgement) => void
      ) => void
    : (payload: ReturnType<Event['payload']>) => void

type EventsForDirection<Direction extends SocketEventDirection> = {
  [Event in SocketRegistryEventForDirection<Direction> as Event['name']]:
    EventHandler<Event>
}

export type SocketEventName = SocketRegistryEvent['name']
export type ClientToServerEventName =
  SocketRegistryEventForDirection<'client-to-server'>['name']
export type ServerToClientEventName =
  SocketRegistryEventForDirection<'server-to-client'>['name']

export type ClientToServerAcknowledgedEventName =
  SocketRegistryEventForDirection<'client-to-server'> extends infer Event
    ? Event extends SocketRegistryEvent
      ? Event['acknowledgement'] extends null
        ? never
        : Event['name']
      : never
    : never

export type SocketEventPayload<Name extends SocketEventName> =
  ReturnType<SocketRegistryEventByName<Name>['payload']>

export type SocketEventAcknowledgement<Name extends SocketEventName> =
  SocketRegistryEventByName<Name>['acknowledgement'] extends TypeMarker<infer Acknowledgement>
    ? Acknowledgement
    : never

export type SocketEventError<Name extends SocketEventName> =
  SocketRegistryEventByName<Name>['error'] extends TypeMarker<infer ErrorPayload>
    ? ErrorPayload
    : never

export type ClientToServerEvents = EventsForDirection<'client-to-server'>
export type ServerToClientEvents = EventsForDirection<'server-to-client'>
