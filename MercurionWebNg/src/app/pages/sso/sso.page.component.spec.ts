import { FingerprintDataWrapper } from '../../Models/auth/fingerprint.models'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { RouterTestingModule } from '@angular/router/testing'
import { convertToParamMap, Router } from '@angular/router'
import { of, Subject } from 'rxjs'

import { SsoPageComponent } from './sso.page.component'
import { ActivatedRoute } from '@angular/router'
import { TypeGuardsService } from '../../services/type-guards.service'
import { FingerprintService } from '../../services/fingerprint.service'
import { AuthTransportService } from '../../services/auth-transport.service'
import { SessionSyncService } from '../../services/session-sync.service'
import { AuthStateStore } from '../../services/auth-state.store'
import {
  AuthSessionPersistenceService,
  InMemoryAuthSessionPersistence,
} from '../../services/auth-session-persistence.service'
import { AuthRedirectService } from '../../services/auth-redirect.service'

class ActivatedRouteStub {
  queryParamMap = of(convertToParamMap({ provider: 'ORCID' }))
  fragment = of('t=a.b.c')
}

class TypeGuardsStub {
  is_SSO_AuthProvider(provider: string): boolean {
    return provider === 'ORCID'
  }
}

class FingerprintServiceStub {
  getSanitizedFingerprint(): Promise<FingerprintDataWrapper> {
    return Promise.resolve({ fingerprintDataEnc: 'fp', sessionDeviceInfo: { browser: {} } })
  }
}

class AuthServiceStub {
  ssoAuthorizeFlow() {
    return of({ accessToken: 'token', ws_accessToken: 'ws', initials: 'U' })
  }
  setAccessToken(): void {
    /* no-op */
  }
  setWs_accessToken(): void {
    /* no-op */
  }
}

class SessionSyncServiceStub {
  resumeSession(): void {
    /* no-op */
  }
}

