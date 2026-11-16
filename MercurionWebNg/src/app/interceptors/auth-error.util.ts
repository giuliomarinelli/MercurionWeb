import {
  HttpErrorResponse,
  HttpEvent,
  HttpResponse
} from '@angular/common/http'
import {
  ApplicationErrorCode,
  hasApplicationErrorCode
} from '../utils/application-error.util'
import { SessionInvalidationCause } from '@mercurion/rest-contracts'

export type AuthResponseEvent =
  | { kind: 'token-rotated'; token: string }
  | { kind: 'session-invalidated'; cause: SessionInvalidationCause }
  | { kind: 'forbidden' }
  | { kind: 'unrelated' }

/**
 * The sole transport-to-auth classification boundary.  Interceptors may
 * consume the result, but must not independently infer auth semantics from
 * status codes or GraphQL envelopes.
 */
export function classifyAuthResponse(
  event: HttpEvent<unknown> | HttpErrorResponse
): AuthResponseEvent {
  if (event instanceof HttpResponse) {
    const rotatedToken = event.headers.get('X-New-Access-Token')
    if (rotatedToken) {
      return { kind: 'token-rotated', token: rotatedToken }
    }

    if (isFatalUnauthenticated(event.body)) {
      return {
        kind: 'session-invalidated',
        cause: SessionInvalidationCause.InvalidSession
      }
    }

    return { kind: 'unrelated' }
  }

  if (!(event instanceof HttpErrorResponse)) {
    return { kind: 'unrelated' }
  }

  if (event.status === 403 &&
      hasApplicationErrorCode(event.error, ApplicationErrorCode.PERMISSION_DENIED)) {
    return { kind: 'forbidden' }
  }

  if (event.status === 401 && isFatalUnauthenticated(event.error)) {
    return {
      kind: 'session-invalidated',
      cause: SessionInvalidationCause.InvalidSession
    }
  }

  return { kind: 'unrelated' }
}

function isFatalUnauthenticated(body: unknown): boolean {
  return hasApplicationErrorCode(
    body,
    ApplicationErrorCode.AUTHENTICATION_UNAUTHENTICATED_FATAL
  )
}
