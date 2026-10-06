import { ApplicationRef, Component, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, provideRouter, Router } from '@angular/router'
import { AppShellFacade } from './app-shell.facade'
import { AuthRedirectService } from './auth-redirect.service'
import { AuthStateStore } from './auth-state.store'
import { SessionSyncService } from './session-sync.service'
import { ScrollContextService } from './context/scroll-context.service'
import { BrowserStorageRegistry, storageDescriptor } from './browser-storage-registry'

@Component({ standalone: true, template: '' })
class TestRouteComponent {}

describe('AppShellFacade', () => {
  const authState = {
    authenticated: signal(false),
    bootstrap: jasmine.createSpy('bootstrap')
  }
  const sessionSync = {
    handshakeTick: signal(0),
    status: signal<'anonymous' | 'loggedIn'>('anonymous'),
    checkSession: jasmine.createSpy('checkSession').and.resolveTo()
  }
  const redirects = { capture: jasmine.createSpy('capture') }
  const scrollContext = {
    smoothToTop: jasmine.createSpy('smoothToTop')
  }

  beforeEach(() => {
    new BrowserStorageRegistry().remove(storageDescriptor('mercurion.v1.is-first-visit'))
    authState.authenticated.set(false)
    sessionSync.handshakeTick.set(0)
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
          data: { routePolicy: { access: 'public', shell: 'home' } }
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

  afterEach(() => {
    new BrowserStorageRegistry().remove(storageDescriptor('mercurion.v1.is-first-visit'))
  })

  it('persists the home animation flag only after reaching one of the three destinations', () => {
    const facade = TestBed.inject(AppShellFacade)
    const events = TestBed.inject(Router).events as import('rxjs').Subject<import('@angular/router').Event>
    const descriptor = storageDescriptor<string>('mercurion.v1.is-first-visit')
    const storage = TestBed.inject(BrowserStorageRegistry)

    events.next(new NavigationEnd(1, '/', '/'))
    expect(storage.get(descriptor)).toBeNull()
    events.next(new NavigationCancel(2, '/login', 'cancelled'))
    expect(storage.get(descriptor)).toBeNull()

    for (const [index, path] of ['/welcome', '/login', '/register'].entries()) {
      storage.remove(descriptor)
      events.next(new NavigationEnd(index + 3, path, `${path}?from=home`))
      expect(localStorage.getItem(descriptor.key)).toBe('true')
      expect(facade.shouldSkipHomeAnimations()).toBeTrue()
    }
  })

  it('requests one handshake per tick without reacting to state read by the handshake', () => {
    sessionSync.checkSession.and.callFake(async () => {
      sessionSync.status()
      authState.authenticated()
    })
    TestBed.inject(AppShellFacade)
    TestBed.flushEffects()
    sessionSync.checkSession.calls.reset()
    sessionSync.checkSession.and.resolveTo()

    sessionSync.handshakeTick.set(1)
    TestBed.flushEffects()
    expect(sessionSync.checkSession).toHaveBeenCalledTimes(1)
    sessionSync.status.set('loggedIn')
    authState.authenticated.set(true)
    TestBed.flushEffects()
    expect(sessionSync.checkSession).toHaveBeenCalledTimes(1)

    sessionSync.handshakeTick.set(2)
    TestBed.flushEffects()
    expect(sessionSync.checkSession).toHaveBeenCalledTimes(2)
  })

  it('exposes route metadata as the shell layout source of truth', async () => {
    const router = TestBed.inject(Router)
    const facade = TestBed.inject(AppShellFacade)

    await router.navigateByUrl('/welcome')

    expect(facade.routePolicy()).toEqual({ access: 'logged-out-only', shell: 'welcome' })
  })

  it('keeps an anonymous visitor on the public home', async () => {
    const router = TestBed.inject(Router)
    const facade = TestBed.inject(AppShellFacade)
    const navigate = spyOn(router, 'navigateByUrl').and.callThrough()

    await router.navigateByUrl('/')
    TestBed.flushEffects()
    await TestBed.inject(ApplicationRef).whenStable()

    expect(router.url).toBe('/')
    expect(facade.routePolicy()).toEqual({ access: 'public', shell: 'home' })
    expect(navigate).toHaveBeenCalledTimes(1)
    expect(redirects.capture).not.toHaveBeenCalled()
  })

  it('redirects an authenticated visitor directly from home to dashboard', async () => {
    authState.authenticated.set(true)
    sessionSync.status.set('loggedIn')
    const router = TestBed.inject(Router)
    TestBed.inject(AppShellFacade)
    const destinations: string[] = []
    router.events.subscribe(event => {
      if (event instanceof NavigationEnd) destinations.push(event.urlAfterRedirects)
    })

    await router.navigateByUrl('/')
    TestBed.flushEffects()
    await TestBed.inject(ApplicationRef).whenStable()

    expect(router.url).toBe('/dashboard')
    expect(destinations).not.toContain('/welcome')
  })

  it('redirects an authenticated visitor from welcome through Angular Router', async () => {
    authState.authenticated.set(true)
    sessionSync.status.set('loggedIn')
    const router = TestBed.inject(Router)
    TestBed.inject(AppShellFacade)

    await router.navigateByUrl('/welcome')
    TestBed.flushEffects()
    await TestBed.inject(ApplicationRef).whenStable()

    expect(router.url).toBe('/dashboard')
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
