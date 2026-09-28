import { TestBed } from '@angular/core/testing'
import { Router } from '@angular/router'
import { firstValueFrom, of } from 'rxjs'
import { AuthFacade } from './auth.facade'
import { AuthTransportService } from './auth-transport.service'
import { AuthSessionRepository } from './auth-session-repository.service'
import { AuthSessionPersistenceService } from './auth-session-persistence.service'
import { AuthStateStore } from './auth-state.store'
import { AuthErrorService } from './auth-error.service'
import { AuthRedirectService } from './auth-redirect.service'
import { FingerprintService } from './fingerprint.service'
import { SessionSyncService } from './session-sync.service'

describe('AuthFacade', () => {
  it('abandons an unfinished MFA flow before a new credential login', async () => {
    const transitions: string[] = []
    const authState = {
      isPreAuth: () => true,
      logout: () => transitions.push('logout'),
      beginAuthentication: () => transitions.push('begin')
    }
    const persistence = {
      clearPreAuthData: () => transitions.push('clear-pre-auth')
    }
    const transport = {
      loginFirstStep: jasmine.createSpy().and.callFake(() => {
        transitions.push('request')
        return of({
          needsMfa: true,
          preAuthorizationToken: 'replacement',
          suspiciousAttempt: true,
          enabledMfaStrategies: ['EMAIL_OTP']
        })
      })
    }
    const sessions = {
      savePreAuthState: jasmine.createSpy().and.returnValue(true),
      enterPreAuthentication: jasmine.createSpy()
    }
    TestBed.configureTestingModule({
      providers: [
        AuthFacade,
        { provide: AuthTransportService, useValue: transport },
        { provide: AuthSessionRepository, useValue: sessions },
        { provide: AuthSessionPersistenceService, useValue: persistence },
        { provide: AuthStateStore, useValue: authState },
        { provide: AuthErrorService, useValue: { beginAttempt: () => undefined } },
        { provide: AuthRedirectService, useValue: {} },
        { provide: FingerprintService, useValue: {
          getSanitizedFingerprint: async () => ({
            fingerprintDataEnc: 'fingerprint',
            sessionDeviceInfo: {}
          })
        } },
        { provide: SessionSyncService, useValue: {} },
        { provide: Router, useValue: { navigate: jasmine.createSpy().and.resolveTo(true) } }
      ]
    })

    const facade = TestBed.inject(AuthFacade)
    await firstValueFrom(facade.prepareLogin())
    await firstValueFrom(facade.login({
      email: 'person@example.test',
      password: 'password',
      remember: false,
      turnstileToken: 'fresh-challenge'
    }))

    expect(transitions).toEqual(['logout', 'clear-pre-auth', 'begin', 'request'])
    expect(sessions.enterPreAuthentication).toHaveBeenCalledWith('replacement')
  })
})
