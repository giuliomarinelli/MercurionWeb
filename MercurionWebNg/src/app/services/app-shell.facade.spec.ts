import { Component, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, provideRouter, Router } from '@angular/router'
import { AppShellFacade } from './app-shell.facade'
import { AuthRedirectService } from './auth-redirect.service'
import { AuthStateStore } from './auth-state.store'
import { SessionSyncService } from './session-sync.service'
import { ScrollContextService } from './context/scroll-context.service'

@Component({ standalone: true, template: '' })
class TestRouteComponent {}

describe('AppShellFacade', () => {
  const authState = {
    authenticated: signal(false),
    bootstrap: jasmine.createSpy('bootstrap')
  }
  const sessionSync = {
    handshakeTick: signal(0),
    status: signal<'anonymous'>('anonymous'),
    syncSession: jasmine.createSpy('syncSession').and.resolveTo()
  }
  const redirects = { capture: jasmine.createSpy('capture') }
  const scrollContext = {
    smoothToTop: jasmine.createSpy('smoothToTop')
  }

  beforeEach(() => {
    authState.bootstrap.calls.reset()
    sessionSync.syncSession.calls.reset()
    redirects.capture.calls.reset()
    scrollContext.smoothToTop.calls.reset()

    TestBed.configureTestingModule({
      providers: [
        provideRouter([{
          path: '',
          component: TestRouteComponent,
          data: { routePolicy: { access: 'authenticated', shell: 'standard' } }
        }, {
          path: 'welcome',
          component: TestRouteComponent,
          data: { routePolicy: { access: 'logged-out-only', shell: 'welcome' } }
        }]),
        { provide: AuthStateStore, useValue: authState },
        { provide: SessionSyncService, useValue: sessionSync },
        { provide: AuthRedirectService, useValue: redirects },
        { provide: ScrollContextService, useValue: scrollContext }
      ]
    })
  })

  it('keeps session bootstrap and navigation policy outside AppComponent', () => {
    const facade = TestBed.inject(AppShellFacade)

    expect(facade).toBeTruthy()
    expect(authState.bootstrap).toHaveBeenCalled()
    expect(sessionSync.syncSession).toHaveBeenCalled()
  })

  it('exposes route metadata as the shell layout source of truth', async () => {
    const router = TestBed.inject(Router)
    const facade = TestBed.inject(AppShellFacade)

    await router.navigateByUrl('/welcome')

    expect(facade.routePolicy()).toEqual({ access: 'logged-out-only', shell: 'welcome' })
  })

  it('allows a repeated target after the prior transaction reaches a terminal event', () => {
    const facade = TestBed.inject(AppShellFacade) as any

    facade.programmaticNavigation = { token: 1, target: '/welcome' }
    facade.onProgrammaticNavigationEvent(new NavigationStart(1, '/welcome'))
    facade.onProgrammaticNavigationEvent(new NavigationEnd(1, '/welcome', '/welcome'))
    expect(facade.programmaticNavigation).toBeUndefined()

    facade.programmaticNavigation = { token: 2, target: '/welcome' }
    expect(facade.programmaticNavigation.token).toBe(2)
  })

  it('releases a transaction on cancellation, error, and superseding intent', () => {
    const facade = TestBed.inject(AppShellFacade) as any

    facade.programmaticNavigation = { token: 2, target: '/welcome' }
    facade.onProgrammaticNavigationEvent(new NavigationStart(2, '/welcome'))
    facade.onProgrammaticNavigationEvent(new NavigationCancel(3, '/dashboard', 'superseded'))
    expect(facade.programmaticNavigation).toBeUndefined()

    facade.programmaticNavigation = { token: 3, target: '/welcome' }
    facade.onProgrammaticNavigationEvent(new NavigationStart(3, '/welcome'))
    facade.onProgrammaticNavigationEvent(new NavigationError(3, '/welcome', new Error('test')))
    expect(facade.programmaticNavigation).toBeUndefined()
  })
})
