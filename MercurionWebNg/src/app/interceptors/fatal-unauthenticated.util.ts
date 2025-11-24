export function isFatalUnauthenticatedBody(body: unknown): boolean {
  if (!body) {
    return false
  }

  if (typeof body === 'string') {
    return body === 'Fatal: unauthenticated'
  }

  const anyBody = body as any

  if (anyBody.message === 'Fatal: unauthenticated') {
    return true
  }

  if (Array.isArray(anyBody.errors)) {
    return anyBody.errors.some((error: any) => error?.message === 'Fatal: unauthenticated')
  }

  return false
}
