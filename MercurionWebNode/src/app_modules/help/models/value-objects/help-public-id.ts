import {
  ApplicationErrorCode,
  applicationError,
} from 'src/exception-handling/application-error'

declare const ticketPublicIdBrand: unique symbol
declare const messagePublicIdBrand: unique symbol

export type TicketPublicId = string & {
  readonly [ticketPublicIdBrand]: 'TicketPublicId'
}

export type MessagePublicId = string & {
  readonly [messagePublicIdBrand]: 'MessagePublicId'
}

export type HelpPublicId = TicketPublicId | MessagePublicId

export type HelpPublicIdScope = 'Ticket' | 'Message'

/**
 * Help identity columns are PostgreSQL bigint values materialized by TypeORM
 * as decimal strings. Tickets use MTCK- plus a minimum width of nine digits;
 * messages use MTCKM- with the same width. The persisted value remains the
 * immutable source and this codec is the only presentation projection.
 */
type PublicIdCodec<TPublicId extends HelpPublicId> = {
  readonly format: (rawIdentity: unknown) => TPublicId
  readonly parse: (value: unknown) => TPublicId
  readonly source: (value: TPublicId) => string
}

function invalid(scope: HelpPublicIdScope, value: unknown): never {
  const kind = typeof value === 'string' ? 'value' : 'source'
  throw applicationError(
    ApplicationErrorCode.HELP_PUBLIC_ID_INVALID,
    `Invalid Help ${scope.toLowerCase()} public ID ${kind}`,
    { scope },
  )
}

function parseSource(rawIdentity: unknown, scope: HelpPublicIdScope): string {
  if (
    typeof rawIdentity !== 'string' ||
    !/^[1-9]\d*$/.test(rawIdentity)
  ) {
    return invalid(scope, rawIdentity)
  }
  return rawIdentity
}

function formatSource(
  rawIdentity: unknown,
  scope: HelpPublicIdScope,
  prefix: string,
): HelpPublicId {
  const source = parseSource(rawIdentity, scope)
  return `${prefix}${source.padStart(9, '0')}` as HelpPublicId
}

function parseCanonical<TPublicId extends HelpPublicId>(
  value: unknown,
  scope: HelpPublicIdScope,
  prefix: string,
): TPublicId {
  if (typeof value !== 'string' || !value.startsWith(prefix)) {
    return invalid(scope, value)
  }

  const digits = value.slice(prefix.length)
  if (!/^\d{9,}$/.test(digits)) {
    return invalid(scope, value)
  }

  const source = parseSource(String(BigInt(digits)), scope)
  if (formatSource(source, scope, prefix) !== value) {
    return invalid(scope, value)
  }

  return value as TPublicId
}

function createCodec<TPublicId extends HelpPublicId>(
  scope: HelpPublicIdScope,
  prefix: string,
): PublicIdCodec<TPublicId> {
  return {
    format: (rawIdentity) => formatSource(rawIdentity, scope, prefix) as TPublicId,
    parse: (value) => parseCanonical<TPublicId>(value, scope, prefix),
    source: (value) => {
      const parsed = parseCanonical<TPublicId>(value, scope, prefix)
      return String(BigInt(parsed.slice(prefix.length)))
    },
  }
}

export const ticketPublicIdCodec = createCodec<TicketPublicId>('Ticket', 'MTCK-')
export const messagePublicIdCodec = createCodec<MessagePublicId>('Message', 'MTCKM-')

export function formatHelpPublicId(
  rawIdentity: unknown,
  scope: 'Ticket',
): TicketPublicId
export function formatHelpPublicId(
  rawIdentity: unknown,
  scope: 'Message',
): MessagePublicId
export function formatHelpPublicId(
  rawIdentity: unknown,
  scope: HelpPublicIdScope,
): HelpPublicId
export function formatHelpPublicId(
  rawIdentity: unknown,
  scope: HelpPublicIdScope,
): HelpPublicId {
  return scope === 'Ticket'
    ? ticketPublicIdCodec.format(rawIdentity)
    : messagePublicIdCodec.format(rawIdentity)
}

export function parseTicketPublicId(value: unknown): TicketPublicId {
  return ticketPublicIdCodec.parse(value)
}

export function parseMessagePublicId(value: unknown): MessagePublicId {
  return messagePublicIdCodec.parse(value)
}

export function parseHelpPublicId(value: unknown): HelpPublicId {
  if (typeof value !== 'string') {
    return invalid('Ticket', value)
  }
  if (value.startsWith('MTCK-')) return parseTicketPublicId(value)
  if (value.startsWith('MTCKM-')) return parseMessagePublicId(value)
  return invalid('Ticket', value)
}

export function helpPublicIdSource(value: TicketPublicId): string
export function helpPublicIdSource(value: MessagePublicId): string
export function helpPublicIdSource(value: HelpPublicId): string {
  if (value.startsWith('MTCKM-')) return messagePublicIdCodec.source(value as MessagePublicId)
  return ticketPublicIdCodec.source(value as TicketPublicId)
}

export function isTicketPublicId(value: unknown): value is TicketPublicId {
  try {
    parseTicketPublicId(value)
    return true
  } catch {
    return false
  }
}

export function isMessagePublicId(value: unknown): value is MessagePublicId {
  try {
    parseMessagePublicId(value)
    return true
  } catch {
    return false
  }
}

/**
 * Kept as a narrow compatibility helper for callers that only need a
 * validated family-specific public value.
 */
export function assertHelpPublicId(
  value: unknown,
  scope: 'Ticket',
): asserts value is TicketPublicId
export function assertHelpPublicId(
  value: unknown,
  scope: 'Message',
): asserts value is MessagePublicId
export function assertHelpPublicId(
  value: unknown,
  scope: HelpPublicIdScope,
): void {
  if (scope === 'Ticket') parseTicketPublicId(value)
  else parseMessagePublicId(value)
}
