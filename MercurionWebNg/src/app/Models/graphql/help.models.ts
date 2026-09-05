import type {
  MyTicketDetailQuery,
  MyTicketMessagesQuery,
  TicketDetailAsSupportQuery,
  TicketMessagesAsSupportQuery
} from "../../generated/graphql"

export type { AuthorType, TicketStatus } from "../../generated/graphql"

export interface TicketDetailDTO {
  ticket: Ticket
}

export type APITicket = Readonly<TicketDetailAsSupportQuery['ticketDetailAsSupport']['ticket']>

export type APIClientTicket = Readonly<MyTicketDetailQuery['myTicketDetail']['ticket']>

export type Ticket = APITicket

export type ClientTicket = APIClientTicket

export type TicketCardMode = 'user' | 'support'

export type APITicketMessage = Readonly<TicketMessagesAsSupportQuery['ticketMessagesAsSupport']['items'][number]>

export type APIClientTicketMessage = Readonly<MyTicketMessagesQuery['myTicketMessages']['items'][number]>

export type TicketMessage = APITicketMessage

export type ClientTicketMessage = APIClientTicketMessage
