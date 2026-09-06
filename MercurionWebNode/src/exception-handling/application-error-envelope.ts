import { randomBytes } from 'node:crypto'
import {
  getApplicationErrorDefinition,
  isApplicationErrorCode,
  type ApplicationErrorEnvelope,
  type ApplicationErrorEnvelopeCode
} from '@mercurion/rest-contracts'
import { HttpStatusMap } from './http-status-map'

export interface ApplicationErrorSerializationInput {
  readonly status?: number
  readonly code?: ApplicationErrorEnvelopeCode
  readonly message?: string
  readonly details?: Readonly<Record<string, unknown>>
  readonly correlationId: string
  readonly isProduction: boolean
}

export function createCorrelationId(seed?: unknown): string {
  const normalizedSeed = normalizeCorrelationSeed(seed)
  const suffix = randomBytes(16).toString('hex')
  return normalizedSeed ? `${normalizedSeed}-${suffix}` : suffix
}

export function createApplicationErrorEnvelope(
  input: ApplicationErrorSerializationInput
): ApplicationErrorEnvelope {
  const status = normalizeStatus(input.status)
  const code = input.code ?? defaultCodeForStatus(status)
  const catalogDefinition = isApplicationErrorCode(code)
    ? getApplicationErrorDefinition(code)
    : undefined
  const isHidden = input.isProduction && (
    catalogDefinition ? !catalogDefinition.exposeInProduction : status >= 500
  )
  const message = isHidden
    ? 'Internal Server Error'
    : catalogDefinition?.publicMessage ?? input.message ?? HttpStatusMap.getDescriptionFromHttpStatusCode(status)
  const details = isHidden ? undefined : input.details

  return {
    code,
    status,
    message,
    correlationId: input.correlationId,
    ...(details ? { details } : {})
  }
}

export function createRestErrorResponse(
  input: ApplicationErrorSerializationInput & {
    readonly error?: string
    readonly path: string
  }
) {
  const envelope = createApplicationErrorEnvelope(input)
  return {
    ...envelope,
    statusCode: envelope.status,
    error: input.error ?? HttpStatusMap.getDescriptionFromHttpStatusCode(envelope.status),
    timestamp: new Date().toISOString(),
    requestId: envelope.correlationId,
    path: input.path
  }
}

export function createGraphQLErrorExtensions(
  envelope: ApplicationErrorEnvelope
) {
  return {
    code: envelope.code,
    status: envelope.status,
    correlationId: envelope.correlationId,
    ...(envelope.details ? { details: envelope.details } : {}),
    applicationError: envelope
  }
}

export function createSocketApplicationError(
  input: ApplicationErrorSerializationInput
) {
  const envelope = createApplicationErrorEnvelope(input)
  return {
    ...envelope,
    detail: envelope.message
  }
}

function defaultCodeForStatus(status: number): ApplicationErrorEnvelopeCode {
  if (status === 400 || status === 422) {
    return 'BAD_USER_INPUT'
  }
  if (status === 401) {
    return 'UNAUTHORIZED'
  }
  if (status === 403) {
    return 'FORBIDDEN'
  }
  if (status === 404) {
    return 'NOT_FOUND'
  }
  if (status === 429) {
    return 'RATE_LIMITED'
  }
  return 'INTERNAL_SERVER_ERROR'
}

function normalizeStatus(status?: number): number {
  return status && Number.isInteger(status) && status >= 100 && status <= 599
    ? status
    : 500
}

function normalizeCorrelationSeed(seed: unknown): string | undefined {
  const raw: unknown = Array.isArray(seed) ? seed[0] : seed
  if (typeof raw !== 'string' && typeof raw !== 'number') {
    return undefined
  }
  const normalized = raw.toString().replace(/[^a-zA-Z0-9_.:-]/g, '').slice(0, 80)
  return normalized.length > 0 ? normalized : undefined
}
