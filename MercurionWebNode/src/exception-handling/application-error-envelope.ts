import { randomBytes } from 'node:crypto'
import {
  getApplicationErrorDefinition,
  isApplicationErrorCode,
  type ApplicationErrorEnvelope,
  type ApplicationErrorEnvelopeCode,
  type ApplicationErrorCategory,
  isApplicationErrorEnvelopeCode
} from '@mercurion/rest-contracts'
import { HttpException } from '@nestjs/common'
import { categoryForStatus, getApplicationError } from './application-error'
import { httpStatusDescription } from './http-status-description'
import { utcNow } from 'src/utils/temporal/temporal'

export interface CanonicalApplicationError extends ApplicationErrorEnvelope {
  readonly diagnosticCause?: unknown
}

export interface ApplicationErrorSerializationInput {
  readonly status?: number
  readonly code?: ApplicationErrorEnvelopeCode
  readonly category?: ApplicationErrorCategory
  readonly message?: string
  readonly details?: Readonly<Record<string, unknown>>
  readonly correlationId: string
  readonly isProduction: boolean
}

export interface ApplicationErrorPresentationContext {
  readonly correlationId: string
  readonly isProduction: boolean
  readonly statusHint?: number
}

export interface GraphQLErrorLike {
  readonly message: string
  readonly path?: readonly (string | number)[]
  readonly extensions?: Readonly<Record<string, unknown>>
}

/**
 * The only place where an arbitrary thrown value becomes application error
 * semantics. Transport adapters must serialize this record; they must not
 * repeat these classification or redaction decisions.
 */
export function presentApplicationError(
  error: unknown,
  context: ApplicationErrorPresentationContext
): CanonicalApplicationError {
  const applicationError = getApplicationError(error)
  if (applicationError) {
    const definition = getApplicationErrorDefinition(applicationError.code)
    return createCanonicalApplicationError({
      status: definition.httpStatus,
      code: applicationError.code,
      message: applicationError.message,
      details: applicationError.details,
      category: categoryForStatus(definition.httpStatus),
      correlationId: context.correlationId,
      isProduction: context.isProduction,
      diagnosticCause: error
    })
  }

  const httpException = error instanceof HttpException ? error : undefined
  const status = httpException?.getStatus() ?? normalizeStatus(context.statusHint)
  const response = httpException?.getResponse()
  const errorRecord = isRecord(error) ? error : undefined
  const responseRecord = isRecord(response) ? response : errorRecord
  const responseMessage = Array.isArray(responseRecord?.message)
    ? responseRecord.message.filter((value): value is string => typeof value === 'string').join(', ')
    : typeof responseRecord?.message === 'string'
      ? responseRecord.message
      : typeof response === 'string' ? response : undefined
  const responseCode = isApplicationErrorCode(responseRecord?.code)
    ? responseRecord.code
    : isApplicationErrorCode(errorRecord?.code)
      ? errorRecord.code
    : defaultCodeForStatus(status)
  const details = isRecord(responseRecord?.details)
    ? responseRecord.details
    : Array.isArray(responseRecord?.message)
      ? { fields: responseRecord.message }
      : undefined
  const isGraphQLValidation = responseCode === 'GRAPHQL_VALIDATION_FAILED'
  const safeMessage = responseMessage ?? (
    (typeof errorRecord?.message === 'string' ? errorRecord.message : undefined) ?? (
    isGraphQLValidation ? 'GraphQL validation failed' : httpStatusDescription(status)
    )
  )

  return createCanonicalApplicationError({
    status,
    code: responseCode,
    category: categoryForStatus(status),
    message: safeMessage,
    details,
    correlationId: context.correlationId,
    isProduction: context.isProduction,
    diagnosticCause: error
  })
}

