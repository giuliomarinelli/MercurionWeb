import {
  ApplicationErrorCode,
  type ApplicationErrorEnvelopeCode
} from '@mercurion/rest-contracts'
import { getApplicationErrorCode } from './application-error.util'

export type FormErrorControlKey = string

export interface FormErrorState<ControlKey extends FormErrorControlKey = string> {
  readonly fieldErrors: Partial<Record<ControlKey, string>>
  readonly globalError: string | null
  readonly retryAfterSeconds?: number
  readonly action?: 'retry' | 'reauthenticate'
}

export type FormErrorControlMap<ControlKey extends FormErrorControlKey> =
  Partial<Record<ApplicationErrorEnvelopeCode, Partial<Record<string, ControlKey>>>>

const SAFE_GLOBAL_ERROR = 'Si è verificato un errore. Riprova.'

const PUBLIC_MESSAGES: Partial<Record<ApplicationErrorEnvelopeCode, string>> = {
  [ApplicationErrorCode.AUTHENTICATION_INVALID_CREDENTIALS]: 'Le credenziali inserite non sono corrette.',
  [ApplicationErrorCode.AUTHENTICATION_TOO_MANY_ATTEMPTS]: 'Troppi tentativi, riprova tra qualche minuto.',
  [ApplicationErrorCode.USER_REGISTRATION_EMAIL_CONFLICT]: 'E-mail già registrata.',
  [ApplicationErrorCode.ACCOUNT_RECOVERY_CODE_INVALID]: 'Il codice è errato.',
  [ApplicationErrorCode.ACCOUNT_RECOVERY_TOO_MANY_ATTEMPTS]: 'Troppi tentativi, riprova in seguito.',
  [ApplicationErrorCode.PASSWORD_RESET_SEND_TOO_MANY_REQUESTS]: 'Troppi tentativi, riprova tra qualche minuto.',
  [ApplicationErrorCode.PASSWORD_CHANGE_CREDENTIALS_INVALID]: 'Le credenziali inserite non sono corrette.',
  [ApplicationErrorCode.PASSWORD_REUSED]: 'La nuova password non può essere uguale a una precedente.',
  RATE_LIMITED: 'Troppi tentativi, riprova tra qualche minuto.',
  BAD_USER_INPUT: 'Controlla i dati inseriti.'
}

export function adaptHttpFormError<ControlKey extends FormErrorControlKey>(
  error: unknown,
  controlMap: FormErrorControlMap<ControlKey> = {}
): FormErrorState<ControlKey> {
  const code = getApplicationErrorCode(error)
  const message = code && PUBLIC_MESSAGES[code]
    ? PUBLIC_MESSAGES[code]
    : SAFE_GLOBAL_ERROR
  const details = findDetails(error)
  const fieldErrors: Partial<Record<ControlKey, string>> = {}
  const apiFields = details?.['fieldErrors']

  if (apiFields && typeof apiFields === 'object' && !Array.isArray(apiFields)) {
    for (const [apiField, rawMessage] of Object.entries(apiFields)) {
      const control = code ? controlMap[code]?.[apiField] : undefined
      if (control && typeof rawMessage === 'string') {
        fieldErrors[control] = safeFieldMessage(rawMessage)
      }
    }
  }

  const retryAfterSeconds = typeof details?.['retryAfterSeconds'] === 'number' &&
    Number.isFinite(details['retryAfterSeconds']) && details['retryAfterSeconds'] > 0
    ? details['retryAfterSeconds']
    : undefined

  return {
    fieldErrors,
    globalError: message,
    ...(retryAfterSeconds ? { retryAfterSeconds } : {}),
    ...(code === ApplicationErrorCode.AUTHENTICATION_UNAUTHENTICATED ||
      code === ApplicationErrorCode.AUTHENTICATION_UNAUTHENTICATED_SOFT
      ? { action: 'reauthenticate' as const }
      : {})
  }
}

function findDetails(value: unknown): Readonly<Record<string, unknown>> | undefined {
  if (!value || typeof value !== 'object') return undefined
  const candidate = value as Record<string, unknown>
  if (candidate['details'] && typeof candidate['details'] === 'object' &&
      !Array.isArray(candidate['details'])) {
    return candidate['details'] as Readonly<Record<string, unknown>>
  }
  for (const nested of [candidate['error'], candidate['extensions'], candidate['applicationError']]) {
    const details = findDetails(nested)
    if (details) return details
  }
  return undefined
}

function safeFieldMessage(value: string): string {
  return value.length > 160 ? SAFE_GLOBAL_ERROR : value
}
