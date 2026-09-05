import { signal, WritableSignal } from '@angular/core'
import {
  ClientTicket,
  ClientTicketMessage,
  Ticket,
  TicketMessage
} from './help.models'

export interface TicketViewState {
  triggerDisappear: WritableSignal<boolean>
  collapse: WritableSignal<boolean>
}

export type TicketViewModel = (Ticket | ClientTicket) & TicketViewState

export interface TicketMessageViewState {
  triggerDisappear: WritableSignal<boolean>
  collapse: WritableSignal<boolean>
}

export type TicketMessageViewModel = (TicketMessage | ClientTicketMessage) & TicketMessageViewState

export function toTicketViewModel<T extends Ticket | ClientTicket>(ticket: T): T & TicketViewState {
  return {
    ...ticket,
    triggerDisappear: signal(false),
    collapse: signal(false)
  }
}

export function toTicketMessageViewModel<T extends TicketMessage | ClientTicketMessage>(
  message: T
): T & TicketMessageViewState {
  return {
    ...message,
    triggerDisappear: signal(false),
    collapse: signal(false)
  }
}
