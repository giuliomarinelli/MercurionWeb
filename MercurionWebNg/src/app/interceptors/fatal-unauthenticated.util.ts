import { ApplicationErrorCode, hasApplicationErrorCode } from '../utils/application-error.util'

export function isFatalUnauthenticatedBody(body: unknown): boolean {
  return hasApplicationErrorCode(
    body,
    ApplicationErrorCode.AUTHENTICATION_UNAUTHENTICATED_FATAL
  )
}
