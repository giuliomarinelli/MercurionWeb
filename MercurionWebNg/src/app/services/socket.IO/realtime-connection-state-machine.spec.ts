import {
  DEFAULT_REALTIME_RETRY_POLICY,
  reduceRealtimeConnection,
  retryDelay,
  type RealtimeConnectionState,
} from './realtime-connection-state-machine'

describe('realtime connection state machine', () => {
  const policy = { ...DEFAULT_REALTIME_RETRY_POLICY, jitterRatio: 0 }
  const disconnected = (): RealtimeConnectionState => ({ kind: 'disconnected', mode: 'public' })

  it('connects anonymously without entering private authentication', () => {
    const connecting = reduceRealtimeConnection(disconnected(), { type: 'connect-public' })
    expect(connecting).toEqual({ kind: 'connecting', mode: 'public', generation: 1 })
    expect(reduceRealtimeConnection(connecting, { type: 'transport-connected' }))
      .toEqual({ kind: 'public' })
  })

  it('makes public to private an explicit, observable transition', () => {
    const authenticating = reduceRealtimeConnection(disconnected(), { type: 'connect-private' })
    expect(authenticating.kind).toBe('authenticating')
    expect(reduceRealtimeConnection(authenticating, { type: 'private-authenticated' }))
      .toEqual({ kind: 'private' })
  })

  it('bounds reconnect attempts and uses exponential backoff with jitter disabled deterministically', () => {
    let state = reduceRealtimeConnection(disconnected(), { type: 'connect-public' }, policy)
    state = reduceRealtimeConnection(state, { type: 'transport-disconnected' }, policy)
    expect(state).toEqual({ kind: 'reconnecting', mode: 'public', attempt: 1, retryAt: 0 })
    expect(retryDelay(1, policy, () => 0.5)).toBe(500)
    for (let i = 0; i < policy.maxAttempts; i++) {
      state = reduceRealtimeConnection(state, { type: 'transport-disconnected' }, policy)
    }
    expect(state.kind).toBe('degraded')
    expect(state).toEqual(jasmine.objectContaining({ reason: 'retry-exhausted' }))
  })

  it('makes logout cancel the current generation and return to stable public intent', () => {
    const connecting = reduceRealtimeConnection(disconnected(), { type: 'connect-private' })
    const loggedOut = reduceRealtimeConnection(connecting, { type: 'logout' })
    expect(loggedOut).toEqual({ kind: 'disconnected', mode: 'public' })
  })

  it('ignores a retry before its scheduled deadline', () => {
    const retrying: RealtimeConnectionState = {
      kind: 'reconnecting',
      mode: 'private',
      attempt: 2,
      retryAt: 1000,
    }
    expect(reduceRealtimeConnection(retrying, { type: 'retry', now: 999 })).toBe(retrying)
    expect(reduceRealtimeConnection(retrying, { type: 'retry', now: 1000 }).kind)
      .toBe('authenticating')
  })
})