export function presentGraphQLError(
  error: GraphQLErrorLike,
  context: ApplicationErrorPresentationContext
): CanonicalApplicationError {
  const extensionCode = error.extensions?.code
  const code = isApplicationErrorCode(extensionCode) ||
    isApplicationErrorEnvelopeCode(extensionCode)
    ? extensionCode
    : error.path ? 'INTERNAL_SERVER_ERROR' : 'GRAPHQL_VALIDATION_FAILED'
  return presentApplicationError({
    code,
    message: error.message,
    details: error.extensions?.details
  }, {
    ...context,
    statusHint: statusHintForCode(code)
  })
}

export function graphQLStatusForPresentation(
  presentation: CanonicalApplicationError
): number {
  return isApplicationErrorCode(presentation.code)
    ? getApplicationErrorDefinition(presentation.code).graphQlStatus ?? presentation.status
    : presentation.status
}

export function createCorrelationId(seed?: unknown): string {
  const normalizedSeed = normalizeCorrelationSeed(seed)
  const suffix = randomBytes(16).toString('hex')
  return normalizedSeed ? `${normalizedSeed}-${suffix}` : suffix
}

export function createApplicationErrorEnvelope(
  input: ApplicationErrorSerializationInput | CanonicalApplicationError
): ApplicationErrorEnvelope {
  const envelope = 'isProduction' in input
    ? createCanonicalApplicationError(input)
    : input
  return {
    code: envelope.code,
    category: envelope.category,
    status: envelope.status,
    message: envelope.message,
    correlationId: envelope.correlationId,
    ...(envelope.details ? { details: envelope.details } : {})
  }
}

function createCanonicalApplicationError(
  input: ApplicationErrorSerializationInput & { readonly diagnosticCause?: unknown }
): CanonicalApplicationError {
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
    : catalogDefinition?.publicMessage ?? input.message ?? httpStatusDescription(status)
  const details = isHidden ? undefined : input.details

  return {
    code,
    category: input.category ?? categoryForStatus(status),
    status,
    message,
    correlationId: input.correlationId,
    ...(details ? { details } : {}),
    ...(input.diagnosticCause !== undefined
      ? { diagnosticCause: input.diagnosticCause }
      : {})
  }
}

export function createRestErrorResponse(
  input: (ApplicationErrorSerializationInput | CanonicalApplicationError) & {
    readonly error?: string
    readonly path: string
  }
) {
  const envelope = createApplicationErrorEnvelope(input)
  return {
    ...envelope,
    statusCode: envelope.status,
    error: input.error ?? httpStatusDescription(envelope.status),
    timestamp: utcNow(),
    requestId: envelope.correlationId,
    path: input.path
  }
}

export function createGraphQLErrorExtensions(
  envelope: ApplicationErrorEnvelope
) {
  return {
    code: envelope.code,
    category: envelope.category,
    status: envelope.status,
    correlationId: envelope.correlationId,
    ...(envelope.details ? { details: envelope.details } : {}),
    applicationError: envelope
  }
}

export function createSocketApplicationError(
  input: ApplicationErrorSerializationInput | CanonicalApplicationError
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

function statusHintForCode(code: ApplicationErrorEnvelopeCode): number {
  if (
    code === 'BAD_USER_INPUT' ||
    code === 'GRAPHQL_VALIDATION_FAILED' ||
    code === 'CONTRACT_VERSION_INVALID' ||
    code === 'CONTRACT_VERSION_UNSUPPORTED'
  ) {
    return 400
  }
  if (isApplicationErrorCode(code)) {
    return getApplicationErrorDefinition(code).httpStatus
  }
  return 500
}

function normalizeStatus(status?: number): number {
  return status && Number.isInteger(status) && status >= 100 && status <= 599
    ? status
    : 500
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeCorrelationSeed(seed: unknown): string | undefined {
  const raw: unknown = Array.isArray(seed) ? seed[0] : seed
  if (typeof raw !== 'string' && typeof raw !== 'number') {
    return undefined
  }
  const normalized = raw.toString().replace(/[^a-zA-Z0-9_.:-]/g, '').slice(0, 80)
  return normalized.length > 0 ? normalized : undefined
}
