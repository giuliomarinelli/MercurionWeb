import { signal } from '@angular/core'
import { fakeAsync, flushMicrotasks, TestBed } from '@angular/core/testing'
import { Router, provideRouter } from '@angular/router'
import { Observable } from 'rxjs'

import { AuthGuard } from './auth.guard'
import { AuthState, AuthStateStore } from '../services/auth-state.store'
import { AuthRedirectService } from '../services/auth-redirect.service'
import { SessionSyncService } from '../services/session-sync.service'
import { routeData, routeManifest } from '../route-manifest'

describe('AuthGuard', () => {
  let guard: AuthGuard
  const authState = signal<AuthState>({ kind: 'anonymous' })
  let finishRestore: (() => void) | undefined
  const redirects = jasmine.createSpyObj<AuthRedirectService>('AuthRedirectService', ['capture'])
  const sessionSync = jasmine.createSpyObj<SessionSyncService>('SessionSyncService', ['checkSession'])

  beforeEach(() => {
    authState.set({ kind: 'anonymous' })
    finishRestore = undefined
    redirects.capture.calls.reset()
    redirects.capture.and.callFake(value => value ?? null)
    sessionSync.checkSession.calls.reset()
    sessionSync.checkSession.and.resolveTo()
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthStateStore,
          useValue: {
            state: authState,
            authenticated: () => authState().kind === 'authenticated',
            isAuthenticating: () => authState().kind === 'authenticating'
          }
        },
        { provide: AuthRedirectService, useValue: redirects },
        { provide: SessionSyncService, useValue: sessionSync }
      ]
    })
    guard = TestBed.inject(AuthGuard)
  })

  it('should be created', () => {
    expect(guard).toBeTruthy()
  })

  it('waits for an in-progress restore before allowing a protected refresh', fakeAsync(() => {
    authState.set({ kind: 'authenticating', flow: 'restore' })
    sessionSync.checkSession.and.callFake(() => new Promise<void>(resolve => {
      finishRestore = resolve
    }))

    let result: boolean | object | undefined
    const decision = guard.canActivate(protectedRoute(), state('/help')) as Observable<boolean | object>
    decision.subscribe(value => { result = value })
    expect(redirects.capture).not.toHaveBeenCalled()

    authenticate()
    finishRestore?.()
    TestBed.flushEffects()
    flushMicrotasks()

    expect(result).toBeTrue()
    expect(redirects.capture).not.toHaveBeenCalled()
  }))

  it('preserves the requested URL when session restore resolves anonymously', fakeAsync(() => {
    authState.set({ kind: 'authenticating', flow: 'restore' })
    sessionSync.checkSession.and.callFake(async () => { authState.set({ kind: 'anonymous' }) })

    let result: boolean | object | undefined
    const decision = guard.canActivate(protectedRoute(), state('/settings#security')) as Observable<boolean | object>
    decision.subscribe(value => { result = value })
    TestBed.flushEffects()
    flushMicrotasks()

    expect(sessionSync.checkSession).toHaveBeenCalled()
    expect(redirects.capture).toHaveBeenCalledOnceWith('/settings#security')
    expect(TestBed.inject(Router).serializeUrl(result as ReturnType<Router['parseUrl']>))
      .toBe('/login?redirect_to=%2Fsettings%23security')
  }))

  it('does not redirect or allow a protected route while a transport failure leaves restore pending', fakeAsync(() => {
    authState.set({ kind: 'authenticating', flow: 'restore' })
    let result: boolean | object | undefined
    const decision = guard.canActivate(protectedRoute(), state('/settings')) as Observable<boolean | object>
    decision.subscribe(value => { result = value })
    TestBed.flushEffects()
    flushMicrotasks()

    expect(result).toBeUndefined()
    expect(redirects.capture).not.toHaveBeenCalled()

    authenticate()
    TestBed.flushEffects()
    flushMicrotasks()

    expect(result).toBeTrue()
    expect(redirects.capture).not.toHaveBeenCalled()
  }))

  it('redirects when the server definitively invalidates a pending restore', fakeAsync(() => {
    authState.set({ kind: 'authenticating', flow: 'restore' })
    let result: boolean | object | undefined
    const decision = guard.canActivate(protectedRoute(), state('/settings')) as Observable<boolean | object>
    decision.subscribe(value => { result = value })
    TestBed.flushEffects()
    flushMicrotasks()

    authState.set({ kind: 'session-expired' })
    TestBed.flushEffects()
    flushMicrotasks()

    expect(result).toBeDefined()
    expect(redirects.capture).toHaveBeenCalledOnceWith('/settings')
  }))

  it('stops observing restoration when Router cancels the navigation', fakeAsync(() => {
    authState.set({ kind: 'authenticating', flow: 'restore' })
    const decision = guard.canActivate(protectedRoute(), state('/settings')) as Observable<boolean | object>
    const next = jasmine.createSpy('guard decision')
    const subscription = decision.subscribe(next)
    TestBed.flushEffects()
    flushMicrotasks()
    subscription.unsubscribe()

    authState.set({ kind: 'session-expired' })
    TestBed.flushEffects()
    flushMicrotasks()

    expect(next).not.toHaveBeenCalled()
    expect(redirects.capture).not.toHaveBeenCalled()
  }))

  function authenticate() {
    authState.set({ kind: 'authenticated', initials: 'AB', accessToken: 'http', wsAccessToken: 'ws', scopes: [] })
  }

  function protectedRoute() {
    return { data: routeData(routeManifest.help) } as any
  }

  function state(url: string) {
    return { url } as any
  }
})
