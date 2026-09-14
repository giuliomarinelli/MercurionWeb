import { TestBed } from '@angular/core/testing'
import { AuthStateStore } from './auth-state.store'
import {
  SessionConnectionState,
  SessionInvalidationCause,
  SessionState
} from '@mercurion/rest-contracts'

describe('AuthStateStore', () => {
  let store: AuthStateStore
  const tokenWithScopes = (scopes?: string, sub = 'user-a', sid = 'session-a') => {
    const payload = btoa(JSON.stringify({
      sub, sid, ...(scopes === undefined ? {} : { scp: scopes }),
      exp: Math.floor(Date.now() / 1000) + 3600
    }))
    return `header.${payload}.signature`
  }
  const session = (initials = 'AB', scopes?: string, sub = 'user-a', sid = 'session-a') => {
    document.cookie = '__logged_in=true; path=/'
    return {
      initials,
      accessToken: tokenWithScopes(scopes, sub, sid),
      wsAccessToken: tokenWithScopes(scopes, sub, sid)
    }
  }

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

  it('does not authenticate from initials, cookie, or token in isolation', () => {
    localStorage.setItem('login', 'AB')
    document.cookie = '__logged_in=true; path=/'
    localStorage.setItem('accessToken', 'token-only')

    expect(store.bootstrap()).toEqual({ kind: 'authenticating', flow: 'restore' })
    expect(store.authenticated()).toBeFalse()
  })

  it('completes login and exposes derived authenticated state', () => {
    store.bootstrap()
    store.beginAuthentication('password')
    store.enterPreAuthentication('pre-auth-token')
    store.completeAuthentication(session('AB', 'read write'))

    expect(store.state()).toEqual({
      kind: 'authenticated',
      initials: 'AB',
      accessToken: tokenWithScopes('read write'),
      wsAccessToken: tokenWithScopes('read write'),
      scopes: ['read', 'write']
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
    store.completeAuthentication(session())
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

    store.completeAuthentication(session())
    store.invalidate(SessionInvalidationCause.SessionExpired)
    expect(store.authenticated()).toBeFalse()
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
    store.completeAuthentication(session('AB'))

    store.rotateAccessToken(tokenWithScopes(undefined, 'user-a', 'session-a'))

    expect(store.state()).toEqual(jasmine.objectContaining({ kind: 'authenticated', accessToken: tokenWithScopes(undefined) }))
    expect(store.sessionProtocol().state).toBe(SessionState.Authenticated)
  })

  it('rejects an expired access token from the authenticated selector', () => {
    store.bootstrap()
    store.beginAuthentication('password')
    const payload = btoa(JSON.stringify({
      sub: 'user-a', sid: 'session-a', exp: Math.floor(Date.now() / 1000) - 1
    }))
    store.completeAuthentication({
      ...session('AB'),
      accessToken: `header.${payload}.signature`
    })

    expect(store.authenticated()).toBeFalse()
  })

  it('rejects authenticated state after explicit protocol invalidation', () => {
    store.bootstrap()
    store.beginAuthentication('password')
    store.completeAuthentication(session())
    store.invalidate(SessionInvalidationCause.SessionRevoked)

    expect(store.authenticated()).toBeFalse()
  })

  it('derives scopes once from each accepted access token and replaces an old user scope set', () => {
    store.bootstrap()
    store.beginAuthentication('password')
    store.activateAuthenticatedSession(session('AB', 'read write'))
    expect(store.state()).toEqual(jasmine.objectContaining({ scopes: ['read', 'write'] }))

    store.beginAuthentication('password')
    store.activateAuthenticatedSession(session('CD'))
    expect(store.state()).toEqual(jasmine.objectContaining({ initials: 'CD', scopes: [] }))
    expect(store.getCachedScopes()).toEqual([])
  })

  it('clears scopes on logout after a completed login', () => {
    store.bootstrap()
    store.beginAuthentication('password')
    store.activateAuthenticatedSession(session('AB', 'admin'))

    store.logout()

    expect(store.state()).toEqual({ kind: 'anonymous' })
    expect(store.getCachedScopes()).toBeNull()
  })

  it('rejects illegal transitions', () => {
    expect(() => store.completeAuthentication(session()))
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
      accessToken: tokenWithScopes(undefined, 'user-a', 'stale-session'),
      wsAccessToken: tokenWithScopes(undefined, 'user-a', 'stale-session')
    })).toThrowError('Illegal auth transition: session-expired -> authenticated')

    expect(store.state()).toEqual({ kind: 'session-expired', reason: SessionInvalidationCause.InvalidSession })
    expect(localStorage.getItem('login')).toBeNull()
    expect(localStorage.getItem('accessToken')).toBeNull()
    expect(localStorage.getItem('ws_accessToken')).toBeNull()
  })

  it('accepts a server-confirmed login after an anonymous session-sync race', () => {
    store.bootstrap()
    document.cookie = '__logged_in=true; path=/'

    store.completeAuthentication({
      initials: 'AB',
      accessToken: tokenWithScopes('read'),
      wsAccessToken: tokenWithScopes(undefined, 'user-a', 'session-a')
    })

    expect(store.state()).toEqual(jasmine.objectContaining({
      kind: 'authenticated',
      initials: 'AB',
      scopes: ['read']
    }))
    expect(store.sessionProtocol().state).toBe(SessionState.Authenticated)
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

  it('enters recovery anonymously and preserves unrelated local/session storage', () => {
    store.bootstrap()
    store.beginAuthentication('password')
    store.activateAuthenticatedSession(session())
    localStorage.setItem('theme', 'dark')
    sessionStorage.setItem('preference', 'compact')
    sessionStorage.setItem('preAuthorizationData', 'pre-auth')
    localStorage.setItem('ws_refresh_lock', '{"owner":"tab","expiresAt":123}')

    store.beginRecovery()

    expect(store.state()).toEqual({ kind: 'anonymous' })
    expect(store.authenticated()).toBeFalse()
    expect(localStorage.getItem('accessToken')).toBeNull()
    expect(localStorage.getItem('ws_accessToken')).toBeNull()
    expect(localStorage.getItem('ws_refresh_lock')).toBeNull()
    expect(sessionStorage.getItem('preAuthorizationData')).toBeNull()
    expect(localStorage.getItem('theme')).toBe('dark')
    expect(sessionStorage.getItem('preference')).toBe('compact')
  })

  it('rejects tokens from another user or server session', () => {
    store.bootstrap()
    store.beginAuthentication('password')
    store.activateAuthenticatedSession(session('AB', 'read'))

    expect(store.rotateAccessToken(tokenWithScopes('write', 'user-b', 'session-b'))).toBeFalse()
    expect(store.rotateWsAccessToken(tokenWithScopes(undefined, 'user-a', 'session-b'))).toBeFalse()
    expect(store.clientSession()?.sessionId).toBe('session-a')
    expect(store.state()).toEqual(jasmine.objectContaining({ scopes: ['read'] }))
  })

  it('does not let a late refresh overwrite a replacement session', () => {
    store.bootstrap()
    store.beginAuthentication('password')
    store.activateAuthenticatedSession(session('AB', 'read', 'user-a', 'session-a'))
    const oldRefresh = tokenWithScopes(undefined, 'user-a', 'session-a')

    store.logout()
    store.beginAuthentication('password')
    store.activateAuthenticatedSession(session('CD', 'write', 'user-b', 'session-b'))

    expect(store.rotateWsAccessToken(oldRefresh, 'session-a')).toBeFalse()
    expect(store.clientSession()).toEqual(jasmine.objectContaining({
      userId: 'user-b',
      sessionId: 'session-b',
      initials: 'CD'
    }))
  })
})
