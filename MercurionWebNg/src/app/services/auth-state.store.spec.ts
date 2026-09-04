import { TestBed } from '@angular/core/testing'
import { AuthStateStore } from './auth-state.store'

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

  it('enters pre-auth when persisted markers exist without trusting them as authenticated', () => {
    localStorage.setItem('login', 'AB')
    expect(store.bootstrap()).toEqual({ kind: 'pre-auth' })
    expect(store.isAuthenticated()).toBeFalse()
    expect(store.isPreAuth()).toBeTrue()
  })

  it('completes login and exposes derived authenticated state', () => {
    store.bootstrap()
    store.beginAuthentication('pre-auth-token')
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
  })

  it('supports MFA/pre-auth, invalidation, logout, and external state convergence', () => {
    store.bootstrap()
    store.beginAuthentication()
    expect(store.isPreAuth()).toBeTrue()

    store.completeAuthentication({ initials: 'AB', accessToken: 'a', wsAccessToken: 'w' })
    store.invalidate('expired')
    expect(store.isAuthenticated()).toBeFalse()
    expect(store.state().kind).toBe('session-expired')

    store.logout()
    expect(store.state()).toEqual({ kind: 'anonymous' })

    localStorage.setItem('login', 'CD')
    store.syncExternalState()
    expect(store.state().kind).toBe('pre-auth')
    localStorage.removeItem('login')
    store.syncExternalState()
    expect(store.state()).toEqual({ kind: 'anonymous' })
  })

  it('rejects illegal transitions', () => {
    expect(() => store.completeAuthentication({ initials: 'AB' }))
      .toThrowError('Illegal auth transition: bootstrap -> authenticated')
  })
})
