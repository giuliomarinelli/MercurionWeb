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
  const context = createCorrelationContext(
    'http',
    request.headers[CORRELATION_ID_HEADER]
  )
  request.correlationContext = context
  response.setHeader(CORRELATION_ID_HEADER, context.correlationId)
  runWithCorrelationContext(context, next)
}
