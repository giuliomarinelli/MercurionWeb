import { TestBed } from '@angular/core/testing'
import { Router, provideRouter } from '@angular/router'

import { AuthGuard } from './auth.guard'
import { AuthStateStore } from '../services/auth-state.store'
import { AuthRedirectService } from '../services/auth-redirect.service'
import { SessionSyncService } from '../services/session-sync.service'
import { routeData, routeManifest } from '../route-manifest'

describe('AuthGuard', () => {
  let guard: AuthGuard
  let authenticated: boolean
  let authenticating: boolean
  let finishRestore: (() => void) | undefined
  const redirects = jasmine.createSpyObj<AuthRedirectService>('AuthRedirectService', ['capture'])
  const sessionSync = jasmine.createSpyObj<SessionSyncService>('SessionSyncService', ['checkSession'])

  beforeEach(() => {
    authenticated = false
    authenticating = false
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
            authenticated: () => authenticated,
            isAuthenticating: () => authenticating
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

  it('waits for an in-progress restore before allowing a protected refresh', async () => {
    authenticating = true
    sessionSync.checkSession.and.callFake(() => new Promise<void>(resolve => {
      finishRestore = resolve
    }))

    const result = guard.canActivate(protectedRoute(), state('/help'))
    expect(result).toBeInstanceOf(Promise)
    expect(redirects.capture).not.toHaveBeenCalled()

    authenticated = true
    finishRestore?.()

    await expectAsync(result as Promise<boolean>).toBeResolvedTo(true)
    expect(redirects.capture).not.toHaveBeenCalled()
  })

  it('preserves the requested URL when session restore resolves anonymously', async () => {
    authenticating = true

    const result = await guard.canActivate(protectedRoute(), state('/settings#security'))

    expect(sessionSync.checkSession).toHaveBeenCalled()
    expect(redirects.capture).toHaveBeenCalledOnceWith('/settings#security')
    expect(TestBed.inject(Router).serializeUrl(result as ReturnType<Router['parseUrl']>))
      .toBe('/login?redirect_to=%2Fsettings%23security')
  })

  function protectedRoute() {
    return { data: routeData(routeManifest.help) } as any
  }

  function state(url: string) {
    return { url } as any
  }
})
