declare const utcInstantBrand: unique symbol

/**
 * A public UTC instant normalized to exactly millisecond precision.
 *
 * Wire values always use `YYYY-MM-DDTHH:mm:ss.sssZ`. Epoch milliseconds remain
 * an internal representation and are converted only at transport boundaries.
 */
export type UtcInstant = string & { readonly [utcInstantBrand]: true }

const UTC_INSTANT_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

function assertValidDate(date: Date): Date {
  if (Number.isNaN(date.getTime())) {
    throw new RangeError('Invalid UTC instant')
  }
  return date
}

export function utcInstantFromDate(date: Date): UtcInstant {
  return assertValidDate(date).toISOString() as UtcInstant
}

export function utcInstantFromEpochMs(epochMs: number): UtcInstant {
  if (!Number.isSafeInteger(epochMs)) {
    throw new RangeError('UTC instant epoch milliseconds must be a safe integer')
  }
  return utcInstantFromDate(new Date(epochMs))
}

export function epochMsFromUtcInstant(value: UtcInstant): number {
  if (!isUtcInstant(value)) {
    throw new RangeError('UTC instant must include an explicit Z timezone and milliseconds')
  }
  return assertValidDate(new Date(value)).getTime()
}

export function parseUtcInstant(value: unknown): UtcInstant {
  if (typeof value !== 'string' || !UTC_INSTANT_PATTERN.test(value)) {
    throw new RangeError('UTC instant must include an explicit Z timezone and milliseconds')
  }
  const instant = value as UtcInstant
  if (!isUtcInstant(instant)) {
    throw new RangeError('Invalid UTC instant')
  }
  return instant
}

export function isUtcInstant(value: unknown): value is UtcInstant {
  if (typeof value !== 'string' || !UTC_INSTANT_PATTERN.test(value)) {
    return false
  }
  const parsed = Date.parse(value)
  return !Number.isNaN(parsed) && new Date(parsed).toISOString() === value
}
