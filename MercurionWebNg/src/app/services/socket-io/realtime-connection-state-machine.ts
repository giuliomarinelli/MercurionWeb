export type RealtimeConnectionMode = 'public' | 'private'

export type RealtimeConnectionState =
  | { kind: 'disconnected'; mode: RealtimeConnectionMode }
  | { kind: 'connecting'; mode: RealtimeConnectionMode; generation: number }
  | { kind: 'public' }
  | { kind: 'authenticating'; generation: number }
  | { kind: 'private' }
  | { kind: 'reconnecting'; mode: RealtimeConnectionMode; attempt: number; retryAt: number }
  | { kind: 'degraded'; mode: RealtimeConnectionMode; attempt: number; reason: string }
  | { kind: 'stopped' }

export type RealtimeConnectionEvent =
  | { type: 'connect-public' }
  | { type: 'connect-private' }
  | { type: 'transport-connected' }
  | { type: 'private-authenticated' }
  | { type: 'transport-disconnected' }
  | { type: 'auth-rejected' }
  | { type: 'retry'; now: number }
  | { type: 'logout' }
  | { type: 'reset' }

export interface RealtimeRetryPolicy {
  maxAttempts: number
  baseDelayMs: number
  maxDelayMs: number
  jitterRatio: number
}

export const DEFAULT_REALTIME_RETRY_POLICY: Readonly<RealtimeRetryPolicy> = {
  maxAttempts: 6,
  baseDelayMs: 500,
  maxDelayMs: 15_000,
  jitterRatio: 0.2
}

export function retryDelay(
  attempt: number,
  policy: RealtimeRetryPolicy = DEFAULT_REALTIME_RETRY_POLICY,
  random = Math.random
): number {
  const exponential = Math.min(policy.maxDelayMs, policy.baseDelayMs * 2 ** Math.max(0, attempt - 1))
  const jitter = exponential * policy.jitterRatio
  return Math.max(0, Math.round(exponential - jitter + random() * jitter * 2))
}

/**
 * Pure lifecycle reducer.  The service owns the clock and transport; this
 * reducer owns the legal intent/state vocabulary and makes stale work
 * detectable through its generation.
 */
export function reduceRealtimeConnection(
  state: RealtimeConnectionState,
  event: RealtimeConnectionEvent,
  policy: RealtimeRetryPolicy = DEFAULT_REALTIME_RETRY_POLICY
): RealtimeConnectionState {
  switch (event.type) {
    case 'logout':
      return { kind: 'disconnected', mode: 'public' }
    case 'reset':
      return { kind: 'disconnected', mode: 'public' }
    case 'connect-public':
      return { kind: 'connecting', mode: 'public', generation: generationOf(state) + 1 }
    case 'connect-private':
      return { kind: 'authenticating', generation: generationOf(state) + 1 }
    case 'transport-connected':
      return state.kind === 'connecting' && state.mode === 'public'
        ? { kind: 'public' }
        : state
    case 'private-authenticated':
      return state.kind === 'authenticating' ? { kind: 'private' } : state
    case 'transport-disconnected': {
      const mode = state.kind === 'private' || state.kind === 'authenticating'
        ? 'private'
        : state.kind === 'public' || (state.kind === 'reconnecting' && state.mode === 'public')
          ? 'public'
          : 'public'
      const attempt = state.kind === 'reconnecting' ? state.attempt + 1 : 1
      return attempt > policy.maxAttempts
        ? { kind: 'degraded', mode, attempt, reason: 'retry-exhausted' }
        : { kind: 'reconnecting', mode, attempt, retryAt: 0 }
    }
    case 'auth-rejected':
      return { kind: 'degraded', mode: 'private', attempt: 0, reason: 'authentication-rejected' }
    case 'retry':
      if (state.kind !== 'reconnecting' || event.now < state.retryAt) return state
      return state.mode === 'public'
        ? { kind: 'connecting', mode: 'public', generation: generationOf(state) + 1 }
        : { kind: 'authenticating', generation: generationOf(state) + 1 }
  }
}

function generationOf(state: RealtimeConnectionState): number {
  return state.kind === 'connecting' || state.kind === 'authenticating'
    ? state.generation
    : 0
}
