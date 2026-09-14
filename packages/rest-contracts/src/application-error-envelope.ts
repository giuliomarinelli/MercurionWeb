import type { ApplicationErrorCode } from './application-errors'
import { isApplicationErrorCode } from './application-errors'

export type TransportApplicationErrorCode =
  | 'BAD_USER_INPUT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'GRAPHQL_VALIDATION_FAILED'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'INTERNAL_SERVER_ERROR'

export type ApplicationErrorEnvelopeCode =
  | ApplicationErrorCode
  | TransportApplicationErrorCode

export interface ApplicationErrorEnvelope {
  readonly code: ApplicationErrorEnvelopeCode
  readonly status: number
  readonly message: string
  readonly correlationId: string
  readonly details?: Readonly<Record<string, unknown>>
}

const transportApplicationErrorCodes = new Set<string>([
  'BAD_USER_INPUT',
  'UNAUTHORIZED',
  'GRAPHQL_VALIDATION_FAILED',
  'FORBIDDEN',
  'NOT_FOUND',
  'RATE_LIMITED',
  'INTERNAL_SERVER_ERROR'
])

export function isApplicationErrorEnvelopeCode(
  value: unknown
): value is ApplicationErrorEnvelopeCode {
  return isApplicationErrorCode(value) || (
    typeof value === 'string' && transportApplicationErrorCodes.has(value)
  )
}

export function isApplicationErrorEnvelope(
  value: unknown
): value is ApplicationErrorEnvelope {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<ApplicationErrorEnvelope>
  const details = candidate.details

  return (
    isApplicationErrorEnvelopeCode(candidate.code) &&
    typeof candidate.status === 'number' &&
    Number.isInteger(candidate.status) &&
    candidate.status >= 100 &&
    candidate.status <= 599 &&
    typeof candidate.message === 'string' &&
    typeof candidate.correlationId === 'string' &&
    candidate.correlationId.length > 0 &&
    (details === undefined ||
      (!!details && typeof details === 'object' && !Array.isArray(details)))
  )
}
