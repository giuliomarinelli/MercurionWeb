export const CLIENT_INSTANCE_ID_HEADER = 'x-mercurion-client-instance' as const

export const CLIENT_INSTANCE_ID_PATTERN = /^[A-Za-z0-9_-]{8,128}$/

export function isValidClientInstanceId(value: unknown): value is string {
  return typeof value === 'string' && CLIENT_INSTANCE_ID_PATTERN.test(value)
}
