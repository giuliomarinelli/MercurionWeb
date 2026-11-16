import { UUID } from 'crypto'
import { JsonValue } from 'src/models/json.types'
import { Ticket } from '../entities/ticket.entity'
import { TicketMessage } from '../entities/ticket-message.entity'
import { formatHelpPublicId } from '../value-objects/help-public-id'
import { TicketMessageResponse, TicketResponse } from './help-response.dto'

type TicketSource = Readonly<Pick<
  Ticket,
  'id' | 'publicId' | 'userId' | 'subject' | 'status' | 'lastMessageAt' |
  'createdAt' | 'updatedAt'
>> & {
  readonly messages?: readonly TicketMessageSource[]
}

type TicketMessageSource = Readonly<Pick<
  TicketMessage,
  'id' | 'publicId' | 'ticketId' | 'authorType' | 'authorId' | 'userId' |
  'contentDelta' | 'contentHtml' | 'createdAt'
>>

export type HelpVisibility = {
  readonly canViewUsers: boolean
  readonly userFullName?: string
  readonly authorFullNames?: ReadonlyMap<string, string>
}

export function presentTicket(
  source: TicketSource,
  visibility: HelpVisibility,
): TicketResponse {
  const response: TicketResponse = {
    id: source.id,
    publicId: formatHelpPublicId(source.publicId, 'Ticket'),
    userId: visibility.canViewUsers ? source.userId : undefined,
    userFullName: visibility.canViewUsers ? visibility.userFullName : undefined,
    subject: source.subject,
    status: source.status,
    lastMessageAt: source.lastMessageAt,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
    messages: source.messages?.map((message) => presentMessage(message, visibility)),
  }
  return response
}

export function presentMessage(
  source: TicketMessageSource,
  visibility: HelpVisibility,
): TicketMessageResponse {
  const names = visibility.authorFullNames
  return {
    id: source.id,
    publicId: formatHelpPublicId(source.publicId, 'Message'),
    ticketId: source.ticketId,
    authorType: source.authorType,
    authorId: visibility.canViewUsers ? source.authorId : undefined,
    authorFullName: visibility.canViewUsers && source.authorId
      ? names?.get(String(source.authorId))
      : undefined,
    userId: visibility.canViewUsers ? source.userId : undefined,
    userFullName: visibility.canViewUsers && source.userId
      ? names?.get(String(source.userId))
      : undefined,
    contentDelta: JSON.stringify(source.contentDelta as JsonValue),
    contentHtml: source.contentHtml,
    createdAt: source.createdAt,
  }
}

export type HelpTicketName = { readonly id: UUID; readonly name?: string }
