import { Component, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter, Router } from '@angular/router'
import { AppShellFacade } from './app-shell.facade'
import { AuthRedirectService } from './auth-redirect.service'
import { AuthStateStore } from './auth-state.store'
import { SessionSyncService } from './session-sync.service'
import { AppContextService } from './context/app-context.service'

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
  const appContext = {
    smoothToTop: jasmine.createSpy('smoothToTop')
  }

  beforeEach(() => {
    authState.bootstrap.calls.reset()
    sessionSync.syncSession.calls.reset()
    redirects.capture.calls.reset()
    appContext.smoothToTop.calls.reset()

    TestBed.configureTestingModule({
      providers: [
        provideRouter([{
          path: 'welcome',
          component: TestRouteComponent,
          data: { routePolicy: { access: 'logged-out-only', shell: 'welcome' } }
        }]),
        { provide: AuthStateStore, useValue: authState },
        { provide: SessionSyncService, useValue: sessionSync },
        { provide: AuthRedirectService, useValue: redirects },
        { provide: AppContextService, useValue: appContext }
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
})
