import { Injectable, signal } from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import {
  ApplicationErrorCode,
  getApplicationErrorCode
} from '../utils/application-error.util'
import type { ApplicationErrorEnvelopeCode } from '@mercurion/rest-contracts'

export type AuthErrorFlow = 'login' | 'mfa' | 'recovery'
export type AuthErrorCategory =
  | 'invalid-credentials'
  | 'rate-limited'
  | 'mfa-code-invalid'
  | 'mfa-device-mismatch'
  | 'mfa-expired'
  | 'unknown'

export interface EphemeralAuthError {
  readonly flow: AuthErrorFlow
  readonly category: AuthErrorCategory
  readonly code?: ApplicationErrorEnvelopeCode
  readonly message?: string
}

@Injectable({ providedIn: 'root' })
export class AuthErrorService {
  private readonly errorSignal = signal<EphemeralAuthError | null>(null)
  readonly error = this.errorSignal.asReadonly()

  beginAttempt(): void {
    this.clear()
  }

  clear(): void {
    this.errorSignal.set(null)
  }

  setFromHttp(error: unknown, flow: AuthErrorFlow): EphemeralAuthError | null {
    const response = error instanceof HttpErrorResponse ? error : null
    const code = getApplicationErrorCode(response?.error)
    const category = categoryFor(code, response?.status)
    if (!category) return null

    const next: EphemeralAuthError = {
      flow,
      category,
      ...(code ? { code } : {}),
      ...(category === 'unknown' ? {} : { message: publicMessage(category) })
    }
    this.errorSignal.set(next)
    return next
  }

  consume(): EphemeralAuthError | null {
    const value = this.error()
    this.clear()
    return value
  }
}

function categoryFor(
  code: ApplicationErrorEnvelopeCode | undefined,
  status: number | undefined
): AuthErrorCategory | null {
  switch (code) {
    case ApplicationErrorCode.AUTHENTICATION_INVALID_CREDENTIALS:
      return 'invalid-credentials'
    case ApplicationErrorCode.AUTHENTICATION_TOO_MANY_ATTEMPTS:
    case ApplicationErrorCode.MFA_TOO_MANY_ATTEMPTS:
    case ApplicationErrorCode.MFA_SEND_TOO_MANY_REQUESTS:
      return 'rate-limited'
    case ApplicationErrorCode.MFA_CODE_INVALID:
      return 'mfa-code-invalid'
    case ApplicationErrorCode.MFA_DEVICE_MISMATCH:
      return 'mfa-device-mismatch'
    case ApplicationErrorCode.MFA_PREAUTHORIZATION_EXPIRED:
    case ApplicationErrorCode.MFA_PREAUTHORIZATION_INVALID:
      return 'mfa-expired'
    default:
      // Status-only fallbacks are limited to the authentication forms.  An
      // arbitrary HTTP error must never become auth UI state.
      if (status === 429) return 'rate-limited'
      if (status === 401) return 'invalid-credentials'
      return null
  }
}

function publicMessage(category: AuthErrorCategory): string {
  switch (category) {
    case 'invalid-credentials': return 'Le credenziali inserite non sono corrette.'
    case 'rate-limited': return 'Troppi tentativi, riprova tra qualche minuto.'
    case 'mfa-code-invalid': return 'Il codice inserito non è corretto.'
    case 'mfa-device-mismatch': return 'Il codice appartiene a un altro dispositivo.'
    case 'mfa-expired': return 'La verifica è scaduta. Devi ritentare il login.'
    default: return 'Si è verificato un errore.'
  }
}
