import { CLIENT_INSTANCE_ID_HEADER, isValidClientInstanceId } from '@mercurion/rest-contracts'
import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  CORRELATION_ID_HEADER,
  createCorrelationContext,
  runWithCorrelationContext
} from './correlation-context'

type MiddlewareRequest = IncomingMessage & {
  correlationContext?: ReturnType<typeof createCorrelationContext>
}

export function correlationMiddleware(
  request: MiddlewareRequest,
  response: ServerResponse,
  next: () => void
): void {
  const rawClientInstanceId = request.headers[CLIENT_INSTANCE_ID_HEADER]
  const clientInstanceId = isValidClientInstanceId(rawClientInstanceId)
    ? rawClientInstanceId
    : undefined
  const context = createCorrelationContext(
    'http',
    request.headers[CORRELATION_ID_HEADER],
    undefined,
    clientInstanceId
  )
  request.correlationContext = context
  response.setHeader(CORRELATION_ID_HEADER, context.correlationId)
  runWithCorrelationContext(context, next)
}