describe('SsoPageComponent', () => {
  let component: SsoPageComponent
  let fixture: ComponentFixture<SsoPageComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, SsoPageComponent],
      providers: [
        {
          provide: AuthSessionPersistenceService,
          useFactory: () => new InMemoryAuthSessionPersistence(),
        },
        { provide: ActivatedRoute, useClass: ActivatedRouteStub },
        { provide: TypeGuardsService, useClass: TypeGuardsStub },
        { provide: FingerprintService, useClass: FingerprintServiceStub },
        { provide: AuthTransportService, useClass: AuthServiceStub },
        { provide: SessionSyncService, useClass: SessionSyncServiceStub },
      ],
    }).compileComponents()

    fixture = TestBed.createComponent(SsoPageComponent)
    component = fixture.componentInstance
  })

  it('should create', () => {
    fixture.detectChanges()
    expect(component).toBeTruthy()
  })

  it('completes SSO with one client navigation and no page reload', async () => {
    const state = TestBed.inject(AuthStateStore)
    spyOn(state, 'beginAuthentication')
    spyOn(state, 'activateAuthenticatedSession')
    const resume = spyOn(TestBed.inject(SessionSyncService), 'resumeSession')
    const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true)

    fixture.detectChanges()
    await fixture.whenStable()

    expect(state.beginAuthentication).toHaveBeenCalledOnceWith('sso')
    expect(state.activateAuthenticatedSession).toHaveBeenCalledOnceWith({
      initials: 'U',
      accessToken: 'token',
      wsAccessToken: 'ws',
    })
    expect(resume).toHaveBeenCalledOnceWith('U')
    expect(navigate).toHaveBeenCalledOnceWith('/dashboard', { replaceUrl: true })
  })

  it('consumes an explicit return path once after completing SSO', async () => {
    const state = TestBed.inject(AuthStateStore)
    spyOn(state, 'beginAuthentication')
    spyOn(state, 'activateAuthenticatedSession')
    const redirects = TestBed.inject(AuthRedirectService)
    redirects.capture('/molecules/editor?x=1#atom')
    const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true)

    fixture.detectChanges()
    await fixture.whenStable()

    expect(navigate).toHaveBeenCalledOnceWith('/molecules/editor?x=1#atom', { replaceUrl: true })
    expect(redirects.peek()).toBeNull()
  })
  for (const fragment of [null, '', 'other=value', 't=malformed', 't=%ZZ']) {
    it(`leaves an incomplete callback instead of keeping the spinner forever: ${fragment}`, async () => {
      const route = TestBed.inject(ActivatedRoute)
      route.fragment = of(fragment)
      const fingerprint = spyOn(
        TestBed.inject(FingerprintService),
        'getSanitizedFingerprint'
      ).and.callThrough()
      const authorize = spyOn(TestBed.inject(AuthTransportService), 'ssoAuthorizeFlow')
      const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true)

      fixture.detectChanges()
      await fixture.whenStable()

      expect(navigate).toHaveBeenCalledOnceWith('/404-not-found')
      expect(fingerprint).not.toHaveBeenCalled()
      expect(authorize).not.toHaveBeenCalled()
    })
  }

  it('rejects an unknown provider before collecting a fingerprint', async () => {
    const route = TestBed.inject(ActivatedRoute) as ActivatedRouteStub
    route.queryParamMap = of(convertToParamMap({ provider: 'unknown' }))
    const fingerprint = spyOn(
      TestBed.inject(FingerprintService),
      'getSanitizedFingerprint'
    ).and.callThrough()
    const authorize = spyOn(TestBed.inject(AuthTransportService), 'ssoAuthorizeFlow')
    const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true)

    fixture.detectChanges()
    await fixture.whenStable()

    expect(navigate).toHaveBeenCalledOnceWith('/404-not-found')
    expect(fingerprint).not.toHaveBeenCalled()
    expect(authorize).not.toHaveBeenCalled()
  })

  it('returns to the existing login failure flow when fingerprint collection rejects', async () => {
    spyOn(TestBed.inject(FingerprintService), 'getSanitizedFingerprint').and.rejectWith(
      new Error('Synthetic fingerprint failure')
    )
    const authorize = spyOn(TestBed.inject(AuthTransportService), 'ssoAuthorizeFlow')
    const redirects = TestBed.inject(AuthRedirectService)
    redirects.capture('/molecules/editor')
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true)

    fixture.detectChanges()
    await fixture.whenStable()

    expect(authorize).not.toHaveBeenCalled()
    expect(navigate).toHaveBeenCalledOnceWith(['/login'], {
      queryParams: { err: 'sso_failed', provider: 'ORCID' },
    })
    expect(redirects.peek()).toBeNull()
  })

  it('preserves the existing login redirect after an authorization failure', async () => {
    const response = new Subject<never>()
    spyOn(TestBed.inject(AuthTransportService), 'ssoAuthorizeFlow').and.returnValue(response)
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true)
    const redirects = TestBed.inject(AuthRedirectService)
    redirects.capture('/molecules/editor')
    fixture.detectChanges()
    await fixture.whenStable()

    response.error(new Error('Synthetic authorization failure'))
    await fixture.whenStable()

    expect(navigate).toHaveBeenCalledOnceWith(['/login'], {
      queryParams: { err: 'sso_failed', provider: 'ORCID' },
    })
    expect(redirects.peek()).toBeNull()
  })

  it('does not navigate or clear a return path from a queued error after leaving the page', async () => {
    const response = new Subject<never>()
    spyOn(TestBed.inject(AuthTransportService), 'ssoAuthorizeFlow').and.returnValue(response)
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true)
    const redirects = TestBed.inject(AuthRedirectService)
    redirects.capture('/molecules/editor')
    fixture.detectChanges()
    await fixture.whenStable()

    response.error(new Error('Synthetic authorization failure'))
    fixture.destroy()
    await Promise.resolve()

    expect(navigate).not.toHaveBeenCalled()
    expect(redirects.peek()).toBe('/molecules/editor')
  })

  it('does not authorize or start new animation frames when a pending fingerprint resolves after destruction', async () => {
    let resolveFingerprint!: (fingerprint: FingerprintDataWrapper) => void
    const pending = new Promise<FingerprintDataWrapper>((resolve) => {
      resolveFingerprint = resolve
    })
    spyOn(TestBed.inject(FingerprintService), 'getSanitizedFingerprint').and.returnValue(pending)
    const authorize = spyOn(TestBed.inject(AuthTransportService), 'ssoAuthorizeFlow')
    const animation = spyOn(window, 'requestAnimationFrame').and.returnValue(1)
    spyOn(window, 'cancelAnimationFrame')
    fixture.detectChanges()
    fixture.destroy()
    const framesAtDestruction = animation.calls.count()

    resolveFingerprint({ fingerprintDataEnc: 'fp', sessionDeviceInfo: { browser: {} } })
    await Promise.resolve()
    await Promise.resolve()

    expect(authorize).not.toHaveBeenCalled()
    expect(animation.calls.count()).toBe(framesAtDestruction)
  })

  it('keeps only the original spinner while the callback is pending', () => {
    spyOn(TestBed.inject(FingerprintService), 'getSanitizedFingerprint').and.returnValue(
      new Promise<never>(() => {})
    )
    fixture.detectChanges()

    const host: HTMLElement = fixture.nativeElement
    expect(host.querySelector('[role="main"]')?.className).toBe('main-container h-full')
    expect(host.querySelectorAll('m-progress-indicator').length).toBe(1)
    expect(host.querySelector('[role="status"]')?.className).toBe('fixed top-1/2 -translate-y-1/2')
    expect(host.querySelector('.auth-card, h1, h2, form')).toBeNull()
  })
})
