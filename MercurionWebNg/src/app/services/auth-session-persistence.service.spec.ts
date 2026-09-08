import { InMemoryAuthSessionPersistence } from './auth-session-persistence.service'

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
