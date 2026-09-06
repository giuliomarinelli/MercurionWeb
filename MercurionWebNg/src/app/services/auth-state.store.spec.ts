import { TestBed } from '@angular/core/testing'
import { AuthStateStore } from './auth-state.store'
import {
  SessionConnectionState,
  SessionInvalidationCause,
  SessionState
} from '@mercurion/rest-contracts'

describe('AuthStateStore', () => {
  let store: AuthStateStore

  beforeEach(() => {
    localStorage.clear()
    document.cookie = '__logged_in=; Max-Age=0; path=/'
    TestBed.configureTestingModule({})
    store = TestBed.inject(AuthStateStore)
  })

  it('bootstraps anonymously without persisted session markers', () => {
    expect(store.bootstrap()).toEqual({ kind: 'anonymous' })
    expect(store.isAuthenticated()).toBeFalse()
  })

  it('restores persisted markers as authentication-in-progress without trusting them as authenticated', () => {
    localStorage.setItem('login', 'AB')
    expect(store.bootstrap()).toEqual({ kind: 'authenticating', flow: 'restore' })
    expect(store.isAuthenticated()).toBeFalse()
    expect(store.isAuthenticating()).toBeTrue()
  })

  it('completes login and exposes derived authenticated state', () => {
    store.bootstrap()
    store.beginAuthentication('password')
    store.enterPreAuthentication('pre-auth-token')
    store.completeAuthentication({
      initials: 'AB',
      accessToken: 'access',
      wsAccessToken: 'ws',
      scopes: ['read']
    })

    expect(store.state()).toEqual({
      kind: 'authenticated',
      initials: 'AB',
      accessToken: 'access',
      wsAccessToken: 'ws',
      scopes: ['read']
    })
    expect(store.initials()).toBe('AB')
    expect(store.sessionProtocol()).toEqual({
      state: SessionState.Authenticated,
      connection: SessionConnectionState.Disconnected
    })
  })

  it('uses typed invalidation and reconnect protocol transitions', () => {
    store.bootstrap()
    store.beginAuthentication('password')
    store.completeAuthentication({ initials: 'AB' })
    store.requireReconnect()

    expect(store.sessionProtocol()).toEqual({
      state: SessionState.Authenticated,
      connection: SessionConnectionState.ReconnectRequired,
      cause: SessionInvalidationCause.ReconnectRequired
    })

    store.invalidate(SessionInvalidationCause.SessionRevoked)
    expect(store.sessionProtocol()).toEqual({
      state: SessionState.Invalid,
      connection: SessionConnectionState.ReconnectRequired,
      cause: SessionInvalidationCause.SessionRevoked
    })
  })

  it('supports MFA/pre-auth, invalidation, logout, and external state convergence', () => {
    store.bootstrap()
    store.beginAuthentication('password')
    store.enterPreAuthentication()
    expect(store.isPreAuth()).toBeTrue()

    store.completeAuthentication({ initials: 'AB', accessToken: 'a', wsAccessToken: 'w' })
    store.invalidate(SessionInvalidationCause.SessionExpired)
    expect(store.isAuthenticated()).toBeFalse()
    expect(store.state().kind).toBe('session-expired')

    store.logout()
    expect(store.state()).toEqual({ kind: 'anonymous' })

    localStorage.setItem('login', 'CD')
    store.syncExternalState()
    expect(store.state()).toEqual({ kind: 'authenticating', flow: 'restore' })
    localStorage.removeItem('login')
    store.syncExternalState()
    expect(store.state()).toEqual({ kind: 'anonymous' })
    expect(store.sessionProtocol()).toEqual({
      state: SessionState.Public,
      connection: SessionConnectionState.Disconnected
    })
  })

  it('records credential refreshes in the canonical protocol', () => {
    store.bootstrap()
    store.beginAuthentication('password')
    store.completeAuthentication({ initials: 'AB', accessToken: 'old' })

    store.updateAccessToken('new')

    expect(store.state()).toEqual(jasmine.objectContaining({ kind: 'authenticated', accessToken: 'new' }))
    expect(store.sessionProtocol().state).toBe(SessionState.Authenticated)
  })

  it('rejects illegal transitions', () => {
    expect(() => store.completeAuthentication({ initials: 'AB' }))
      .toThrowError('Illegal auth transition: bootstrap -> authenticated')
    expect(localStorage.getItem('login')).toBeNull()
    expect(localStorage.getItem('accessToken')).toBeNull()
  })

  it('does not restore credentials from a stale completion after invalidation', () => {
    store.bootstrap()
    store.beginAuthentication('password')
    store.invalidate(SessionInvalidationCause.InvalidSession)

    expect(() => store.completeAuthentication({
      initials: 'AB',
      accessToken: 'stale-access',
      wsAccessToken: 'stale-ws'
    })).toThrowError('Illegal auth transition: session-expired -> authenticated')

    expect(store.state()).toEqual({ kind: 'session-expired', reason: SessionInvalidationCause.InvalidSession })
    expect(localStorage.getItem('login')).toBeNull()
    expect(localStorage.getItem('accessToken')).toBeNull()
    expect(localStorage.getItem('ws_accessToken')).toBeNull()
  })

  it('keeps the pending MFA cookie while clearing old client credentials', () => {
    document.cookie = '__logged_in=pending_long; path=/'
    localStorage.setItem('accessToken', 'old-access')
    localStorage.setItem('ws_accessToken', 'old-ws')
    localStorage.setItem('login', 'OLD')

    store.bootstrap()
    store.enterPreAuthentication('mfa-token')

    expect(store.state()).toEqual({ kind: 'pre-auth', preAuthorizationToken: 'mfa-token' })
    expect(document.cookie).toContain('__logged_in=pending_long')
    expect(localStorage.getItem('accessToken')).toBeNull()
    expect(localStorage.getItem('ws_accessToken')).toBeNull()
    expect(localStorage.getItem('login')).toBeNull()
  })
})
