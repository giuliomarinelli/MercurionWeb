import { ApplicationRef, Component, signal } from '@angular/core'
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
    checkSession: jasmine.createSpy('checkSession').and.resolveTo()
  }
  const redirects = { capture: jasmine.createSpy('capture') }
  const scrollContext = {
    smoothToTop: jasmine.createSpy('smoothToTop')
  }

  beforeEach(() => {
    authState.authenticated.set(false)
    sessionSync.status.set('anonymous')
    authState.bootstrap.calls.reset()
    sessionSync.checkSession.calls.reset()
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
        }, {
          path: 'dashboard',
          component: TestRouteComponent,
          data: { routePolicy: { access: 'authenticated', shell: 'standard' } }
        }, {
          path: 'login',
          component: TestRouteComponent,
          data: { routePolicy: { access: 'public', shell: 'minimal' } }
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
    expect(sessionSync.checkSession).toHaveBeenCalled()
  })

  it('exposes route metadata as the shell layout source of truth', async () => {
    const router = TestBed.inject(Router)
    const facade = TestBed.inject(AppShellFacade)

    await router.navigateByUrl('/welcome')

    expect(facade.routePolicy()).toEqual({ access: 'logged-out-only', shell: 'welcome' })
  })

  it('sends a protected page directly to login when logout clears auth state', async () => {
    authState.authenticated.set(true)
    redirects.capture.and.returnValue('/dashboard')
    const router = TestBed.inject(Router)
    const facade = TestBed.inject(AppShellFacade)
    const destinations: string[] = []
    router.events.subscribe(event => {
      if (event instanceof NavigationEnd) destinations.push(event.urlAfterRedirects)
    })

    await router.navigateByUrl('/dashboard')
    TestBed.flushEffects()
    authState.authenticated.set(false)
    TestBed.flushEffects()
    await TestBed.inject(ApplicationRef).whenStable()

    expect(facade.routePolicy().access).toBe('public')
    expect(router.parseUrl(router.url).root.children['primary'].segments[0].path).toBe('login')
    expect(router.parseUrl(router.url).queryParams['redirect_to']).toBe('/dashboard')
    expect(redirects.capture).toHaveBeenCalledWith('/dashboard')
    expect(destinations).not.toContain('/welcome')
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
