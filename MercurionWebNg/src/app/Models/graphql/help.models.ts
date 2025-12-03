import { JsonValue } from "../json.models"

export interface TicketDetailDTO {
  ticket: Ticket
}

export interface Ticket {
  id: string
  publicId: string
  subject: string
  status: TicketStatus
  lastMessageAt: string
  createdAt: string
  updatedAt: string
  userId: string
  userFullName: string
}

export type ClientTicket = Omit<Ticket, 'userId' | 'userFullName'>

export type TicketStatus = 'Open' | 'WaitingUser' | 'WaitingSupport' | 'Closed'

export type AuthorType = 'User' | 'Support'

export interface TicketMessage {
  id: string
  publicId: string
  ticketId: string
  ticket: Ticket
  authorType: AuthorType
  userId: string
  authorId: string
  userFullName: string
  authorFullName: string
  contentDelta: JsonValue
  contentHtml: string
  createdAt: string
}

export type ClientTicketMessage = Omit<TicketMessage, 'userId' | 'authorId' | 'userFullName' | 'authorFullName'>


