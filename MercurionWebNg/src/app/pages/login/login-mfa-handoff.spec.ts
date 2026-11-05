import { ApplicationRef, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter, Router } from '@angular/router'
import { RouterTestingHarness } from '@angular/router/testing'
import { NEVER, Subject, of, throwError } from 'rxjs'
import { HttpErrorResponse } from '@angular/common/http'
import { utcInstantFromEpochMs } from '@mercurion/rest-contracts'
import type {
  Confirm_Login_FirstStepDTO,
  ConfirmWithAccessTokenAndInitialsDTO,
} from '@mercurion/rest-contracts'
import { routes } from '../../app.routes'
import { APP_CONFIG, createAppConfig } from '../../config/app-config'
import { environment } from '../../../environments/environment.development'
import { AppShellFacade } from '../../services/app-shell.facade'
import { AuthStateStore } from '../../services/auth-state.store'
import { AuthSessionPersistenceService } from '../../services/auth-session-persistence.service'
import { AuthTransportService } from '../../services/auth-transport.service'
import { FingerprintService } from '../../services/fingerprint.service'
import { SessionSyncService } from '../../services/session-sync.service'
import { ScrollContextService } from '../../services/context/scroll-context.service'
import { LoginPageComponent } from './login.page.component'
import { MfaPageComponent } from './mfa/mfa.page.component'
import { ToastService } from '../../services/toast.service'

const credentials = {
  email: 'test@example.test',
  password: 'password',
  remember: false,
  turnstileToken: 'captcha',
}

