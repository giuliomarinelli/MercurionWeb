import type { SocketSessionInitAcknowledgement } from '@mercurion/socket-contracts'

export type SessionSyncTarget = 'public' | 'private'
export type SessionSyncProtocolResult =
  | { kind: 'authenticated' }
  | { kind: 'anonymous' }
  | { kind: 'rejected'; reason: 'missing-ack' | 'invalid-ack' }

export interface SessionSyncProtocol {
  target(hasLoginCookie: boolean, initials: string | null): SessionSyncTarget
  classifySessionInit(ack: SocketSessionInitAcknowledgement | undefined): SessionSyncProtocolResult
}

/** Pure translation of session-sync protocol messages into application intent. */
export class DefaultSessionSyncProtocol implements SessionSyncProtocol {
  target(hasLoginCookie: boolean, initials: string | null): SessionSyncTarget {
    return hasLoginCookie && initials ? 'private' : 'public'
  }

  classifySessionInit(ack: SocketSessionInitAcknowledgement | undefined): SessionSyncProtocolResult {
    if (!ack) return { kind: 'rejected', reason: 'missing-ack' }
    return ack.detail === 'websocket session init successful'
      ? { kind: 'authenticated' }
      : { kind: 'rejected', reason: 'invalid-ack' }
  }
}
