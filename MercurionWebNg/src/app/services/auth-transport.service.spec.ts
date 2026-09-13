import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { AuthTransportService } from './auth-transport.service'

describe('AuthTransportService', () => {
  let service: AuthTransportService
  let http: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] })
    service = TestBed.inject(AuthTransportService)
    http = TestBed.inject(HttpTestingController)
  })
  afterEach(() => http.verify())

  it('maps login transport headers without adding mock identity headers', () => {
    service.loginFirstStep({
      email: 'user@example.test',
      password: 'password',
      remember: false,
      fingerprintBase64: 'fingerprint',
      sessionDeviceInfo: { browser: {} },
      turnstileToken: 'challenge-token'
    }).subscribe()
    const request = http.expectOne('/api/authentication/login/1')
    expect(request.request.headers.get('X-Fingerprint')).toBe('fingerprint')
    expect(request.request.headers.get('X-Challenge-Token')).toBe('challenge-token')
    expect(request.request.headers.has('X-Mock-IP')).toBeFalse()
    request.flush({})
  })

  it('maps the MFA verification contract and bearer token', () => {
    service.loginThirdStep('EMAIL_OTP', { code: '123456' }, {
      fingerprintBase64: 'fingerprint',
      sessionDeviceInfo: { browser: {} }
    }, 'preauthorization-token').subscribe()
    const request = http.expectOne('/api/authentication/login/EMAIL_OTP/3')
    expect(request.request.headers.get('X-Fingerprint')).toBe('fingerprint')
    expect(request.request.headers.get('Authorization')).toBe('Bearer preauthorization-token')
    expect(request.request.headers.has('X-Mock-IP')).toBeFalse()
    request.flush({})
  })
})