describe('Login to MFA through application routes', () => {
  let response: Confirm_Login_FirstStepDTO
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    document.cookie = '__logged_in=; Max-Age=0; path=/'
    document.cookie = '__logged_in_=; Max-Age=0; path=/'
    response = {
      statusCode: 200,
      timestamp: new Date().toISOString() as Confirm_Login_FirstStepDTO['timestamp'],
      message: 'MFA',
      needsMfa: true,
      suspiciousAttempt: false,
      enabledMfaStrategies: ['APP_TOTP'],
      initials: 'AB',
      deviceId: 'device',
      preAuthorizationToken: `header.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 300 }))}.signature`,
    }
    TestBed.configureTestingModule({
      providers: [
        { provide: ToastService, useValue: { trigger: jasmine.createSpy('toast') } },
        provideRouter(routes),
        { provide: APP_CONFIG, useValue: createAppConfig(environment) },
        {
          provide: AuthTransportService,
          useValue: {
            loginFirstStep: () => of(response),
            loginSecondStep: jasmine.createSpy().and.returnValue(of({})),
            loginThirdStep: jasmine.createSpy().and.returnValue(
              throwError(
                () =>
                  new HttpErrorResponse({
                    status: 401,
                    error: { code: 'MFA_CODE_INVALID' },
                  })
              )
            ),
          },
        },
        {
          provide: FingerprintService,
          useValue: {
            getSanitizedFingerprint: async () => ({
              fingerprintDataEnc: 'fp',
              sessionDeviceInfo: { browser: {} },
            }),
          },
        },
        {
          provide: SessionSyncService,
          useValue: {
            handshakeTick: signal(0),
            status: signal('anonymous'),
            checkSession: async () => undefined,
          },
        },
        { provide: ScrollContextService, useValue: { smoothToTop: () => undefined } },
      ],
    })
  })
  afterEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    document.cookie = '__logged_in=; Max-Age=0; path=/'
    document.cookie = '__logged_in_=; Max-Age=0; path=/'
  })

  async function openLogin() {
    TestBed.inject(AppShellFacade)
    const harness = await RouterTestingHarness.create()
    const page = await harness.navigateByUrl('/login', LoginPageComponent)
    await TestBed.inject(ApplicationRef).whenStable()
    return { harness, page }
  }

  async function settleRoute(harness: RouterTestingHarness) {
    harness.detectChanges()
    await TestBed.inject(ApplicationRef).whenStable()
    await Promise.resolve()
    await Promise.resolve()
    harness.detectChanges()
    await TestBed.inject(ApplicationRef).whenStable()
  }

  for (const scenario of [
    { strategies: ['APP_TOTP'] as const, suspicious: false, destination: '/login/mfa/APP_TOTP' },
    {
      strategies: ['APP_TOTP', 'EMAIL_OTP'] as const,
      suspicious: false,
      destination: '/login/mfa/CHOOSE_METHOD',
    },
    {
      strategies: ['EMAIL_OTP'] as const,
      suspicious: true,
      destination: '/login/mfa/EMAIL_OTP?trust_verify=true',
    },
  ]) {
    it(`hands the first step to ${scenario.destination}`, async () => {
      response.enabledMfaStrategies = [...scenario.strategies]
      response.suspiciousAttempt = scenario.suspicious
      const { harness, page } = await openLogin()
      page.submit(credentials)
      await TestBed.inject(ApplicationRef).whenStable()
      harness.detectChanges()
      await Promise.resolve()
      await Promise.resolve()
      harness.detectChanges()
      expect(TestBed.inject(Router).url).toBe(scenario.destination)
      expect(TestBed.inject(AuthStateStore).isPreAuth()).toBeTrue()
      expect(TestBed.inject(AuthStateStore).authenticated()).toBeFalse()
      expect(harness.routeNativeElement?.querySelector('form')).not.toBeNull()
      expect(harness.routeNativeElement?.textContent).toContain('Verifica la tua identità')
      expect(harness.routeNativeElement?.textContent).not.toContain('mail inserita')
      expect(TestBed.inject(AuthTransportService).loginThirdStep).not.toHaveBeenCalled()
    })
  }

  for (const code of [
    'MFA_CODE_INVALID',
    'MFA_DEVICE_MISMATCH',
    'MFA_PREAUTHORIZATION_EXPIRED',
    'MFA_PREAUTHORIZATION_INVALID',
  ]) {
    it(`abandons the consumed or invalid preauthorization after ${code}`, async () => {
      const { harness, page } = await openLogin()
      const transport = TestBed.inject(AuthTransportService)
      const calls = transport.loginThirdStep as jasmine.Spy
      calls.and.returnValue(
        throwError(() => new HttpErrorResponse({ status: 401, error: { code } }))
      )
      page.submit(credentials)
      harness.detectChanges()
      await TestBed.inject(ApplicationRef).whenStable()
      await Promise.resolve()
      await Promise.resolve()
      harness.detectChanges()
      await TestBed.inject(ApplicationRef).whenStable()
      harness.detectChanges()
      const mfa = harness.routeDebugElement!.componentInstance as MfaPageComponent
      mfa['codeControl'].setValue('123456')
      mfa.verifyCode()
      harness.detectChanges()
      await TestBed.inject(ApplicationRef).whenStable()
      await Promise.resolve()
      await Promise.resolve()
      harness.detectChanges()
      await TestBed.inject(ApplicationRef).whenStable()
      harness.detectChanges()
      expect(TestBed.inject(Router).url).toBe('/login')
      expect(TestBed.inject(AuthSessionPersistenceService).readPreAuthState().status).toBe(
        'missing'
      )
      expect(TestBed.inject(AuthStateStore).isPreAuth()).toBeFalse()
      expect(TestBed.inject(AuthStateStore).authenticated()).toBeFalse()
      mfa.verifyCode()
      expect(calls).toHaveBeenCalledTimes(1)
    })
  }

  for (const strategy of ['EMAIL_OTP', 'SMS_OTP'] as const) {
    it(`renders server OTP lifetime for ${strategy} and clears it when changing method`, async () => {
      response.enabledMfaStrategies = [strategy, 'APP_TOTP']
      const { harness, page } = await openLogin()
      const sentAt = utcInstantFromEpochMs(Date.now())
      const send = TestBed.inject(AuthTransportService).loginSecondStep as jasmine.Spy
      send.and.returnValue(
        of({
          statusCode: 200,
          message: 'Synthetic',
          timestamp: sentAt,
          generatedAt: sentAt,
          expiresAt: utcInstantFromEpochMs(Date.now() + 60_000),
        })
      )
      page.submit(credentials)
      await settleRoute(harness)
      await TestBed.inject(Router).navigateByUrl(`/login/mfa/${strategy}`)
      await settleRoute(harness)
      expect(
        harness.routeNativeElement?.querySelector('m-otp-challenge-clock')?.textContent
      ).toContain('secondi rimanenti')
      await TestBed.inject(Router).navigateByUrl('/login/mfa/APP_TOTP')
      await settleRoute(harness)
      expect(harness.routeNativeElement?.querySelector('m-otp-challenge-clock')).toBeNull()
      expect(send).toHaveBeenCalledTimes(1)
    })
  }

  it('expires an idle preauthorization on returning to the tab and ignores a pending response', async () => {
    const { harness, page } = await openLogin()
    const pending = new Subject<ConfirmWithAccessTokenAndInitialsDTO>()
    const transport = TestBed.inject(AuthTransportService)
    const verify = transport.loginThirdStep as jasmine.Spy
    verify.and.returnValue(pending)
    page.submit(credentials)
    harness.detectChanges()
    await TestBed.inject(ApplicationRef).whenStable()
    await Promise.resolve()
    await Promise.resolve()
    harness.detectChanges()
    await TestBed.inject(ApplicationRef).whenStable()
    harness.detectChanges()
    const mfa = harness.routeDebugElement!.componentInstance as MfaPageComponent
    const state = TestBed.inject(AuthSessionPersistenceService).readPreAuthState()
    if (state.status !== 'valid') throw new Error('Expected synthetic preauthorization')
    mfa['codeControl'].setValue('123456')
    mfa.verifyCode()
    const activate = spyOn(TestBed.inject(AuthStateStore), 'activateAuthenticatedSession')
    spyOn(Date, 'now').and.returnValue(state.state.expiresAt + 1)
    spyOnProperty(document, 'hidden', 'get').and.returnValue(false)
    document.dispatchEvent(new Event('visibilitychange'))
    harness.detectChanges()
    await TestBed.inject(ApplicationRef).whenStable()
    await Promise.resolve()
    await Promise.resolve()
    harness.detectChanges()
    await TestBed.inject(ApplicationRef).whenStable()
    harness.detectChanges()
    expect(TestBed.inject(Router).url).toBe('/login')
    expect(TestBed.inject(AuthSessionPersistenceService).readPreAuthState().status).toBe('missing')
    pending.next({} as ConfirmWithAccessTokenAndInitialsDTO)
    pending.complete()
    expect(activate).not.toHaveBeenCalled()
  })

  it('checks expiry before a verification request instead of waiting for the interval', async () => {
    const { harness, page } = await openLogin()
    page.submit(credentials)
    harness.detectChanges()
    await TestBed.inject(ApplicationRef).whenStable()
    await Promise.resolve()
    await Promise.resolve()
    harness.detectChanges()
    await TestBed.inject(ApplicationRef).whenStable()
    harness.detectChanges()
    const mfa = harness.routeDebugElement!.componentInstance as MfaPageComponent
    const state = TestBed.inject(AuthSessionPersistenceService).readPreAuthState()
    if (state.status !== 'valid') throw new Error('Expected synthetic preauthorization')
    spyOn(Date, 'now').and.returnValue(state.state.expiresAt + 1)
    mfa['codeControl'].setValue('123456')
    mfa.verifyCode()
    await TestBed.inject(ApplicationRef).whenStable()
    expect(TestBed.inject(Router).url).toBe('/login')
    expect(TestBed.inject(AuthTransportService).loginThirdStep).not.toHaveBeenCalled()
  })

  it('abandons rejected preauthorization during challenge initialization', async () => {
    response.enabledMfaStrategies = ['EMAIL_OTP']
    const { harness, page } = await openLogin()
    const send = TestBed.inject(AuthTransportService).loginSecondStep as jasmine.Spy
    send.and.returnValue(throwError(() => new HttpErrorResponse({ status: 401 })))
    page.submit(credentials)
    harness.detectChanges()
    await TestBed.inject(ApplicationRef).whenStable()
    await Promise.resolve()
    await Promise.resolve()
    harness.detectChanges()
    await TestBed.inject(ApplicationRef).whenStable()
    harness.detectChanges()
    expect(TestBed.inject(Router).url).toBe('/login')
    expect(TestBed.inject(AuthSessionPersistenceService).readPreAuthState().status).toBe('missing')
    expect(TestBed.inject(AuthStateStore).isPreAuth()).toBeFalse()
  })

  it('expires an idle flow without requiring a click or a visibility event', async () => {
    const { harness, page } = await openLogin()
    page.submit(credentials)
    await settleRoute(harness)
    const state = TestBed.inject(AuthSessionPersistenceService).readPreAuthState()
    if (state.status !== 'valid') throw new Error('Expected synthetic preauthorization')
    spyOn(Date, 'now').and.returnValue(state.state.expiresAt + 1)
    await new Promise(resolve => setTimeout(resolve, 1100))
    await settleRoute(harness)
    expect(TestBed.inject(Router).url).toBe('/login')
    expect(TestBed.inject(AuthStateStore).isPreAuth()).toBeFalse()
    expect(TestBed.inject(AuthTransportService).loginThirdStep).not.toHaveBeenCalled()
  })

  it('does not claim a network failure proves preauthorization revocation', async () => {
    const { harness, page } = await openLogin()
    const calls = TestBed.inject(AuthTransportService).loginThirdStep as jasmine.Spy
    calls.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })))
    page.submit(credentials)
    harness.detectChanges()
    await TestBed.inject(ApplicationRef).whenStable()
    await Promise.resolve()
    await Promise.resolve()
    harness.detectChanges()
    await TestBed.inject(ApplicationRef).whenStable()
    harness.detectChanges()
    const mfa = harness.routeDebugElement!.componentInstance as MfaPageComponent
    mfa['codeControl'].setValue('123456')
    mfa.verifyCode()
    harness.detectChanges()
    expect(TestBed.inject(Router).url).toBe('/login/mfa/APP_TOTP')
    expect(TestBed.inject(AuthSessionPersistenceService).readPreAuthState().status).toBe('valid')
    expect(harness.routeNativeElement?.textContent).toContain('Non è stato possibile verificare')
  })

  it('automatically submits the email code once and keeps its leading zeros', async () => {
    response.enabledMfaStrategies = ['EMAIL_OTP']
    const { harness, page } = await openLogin()
    const transport = TestBed.inject(AuthTransportService)
    const calls = transport.loginThirdStep as jasmine.Spy
    calls.and.returnValue(NEVER)
    page.submit(credentials)
    await TestBed.inject(ApplicationRef).whenStable()
    harness.detectChanges()
    await Promise.resolve()
    harness.detectChanges()
    const input = harness.routeNativeElement!.querySelector<HTMLInputElement>('#otp')!
    input.value = '001234'
    input.dispatchEvent(new Event('input'))
    await new Promise((resolve) => setTimeout(resolve, 350))
    harness.detectChanges()
    expect(calls).toHaveBeenCalledOnceWith(
      'EMAIL_OTP',
      { totp: '001234' },
      {
        fingerprintBase64: 'fp',
        sessionDeviceInfo: { browser: {} },
      },
      response.preAuthorizationToken,
      false
    )
    ;(harness.routeDebugElement!.componentInstance as MfaPageComponent).verifyCode()
    expect(calls).toHaveBeenCalledTimes(1)
    expect(transport.loginSecondStep).toHaveBeenCalledTimes(1)
  })

  it('does not resend the email challenge for unrelated query parameter changes', async () => {
    response.enabledMfaStrategies = ['EMAIL_OTP']
    const { harness, page } = await openLogin()
    page.submit(credentials)
    await TestBed.inject(ApplicationRef).whenStable()
    harness.detectChanges()
    await Promise.resolve()
    harness.detectChanges()
    const mfa = harness.routeDebugElement!.componentInstance as MfaPageComponent
    mfa['codeControl'].setValue('123')
    await TestBed.inject(Router).navigateByUrl('/login/mfa/EMAIL_OTP?extra=1')
    harness.detectChanges()
    expect(TestBed.inject(AuthTransportService).loginSecondStep).toHaveBeenCalledTimes(1)
    expect(mfa['codeControl'].value).toBe('123')
  })

  it('shows the login form with an error when MFA state cannot be saved', async () => {
    const { harness, page } = await openLogin()
    spyOn(TestBed.inject(AuthSessionPersistenceService), 'savePreAuthState').and.returnValue(false)
    page.credentialForm()?.showPasswordStep()
    page.submit(credentials)
    await TestBed.inject(ApplicationRef).whenStable()
    harness.detectChanges()
    expect(TestBed.inject(Router).url).toBe('/login')
    expect(page.pageLoading()).toBeFalse()
    expect(harness.routeNativeElement?.querySelector('m-login-credential-form')).not.toBeNull()
    expect(harness.routeNativeElement?.textContent).toContain('Non è stato possibile completare')
  })

  it('recovers the login form when the MFA navigation is cancelled', async () => {
    const { harness, page } = await openLogin()
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(false)
    page.credentialForm()?.showPasswordStep()
    page.submit(credentials)
    await TestBed.inject(ApplicationRef).whenStable()
    harness.detectChanges()
    expect(TestBed.inject(Router).url).toBe('/login')
    expect(page.pageLoading()).toBeFalse()
    expect(harness.routeNativeElement?.querySelector('m-login-credential-form')).not.toBeNull()
    expect(TestBed.inject(AuthStateStore).isPreAuth()).toBeFalse()
  })
})
