import { fakeAsync, TestBed, tick } from '@angular/core/testing'
import { AuthSessionRepository } from './auth-session-repository.service'
import { AuthSessionPersistenceService, InMemoryAuthSessionPersistence } from './auth-session-persistence.service'

describe('AuthSessionRepository session claims and refresh lease', () => {
  let repository: AuthSessionRepository
  let persistence: InMemoryAuthSessionPersistence
  const token = (claims: Record<string, unknown>) => `header.${btoa(JSON.stringify(claims))}.synthetic`

  beforeEach(() => {
    persistence = new InMemoryAuthSessionPersistence()
    TestBed.configureTestingModule({
      providers: [{ provide: AuthSessionPersistenceService, useValue: persistence }],
    })
    repository = TestBed.inject(AuthSessionRepository)
  })

  it('does not steal a live foreign lease, but can acquire an expired one', () => {
    persistence.setWsRefreshLock({ owner: 'another-tab', expiresAt: Date.now() + 5000 })
    expect(repository.tryAcquireRefreshLock()).toBeFalse()
    repository.releaseRefreshLock()
    expect(persistence.getWsRefreshLock()?.owner).toBe('another-tab')
    persistence.setWsRefreshLock({ owner: 'another-tab', expiresAt: Date.now() - 1 })
    expect(repository.tryAcquireRefreshLock()).toBeTrue()
    expect(persistence.getWsRefreshLock()?.owner).toBe(persistence.getTabId())
    repository.releaseRefreshLock()
    expect(persistence.getWsRefreshLock()).toBeNull()
  })

  it('detects a competing writer after setting the lease', () => {
    spyOn(persistence, 'getWsRefreshLock').and.returnValues(null, {
      owner: 'competing-writer', expiresAt: Date.now() + 5000,
    })
    expect(repository.tryAcquireRefreshLock()).toBeFalse()
  })

  it('keeps HTTP and websocket scopes independent and clears missing claims', () => {
    expect(repository.getLoggedUserId()).toBeNull()
    expect(repository.getUserScopesFromClaims()).toEqual([])
    persistence.setAccessToken(token({ sub: 'synthetic-user', scp: 'read   write' }))
    expect(repository.getLoggedUserId()).toBe('synthetic-user')
    expect(repository.getUserScopesFromClaims(undefined, true)).toEqual(['read', 'write'])
    repository.setCachedScopes(['socket'], 'ws_accessToken')
    expect(repository.getCachedScopes()).toEqual(['read', 'write'])
    expect(repository.getCachedScopes('ws_accessToken')).toEqual(['socket'])
    repository.clearCachedScopes('access_token')
    expect(repository.getCachedScopes()).toBeNull()
    expect(repository.getCachedScopes('ws_accessToken')).toEqual(['socket'])
    expect(repository.getUserScopesFromClaims(token({ sub: 'without-scopes' }))).toEqual([])
  })

  it('rejects missing, non-numeric and non-finite websocket lifetimes', () => {
    expect(repository.isWsTokenExpired()).toBeTrue()
    expect(repository.getWsTokenTtlSeconds()).toBeNull()
    expect(repository.getWsTokenTtlSeconds(token({ exp: 120 }))).toBeNull()
    expect(repository.getWsTokenTtlSeconds(token({ iat: 'invalid', exp: 120 }))).toBeNull()
    expect(repository.getWsTokenTtlSeconds(token({ iat: -1e308, exp: 1e308 }))).toBeNull()
    const now = Math.floor(Date.now() / 1000)
    persistence.setWsAccessToken(token({ iat: now, exp: now + 120 }))
    expect(repository.getWsTokenTtlSeconds()).toBe(120)
    expect(repository.isWsTokenExpired()).toBeFalse()
  })

  it('finishes waiting on token rotation and removes its storage listener', fakeAsync(() => {
    persistence.setWsAccessToken('old-token')
    persistence.setWsRefreshLock({ owner: 'another-tab', expiresAt: Date.now() + 5000 })
    const removed = spyOn(window, 'removeEventListener').and.callThrough()
    let completed = false
    void repository.waitForRefreshChange(1000).then(() => { completed = true })
    tick(25)
    expect(completed).toBeFalse()
    persistence.setWsAccessToken('rotated-token')
    tick(25)
    expect(completed).toBeTrue()
    expect(removed).toHaveBeenCalledWith('storage', jasmine.any(Function))
  }))

  it('finishes on a refresh storage event even if the token has not changed', fakeAsync(() => {
    persistence.setWsRefreshLock({ owner: 'another-tab', expiresAt: Date.now() + 5000 })
    let completed = false
    void repository.waitForRefreshChange(1000).then(() => { completed = true })
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'mercurion.v1.auth.ws-refresh-lock', newValue: null, storageArea: localStorage,
    }))
    tick(50)
    expect(completed).toBeTrue()
  }))

  it('bounds waiting by the timeout and exits when a lease disappears', fakeAsync(() => {
    persistence.setWsRefreshLock({ owner: 'another-tab', expiresAt: Date.now() + 5000 })
    let completed = false
    void repository.waitForRefreshChange(80).then(() => { completed = true })
    tick(50)
    expect(completed).toBeFalse()
    tick(50)
    expect(completed).toBeTrue()
    persistence.removeWsRefreshLock()
    completed = false
    void repository.waitForRefreshChange(1000).then(() => { completed = true })
    tick()
    expect(completed).toBeTrue()
  }))

  it('does not register a listener when no waiting time is requested', fakeAsync(() => {
    const added = spyOn(window, 'addEventListener').and.callThrough()
    let completed = false
    void repository.waitForRefreshChange(0).then(() => { completed = true })
    tick()
    expect(completed).toBeTrue()
    expect(added).not.toHaveBeenCalled()
  }))
})
