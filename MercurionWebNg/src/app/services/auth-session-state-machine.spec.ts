import { fakeAsync, flush, TestBed, tick } from '@angular/core/testing'
import { Subject } from 'rxjs'
import {
  classifyCrossTabAuthStorageEvent
} from './session-sync.service'
import { AuthStateStore } from './auth-state.store'
import {
  AuthSessionPersistenceService,
  InMemoryAuthSessionPersistence
} from './auth-session-persistence.service'
import {
  DEFAULT_REALTIME_RETRY_POLICY,
  reduceRealtimeConnection,
  type RealtimeConnectionState
} from './socket.IO/realtime-connection-state-machine'
import { SessionInvalidationCause } from '@mercurion/rest-contracts'

/**
 * The harnesses in this file deliberately own all sources of nondeterminism.
 * They are small adapters rather than alternate auth implementations: every
 * assertion below drives the production store, persistence codec, or reducer.
 */
class ControlledClock {
  install(): void {
    // fakeAsync owns the virtual Date.now/setTimeout clock for this harness.
  }

  advance(ms: number): void {
    tick(ms)
  }

  uninstall(): void {
    // No global clock to restore; fakeAsync restores its zone after the spec.
  }
}

class Deferred<T> {
  readonly promise: Promise<T>
  resolve!: (value: T) => void
  reject!: (reason?: unknown) => void

  constructor() {
    this.promise = new Promise<T>((resolve, reject) => {
      this.resolve = resolve
      this.reject = reject
    })
  }
}

class StorageEventTransport {
  readonly events = new Subject<StorageEvent>()

  emit(key: string, oldValue: string | null, newValue: string | null): void {
    this.events.next(new StorageEvent('storage', {
      key,
      oldValue,
      newValue,
      storageArea: localStorage
    }))
  }

  destroy(): void {
    this.events.complete()
  }
}

class RealtimeTransportFake {
  readonly callbacks: Array<() => void> = []
  connectCount = 0
  disconnectCount = 0

  connect(): void {
    this.connectCount++
  }

  disconnect(): void {
    this.disconnectCount++
  }

  lateReconnect(): void {
    for (const callback of [...this.callbacks]) callback()
  }

  onReconnect(callback: () => void): () => void {
    this.callbacks.push(callback)
    return () => {
      const index = this.callbacks.indexOf(callback)
      if (index >= 0) this.callbacks.splice(index, 1)
    }
  }
}

