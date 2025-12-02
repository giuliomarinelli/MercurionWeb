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
}

export type TicketStatus = 'Open' | 'WaitingUser' | 'WaitingSupport' | 'Closed'

export type AuthorType = 'User' | 'Support'

export interface TicketMessage {
  id: string
  publicId: string
  ticketId: string
  ticket: Ticket
  authorType: AuthorType
  userId: string
  contentDelta: JsonValue
  contentHtml: string
  createdAt: string
}


