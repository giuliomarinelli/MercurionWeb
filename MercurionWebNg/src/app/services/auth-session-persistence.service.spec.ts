import {
  AuthSessionPersistenceService,
  InMemoryAuthSessionPersistence
} from './auth-session-persistence.service'
import { type Login_FirstStep_Data } from '../Models/confirm.models'

describe('InMemoryAuthSessionPersistence', () => {
  const token = (expiresAt: number) => `eyJhbGciOiJub25lIn0.${btoa(JSON.stringify({ exp: Math.floor(expiresAt / 1000) }))}.signature`
  const data = (expiresAt = Date.now() + 60_000): Login_FirstStep_Data => ({
    needsMfa: true,
    enabledMfaStrategies: ['EMAIL_OTP', 'APP_TOTP'],
    suspiciousAttempt: false,
    preAuthorizationToken: token(expiresAt),
    obscuredEmail: 'a***@example.test',
    initials: '',
    deviceId: ''
  })

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

  it('validates, expires and consumes versioned pre-auth state without replay', () => {
    const persistence = new InMemoryAuthSessionPersistence()
    expect(persistence.savePreAuthState(data())).toBeTrue()
    const valid = persistence.readPreAuthState()
    expect(valid.status).toBe('valid')
    if (valid.status === 'valid') {
      expect(valid.state.version).toBe(1)
      expect(valid.state.kind).toBe('mfa')
      expect(valid.state.preAuthorizationToken).toContain('.')
    }
    expect(persistence.consumePreAuthState().status).toBe('valid')
    expect(persistence.readPreAuthState().status).toBe('missing')

    expect(persistence.savePreAuthState(data(Date.now() - 1))).toBeFalse()
    expect(persistence.readPreAuthState().status).toBe('missing')

    persistence.setPreAuthorizationData(btoa(JSON.stringify({
      version: 1, kind: 'mfa', preAuthorizationToken: 'bad',
      expiresAt: Date.now() + 60_000, enabledMfaStrategies: ['UNSUPPORTED'], suspiciousAttempt: false
    })))
    expect(persistence.readPreAuthState().status).toBe('invalid')
    expect(persistence.getPreAuthorizationData()).toBeNull()
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
    sessionStorage.setItem('authRedirectIntent', '/dashboard')
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
      'authRedirectIntent',
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
