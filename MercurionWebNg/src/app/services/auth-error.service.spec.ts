import { HttpErrorResponse } from '@angular/common/http'
import { ApplicationErrorCode } from '@mercurion/rest-contracts'
import { AuthErrorService } from './auth-error.service'

describe('AuthErrorService', () => {
  let service: AuthErrorService

  beforeEach(() => {
    service = new AuthErrorService()
  })

  const failure = (code: ApplicationErrorCode, status = 401) =>
    new HttpErrorResponse({ status, error: { code } })

  it('clears an error when a new authentication attempt begins', () => {
    service.setFromHttp(failure(ApplicationErrorCode.AUTHENTICATION_INVALID_CREDENTIALS), 'login')
    expect(service.error()?.category).toBe('invalid-credentials')

    service.beginAttempt()

    expect(service.error()).toBeNull()
  })

  it('maps stable codes once and consumes the MFA handoff without replay', () => {
    service.setFromHttp(failure(ApplicationErrorCode.MFA_CODE_INVALID), 'mfa')

    expect(service.consume()).toEqual(jasmine.objectContaining({
      flow: 'mfa',
      category: 'mfa-code-invalid',
      code: ApplicationErrorCode.MFA_CODE_INVALID
    }))
    expect(service.consume()).toBeNull()
  })

  it('does not retain sensitive transport details', () => {
    const error = new HttpErrorResponse({
      status: 401,
      error: { code: ApplicationErrorCode.MFA_DEVICE_MISMATCH, message: 'secret diagnostic' }
    })

    const state = service.setFromHttp(error, 'mfa')

    expect(state).toEqual(jasmine.objectContaining({
      category: 'mfa-device-mismatch',
      message: 'Il codice appartiene a un altro dispositivo.'
    }))
    expect(JSON.stringify(state)).not.toContain('secret diagnostic')
  })

  it('ignores unrelated HTTP failures and malformed legacy persisted data', () => {
    expect(service.setFromHttp(new HttpErrorResponse({ status: 500, error: { message: 'internal' } }), 'login'))
      .toBeNull()
    expect(service.error()).toBeNull()

    sessionStorage.setItem('mfaError', '{not-json')
    service.beginAttempt()
    expect(service.error()).toBeNull()
    sessionStorage.removeItem('mfaError')
  })
})
