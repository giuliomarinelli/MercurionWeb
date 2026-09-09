import {
  AuthSessionPersistenceService,
  InMemoryAuthSessionPersistence
} from './auth-session-persistence.service'

describe('InMemoryAuthSessionPersistence', () => {
  it('round-trips tokens, scopes, tab and lock state', () => {
    const persistence = new InMemoryAuthSessionPersistence()
    persistence.setAccessToken('http-token')
    persistence.setWsAccessToken('ws-token')
    persistence.setScopes(['read', 'write'])
    persistence.setScopes(['socket'], 'ws')
    persistence.setWsRefreshLock({ owner: 'tab', expiresAt: 123 })

    expect(persistence.getAccessToken()).toBe('http-token')
    expect(persistence.getWsAccessToken()).toBe('ws-token')
    expect(persistence.getScopes()).toEqual(['read', 'write'])
    expect(persistence.getScopes('ws')).toEqual(['socket'])
    expect(persistence.getWsRefreshLock()).toEqual({ owner: 'tab', expiresAt: 123 })
    expect(persistence.getTabId()).toBeTruthy()
  })

  it('fails closed and quarantines malformed structured values', () => {
    const persistence = new InMemoryAuthSessionPersistence()
    persistence.setScopes(['valid'])
    persistence.setWsRefreshLock({ owner: 'tab', expiresAt: 123 })
    // The in-memory implementation is intentionally isolated; malformed
    // browser values are covered by the adapter's defensive codec.
    expect(persistence.getScopes()).toEqual(['valid'])
    expect(persistence.getWsRefreshLock()?.owner).toBe('tab')
  })

  it('clears only auth/session keys and preserves unrelated storage by design', () => {
    const persistence = new InMemoryAuthSessionPersistence()
    persistence.setAccessToken('token')
    persistence.setInitials('AB')
    persistence.setPreAuthorizationData('pre-auth')
    persistence.setRedirectState('/dashboard')
    persistence.setWsRefreshLock({ owner: 'tab', expiresAt: 123 })

    persistence.clearAuthenticatedSession()
    expect(persistence.getAccessToken()).toBeNull()
    expect(persistence.getInitials()).toBeNull()
    expect(persistence.getPreAuthorizationData()).toBe('pre-auth')

    persistence.clearPreAuthData()
    persistence.clearEphemeralAuthData()
    expect(persistence.getPreAuthorizationData()).toBeNull()
    expect(persistence.getRedirectState()).toBeNull()
    expect(persistence.getWsRefreshLock()).toBeNull()
  })
})

describe('AuthSessionPersistenceService browser cleanup', () => {
  let persistence: AuthSessionPersistenceService

  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    persistence = new AuthSessionPersistenceService()
  })

  afterEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('removes owned auth/session and pre-auth keys while preserving unrelated storage', () => {
    localStorage.setItem('accessToken', 'http-token')
    localStorage.setItem('ws_accessToken', 'ws-token')
    localStorage.setItem('ws_accessToken_ts', '123')
    localStorage.setItem('login', 'AB')
    localStorage.setItem('scp', 'scopes')
    localStorage.setItem('ws_scp', 'ws-scopes')
    localStorage.setItem('ws_refresh_lock', '{"owner":"tab","expiresAt":123}')
    localStorage.setItem('theme', 'dark')
    localStorage.setItem('app-preference', 'compact')
    sessionStorage.setItem('preAuthorizationData', 'pre-auth')
    sessionStorage.setItem('redirectAfterLogin', '/dashboard')
    sessionStorage.setItem('mfaError', 'retry')
    sessionStorage.setItem('tab_id', 'tab')
    sessionStorage.setItem('checkout-draft', 'keep')

    persistence.clearAuthenticatedSession()
    persistence.clearPreAuthData()
    persistence.clearEphemeralAuthData()

    for (const key of [
      'accessToken',
      'ws_accessToken',
      'ws_accessToken_ts',
      'login',
      'scp',
      'ws_scp',
      'ws_refresh_lock'
    ]) {
      expect(localStorage.getItem(key)).toBeNull()
    }
    for (const key of [
      'preAuthorizationData',
      'redirectAfterLogin',
      'mfaError',
      'tab_id'
    ]) {
      expect(sessionStorage.getItem(key)).toBeNull()
    }
    expect(localStorage.getItem('theme')).toBe('dark')
    expect(localStorage.getItem('app-preference')).toBe('compact')
    expect(sessionStorage.getItem('checkout-draft')).toBe('keep')
  })
})
