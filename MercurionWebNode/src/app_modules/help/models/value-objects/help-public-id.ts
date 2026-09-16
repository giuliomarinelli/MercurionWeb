import {
  ApplicationErrorCode,
  applicationError,
} from 'src/exception-handling/application-error'

declare const helpPublicIdBrand: unique symbol

export type HelpPublicId = string & {
  readonly [helpPublicIdBrand]: 'HelpPublicId'
}

export type HelpPublicIdScope = 'Ticket' | 'Message'

/**
 * Help identity columns are PostgreSQL bigint values materialized by TypeORM
 * as decimal strings. Tickets use MTCK- plus a minimum width of nine digits;
 * messages use MTCKM- with the same width. The persisted value remains raw and
 * this pure formatter is the only presentation projection.
 */
export function formatHelpPublicId(
  rawIdentity: unknown,
  scope: HelpPublicIdScope,
): HelpPublicId {
  if (typeof rawIdentity !== 'string' || !/^\d+$/.test(rawIdentity)) {
    throw applicationError(
      ApplicationErrorCode.HELP_PUBLIC_ID_INVALID,
      `Invalid persisted Help ${scope.toLowerCase()} public ID`,
      { scope },
    )
  }

  const prefix = scope === 'Ticket' ? 'MTCK-' : 'MTCKM-'
  return `${prefix}${rawIdentity.padStart(9, '0')}` as HelpPublicId
}
