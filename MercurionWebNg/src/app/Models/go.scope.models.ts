export const GO_SCOPES = ['TicketDetail', ''] as const
export type GoScope = typeof GO_SCOPES[number]
export type StrictGoScope = Exclude<GoScope, ''>

export const STRICT_GO_SCOPES = GO_SCOPES.filter((s): s is StrictGoScope => s !== '')

export const isStrictGoScope = (x: string): x is StrictGoScope => (STRICT_GO_SCOPES as readonly string[]).includes(x)