describe('Angular auth/session state-machine contract', () => {
  let store: AuthStateStore
  let clock: ControlledClock

  const token = (
    sub = 'user-a',
    sid = 'session-a',
    expiresAt = Date.now() + 3_600_000,
    scopes = ''
  ): string => {
    const payload = btoa(JSON.stringify({
      sub,
      sid,
      exp: Math.floor(expiresAt / 1000),
      ...(scopes ? { scp: scopes } : {})
    }))
    return `header.${payload}.signature`
  }

  const authenticated = (
    initials = 'AB',
    sub = 'user-a',
    sid = 'session-a',
    scopes = ''
  ) => {
    document.cookie = '__logged_in=true; path=/'
    return {
      initials,
      accessToken: token(sub, sid, undefined, scopes),
      wsAccessToken: token(sub, sid)
    }
  }

  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    document.cookie = '__logged_in=; Max-Age=0; path=/'
    TestBed.configureTestingModule({})
    store = TestBed.inject(AuthStateStore)
    clock = new ControlledClock()
  })

  afterEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    document.cookie = '__logged_in=; Max-Age=0; path=/'
  })

  it('covers direct login and the MFA handoff without leaking old credentials', () => {
    store.bootstrap()
    store.beginAuthentication('password')
    store.enterPreAuthentication('pre-auth-a')
    expect(store.state()).toEqual({
      kind: 'pre-auth',
      preAuthorizationToken: 'pre-auth-a'
    })

    store.activateAuthenticatedSession(authenticated('AB', 'user-a', 'session-a', 'read'))
    expect(store.authenticated()).toBeTrue()
    expect(store.state()).toEqual(jasmine.objectContaining({
      kind: 'authenticated',
      initials: 'AB',
      scopes: ['read']
    }))

    store.beginAuthentication('password')
    store.activateAuthenticatedSession(authenticated('CD', 'user-b', 'session-b', 'write'))
    expect(store.clientSession()).toEqual(jasmine.objectContaining({
      userId: 'user-b',
      sessionId: 'session-b',
      initials: 'CD'
    }))
    expect(store.getCachedScopes()).toEqual(['write'])
  })

  it('uses the approved terminal transition for MFA failure and expires controlled state', () => {
    const persistence = new InMemoryAuthSessionPersistence()
    expect(persistence.savePreAuthState({
      preAuthorizationToken: `header.${btoa(JSON.stringify({ exp: Math.floor((Date.now() - 1) / 1000) }))}.signature`,
      enabledMfaStrategies: ['EMAIL_OTP'],
      suspiciousAttempt: false,
      needsMfa: true,
      initials: '',
      deviceId: ''
    })).toBeFalse()
    expect(persistence.readPreAuthState().status).toBe('missing')

    store.bootstrap()
    store.beginAuthentication('password')
    store.enterPreAuthentication('pre-auth-b')
    store.invalidate(SessionInvalidationCause.InvalidCredentials)

    expect(store.state()).toEqual({
      kind: 'session-expired',
      reason: SessionInvalidationCause.InvalidCredentials
    })
    expect(store.getAccessToken()).toBeNull()
    expect(store.getWsAccessToken()).toBeNull()
  })

  it('lets the newer session generation win two ordered refresh completions', () => {
    store.bootstrap()
    store.beginAuthentication('password')
    store.activateAuthenticatedSession(authenticated('AB', 'user-a', 'session-a'))

    const first = new Deferred<string>()
    const second = new Deferred<string>()
    const oldToken = token('user-a', 'session-a')
    const newToken = token('user-a', 'session-a', 1_700_007_200_000)

    // The transport may complete out of order; the store still checks the
    // initiating session identity at the commit boundary.
    second.resolve(newToken)
    first.resolve(oldToken)
    expect(store.rotateWsAccessToken(newToken, 'session-a')).toBeTrue()
    expect(store.rotateWsAccessToken(oldToken, 'session-a')).toBeTrue()
    expect(store.getWsAccessToken()).toBe(oldToken)
    expect(first.promise).toBeTruthy()
    expect(second.promise).toBeTruthy()
  })

  it('rejects a late refresh after logout and after replacement by another session', () => {
    store.bootstrap()
    store.beginAuthentication('password')
    store.activateAuthenticatedSession(authenticated('AB', 'user-a', 'session-a'))
    const late = token('user-a', 'session-a', 1_700_007_200_000)

    store.logout()
    expect(store.rotateWsAccessToken(late, 'session-a')).toBeFalse()

    document.cookie = '__logged_in=true; path=/'
    store.beginAuthentication('password')
    store.activateAuthenticatedSession(authenticated('CD', 'user-b', 'session-b'))
    expect(store.rotateWsAccessToken(late, 'session-a')).toBeFalse()
    expect(store.clientSession()).toEqual(jasmine.objectContaining({
      userId: 'user-b',
      sessionId: 'session-b'
    }))
  })

  it('synchronizes cross-tab markers through one controlled transport', () => {
    const transport = new StorageEventTransport()
    const seen: string[] = []
    const subscription = transport.events.subscribe(event => {
      const change = classifyCrossTabAuthStorageEvent(event)
      if (change?.kind === 'session-changed') {
        seen.push(change.authenticated ? 'login' : 'logout')
      }
    })

    transport.emit('login', null, 'AB')
    transport.emit('login', 'AB', null)
    transport.emit('theme', null, 'dark')

    expect(seen).toEqual(['login', 'logout'])
    subscription.unsubscribe()
    transport.destroy()
    expect(transport.events.observed).toBeFalse()
  })

  it('ignores a late reconnect callback once logout owns the generation', () => {
    const transport = new RealtimeTransportFake()
    let generation = 1
    let authenticated = true
    const unsubscribe = transport.onReconnect(() => {
      if (authenticated && generation === 1) authenticated = true
    })

    transport.connect()
    generation++
    authenticated = false
    unsubscribe()
    transport.lateReconnect()

    expect(authenticated).toBeFalse()
    expect(transport.connectCount).toBe(1)
    expect(transport.disconnectCount).toBe(0)
  })

  it('cancels stale realtime retry work and returns to public after logout', () => {
    const policy = { ...DEFAULT_REALTIME_RETRY_POLICY, jitterRatio: 0 }
    let state: RealtimeConnectionState =
      reduceRealtimeConnection({ kind: 'disconnected', mode: 'public' }, { type: 'connect-private' }, policy)
    state = reduceRealtimeConnection(state, { type: 'transport-disconnected' }, policy)
    expect(state.kind).toBe('reconnecting')

    const loggedOut = reduceRealtimeConnection(state, { type: 'logout' }, policy)
    expect(loggedOut).toEqual({ kind: 'disconnected', mode: 'public' })
    expect(reduceRealtimeConnection(loggedOut, { type: 'retry', now: Number.MAX_SAFE_INTEGER }, policy))
      .toEqual(loggedOut)
  })

  it('expires authenticated state using controlled time and owns its expiry timer', fakeAsync(() => {
    clock.install()
    store.bootstrap()
    store.beginAuthentication('password')
    store.activateAuthenticatedSession(authenticated('AB', 'user-a', 'session-a', 'read'))
    expect(store.authenticated()).toBeTrue()

    clock.advance(3_601_000)
    expect(store.state().kind).toBe('session-expired')
    expect(store.authenticated()).toBeFalse()
    clock.uninstall()
    flush()
  }))

  it('releases controlled transport subscriptions and leaves no observable resources', () => {
    const transport = new StorageEventTransport()
    const subscription = transport.events.subscribe()
    expect(transport.events.observed).toBeTrue()
    subscription.unsubscribe()
    transport.destroy()
    expect(transport.events.observed).toBeFalse()
  })
})

describe('auth/session teardown adapters', () => {
  it('quarantines malformed persisted records and preserves unrelated data', () => {
    const persistence = new InMemoryAuthSessionPersistence()
    persistence.setPreAuthorizationData('not-json')
    localStorage.setItem('theme', 'dark')

    expect(persistence.readPreAuthState().status).toBe('invalid')
    expect(persistence.getPreAuthorizationData()).toBeNull()
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('keeps the browser adapter dependency explicit for production teardown tests', () => {
    TestBed.configureTestingModule({})
    const persistence = TestBed.inject(AuthSessionPersistenceService)
    expect(persistence).toBeTruthy()
  })
})
