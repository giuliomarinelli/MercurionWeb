import { ApplicationErrorCode } from '@mercurion/rest-contracts'
import {
  createApplicationErrorEnvelope,
  createGraphQLErrorExtensions,
  createRestErrorResponse,
  createSocketApplicationError
} from './application-error-envelope'

describe('application error envelope serialization', () => {
  const correlationId = 'test-correlation-id'

  it.each([
    {
      label: 'auth',
      status: 401,
      code: ApplicationErrorCode.AUTHENTICATION_INVALID_CREDENTIALS,
      message: 'AuthenticationInvalidCredentials'
    },
    {
      label: 'forbidden',
      status: 403,
      code: ApplicationErrorCode.PERMISSION_DENIED,
      message: 'Forbidden::missing permissions'
    },
    {
      label: 'validation',
      status: 400,
      code: 'BAD_USER_INPUT',
      message: 'Invalid request body',
      details: { field: 'email' }
    },
    {
      label: 'not-found',
      status: 404,
      code: ApplicationErrorCode.USER_NOT_FOUND,
      message: 'NoSuchUser'
    },
    {
      label: 'rate-limit',
      status: 429,
      code: ApplicationErrorCode.PASSWORD_RESET_SEND_TOO_MANY_REQUESTS,
      message: 'Rate limit exceeded.'
    }
  ] as const)('serializes $label consistently across transports', (input) => {
    const envelope = createApplicationErrorEnvelope({
      ...input,
      correlationId,
      isProduction: false
    })

    const rest = createRestErrorResponse({
      ...input,
      correlationId,
      isProduction: false,
      path: '/test'
    })
    const graphqlExtensions = createGraphQLErrorExtensions(envelope)
    const socket = createSocketApplicationError({
      ...input,
      correlationId,
      isProduction: false
    })

    expect(rest).toMatchObject({
      code: envelope.code,
      status: envelope.status,
      statusCode: envelope.status,
      message: envelope.message,
      correlationId,
      requestId: correlationId,
      path: '/test'
    })
    expect(graphqlExtensions).toMatchObject({
      code: envelope.code,
      status: envelope.status,
      correlationId,
      applicationError: envelope
    })
    expect(socket).toMatchObject({
      code: envelope.code,
      status: envelope.status,
      message: envelope.message,
      detail: envelope.message,
      correlationId
    })
  })

  it('redacts internal messages and details in production envelopes', () => {
    const envelope = createApplicationErrorEnvelope({
      status: 500,
      code: ApplicationErrorCode.PASSWORD_ENCODING_FAILED,
      message: 'PasswordEncodingException',
      details: { stack: 'private' },
      correlationId,
      isProduction: true
    })

    expect(envelope).toEqual({
      code: ApplicationErrorCode.PASSWORD_ENCODING_FAILED,
      status: 500,
      message: 'Internal Server Error',
      correlationId
    })
  })
})
