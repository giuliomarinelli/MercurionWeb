import { UUID } from 'crypto'
import { Scope } from 'src/app_modules/user/models/enums/scope.enum'
import { ApplicationErrorCode, applicationError } from 'src/exception-handling/application-error'

export type HelpOperation =
  | 'create'
  | 'list'
  | 'detail'
  | 'messages'
  | 'add-message'
  | 'close'
  | 'reopen'

export type HelpOwnerActor = Readonly<{
  kind: 'owner'
  userId: UUID
  canViewUsers: boolean
}>

export type HelpSupportActor = Readonly<{
  kind: 'support'
  userId: UUID
  canHandleTickets: true
  canViewUsers: boolean
}>

export type HelpActor = HelpOwnerActor | HelpSupportActor

export function ownerActor(userId: UUID, scopes: readonly Scope[] = []): HelpOwnerActor {
  return { kind: 'owner', userId, canViewUsers: scopes.includes(Scope.ViewUsers) }
}

export function supportActor(userId: UUID, scopes: readonly Scope[] = []): HelpSupportActor {
  if (!scopes.includes(Scope.HandleTickets)) {
    throw applicationError(ApplicationErrorCode.TICKET_HANDLING_FORBIDDEN)
  }
  return {
    kind: 'support',
    userId,
    canHandleTickets: true,
    canViewUsers: scopes.includes(Scope.ViewUsers),
  }
}

export function authorizeHelpOperation(actor: HelpActor, operation: HelpOperation): void {
  if (actor.kind === 'support' && operation !== 'create') return
  if (operation === 'create' && actor.kind === 'owner') return
  if (operation === 'list' || operation === 'detail' || operation === 'messages' ||
      operation === 'add-message' || operation === 'close') return
  throw applicationError(ApplicationErrorCode.TICKET_HANDLING_FORBIDDEN)
}

export function isSupportActor(actor: HelpActor): actor is HelpSupportActor {
  return actor.kind === 'support'
}

export function ownsTicket(actor: HelpActor, ticketUserId: UUID): boolean {
  return actor.kind === 'support' || actor.userId === ticketUserId
}

export function ticketOwnerPredicate(actor: HelpActor): Readonly<Record<string, UUID>> {
  return actor.kind === 'support' ? {} : { userId: actor.userId }
}
