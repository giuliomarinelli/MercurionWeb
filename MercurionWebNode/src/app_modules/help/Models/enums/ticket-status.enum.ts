import { registerEnumType } from "@nestjs/graphql";

export enum TicketStatus {
  Open = 'Open',
  WaitingUser = 'WaitingUser',
  WaitingSupport = 'WaitingSupport',
  Closed = 'Closed'
}

registerEnumType(TicketStatus, { name: 'TicketStatus' })