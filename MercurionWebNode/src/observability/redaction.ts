const SENSITIVE_KEY = /password|passcode|token|secret|authorization|cookie|otp|mfa|oauth|client.?secret|api.?key/i
const MAX_DEPTH = 8

export const REDACTED_VALUE = '[REDACTED]'

export function redactSensitive<T>(value: T, depth = 0): T {
  if (depth > MAX_DEPTH || value === null || typeof value !== 'object') {
    return value
  }
  if (Array.isArray(value)) {
    return value.map(item => redactSensitive(item, depth + 1)) as T
  }
  const result: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value)) {
    result[key] = SENSITIVE_KEY.test(key)
      ? REDACTED_VALUE
      : redactSensitive(item, depth + 1)
  }
  return result as T
}
