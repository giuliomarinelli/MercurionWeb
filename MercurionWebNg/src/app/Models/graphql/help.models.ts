import { WritableSignal } from "@angular/core"
import { JsonValue } from "../json.models"
import type {
  AuthorType,
  MyTicketDetailQuery,
  MyTicketMessagesQuery,
  TicketDetailAsSupportQuery,
  TicketMessagesAsSupportQuery,
  TicketStatus
} from "../../generated/graphql"

export type { AuthorType, TicketStatus } from "../../generated/graphql"

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
  userId: string | null
  userFullName: string | null
  triggerDisappear: WritableSignal<boolean>
  collapse: WritableSignal<boolean>
}

export type APITicket = TicketDetailAsSupportQuery['ticketDetailAsSupport']['ticket']

export type APIClientTicket = MyTicketDetailQuery['myTicketDetail']['ticket']

export type ClientTicket = Omit<Ticket, 'userId' | 'userFullName'>

export type TicketCardMode = 'user' | 'support'

export interface TicketMessage {
  id: string
  publicId: string
  ticketId: string
  ticket?: Ticket
  authorType: AuthorType
  userId: string | null
  authorId: string | null
  userFullName: string | null
  authorFullName: string | null
  contentDelta: JsonValue
  contentHtml: string
  createdAt: string
  triggerDisappear: WritableSignal<boolean>
  collapse: WritableSignal<boolean>
}

export type APITicketMessage = TicketMessagesAsSupportQuery['ticketMessagesAsSupport']['items'][number]

export type APIClientTicketMessage = MyTicketMessagesQuery['myTicketMessages']['items'][number]

export type ClientTicketMessage = Omit<TicketMessage, 'userId' | 'authorId' | 'userFullName' | 'authorFullName'>
