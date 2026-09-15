import { HttpErrorResponse } from '@angular/common/http'
import { ApplicationErrorCode } from '@mercurion/rest-contracts'
import { adaptHttpFormError } from './form-error.adapter'

describe('adaptHttpFormError', () => {
  const cases = [
    [ApplicationErrorCode.AUTHENTICATION_INVALID_CREDENTIALS, 'Le credenziali inserite non sono corrette.'],
    [ApplicationErrorCode.USER_REGISTRATION_EMAIL_CONFLICT, 'E-mail già registrata.'],
    [ApplicationErrorCode.ACCOUNT_RECOVERY_CODE_INVALID, 'Il codice è errato.'],
    [ApplicationErrorCode.PASSWORD_RESET_SEND_TOO_MANY_REQUESTS, 'Troppi tentativi, riprova tra qualche minuto.']
  ] as const

  it('maps every known form code to a safe deterministic global message', () => {
    for (const [code, message] of cases) {
      expect(adaptHttpFormError(new HttpErrorResponse({
        status: 400,
        error: { code, message: 'private backend detail' }
      })).globalError).toBe(message)
    }
  })

  it('maps only declared API fields to typed controls', () => {
    const state = adaptHttpFormError({
      error: {
        code: ApplicationErrorCode.USER_REGISTRATION_EMAIL_CONFLICT,
        details: { fieldErrors: { email: 'already used', password: 'should stay global' } }
      }
    }, {
      [ApplicationErrorCode.USER_REGISTRATION_EMAIL_CONFLICT]: { email: 'email' }
    })

    expect(state.fieldErrors).toEqual({ email: 'already used' })
    expect(state.globalError).toBe('E-mail già registrata.')
  })

  it('falls back safely for unknown and malformed payloads without leaking details', () => {
    for (const error of [null, {}, { error: { message: 'database password' } }]) {
      const state = adaptHttpFormError(error)
      expect(state.fieldErrors).toEqual({})
      expect(state.globalError).toBe('Si è verificato un errore. Riprova.')
      expect(JSON.stringify(state)).not.toContain('database password')
    }
  })

  it('exposes retry metadata only when it is numeric and positive', () => {
    expect(adaptHttpFormError({
      code: 'RATE_LIMITED',
      details: { retryAfterSeconds: 30 }
    }).retryAfterSeconds).toBe(30)
    expect(adaptHttpFormError({
      code: 'RATE_LIMITED',
      details: { retryAfterSeconds: '30' }
    }).retryAfterSeconds).toBeUndefined()
  })
})
