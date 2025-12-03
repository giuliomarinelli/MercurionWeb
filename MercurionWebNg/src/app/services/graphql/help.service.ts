import { inject, Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { map, Observable } from 'rxjs';
import { ClientTicket, Ticket, TicketMessage } from '../../Models/graphql/help.models';
import { ADD_SUPPORT_TICKET_MESSAGE, ADD_TICKET_MESSAGE, CLOSE_MY_TICKET, CLOSE_TICKET_AS_SUPPORT, CREATE_TICKET, MY_TICKET_DETAIL, MY_TICKET_MESSAGES, MY_TICKETS, REOPEN_TICKET_AS_SUPPORT, TICKET_DETAIL_AS_SUPPORT, TICKET_MESSAGES_AS_SUPPORT, TICKETS_AS_SUPPORT } from './graphql-actions/help.gql-actions';
import { extractGqlData } from './graphql-helpers/extract-gql-data.gql-helper';
import { PageModel } from '../../Models/graphql/page.models';
import { JsonValue } from '../../Models/json.models';

@Injectable({
  providedIn: 'root'
})
export class HelpService {

  private readonly apollo = inject(Apollo)

  public myTicketDetail(ticketId: string): Observable<ClientTicket> {
    return this.apollo
      .watchQuery<{ myTicketDetail: { ticket: ClientTicket } }>({
        query: MY_TICKET_DETAIL,
        variables: {
          ticketId
        },
        fetchPolicy: 'network-only'
      }).valueChanges.pipe(
        map((res) => extractGqlData(res, 'myTicketDetail')),
        map((res: { ticket: ClientTicket }) => res.ticket)
      )
  }

  public myTickets(page: number, limit: number): Observable<PageModel<ClientTicket>> {
    return this.apollo
      .watchQuery<{ myTickets: PageModel<ClientTicket> }>({
        query: MY_TICKETS,
        variables: {
          page,
          limit
        },
        fetchPolicy: 'network-only'
      }).valueChanges.pipe(
        map((res) => extractGqlData(res, 'myTickets'))
      )
  }

  public myTicketMessages(page: number, limit: number, ticketId: string): Observable<PageModel<TicketMessage>> {
    return this.apollo
      .watchQuery<{ myTicketMessages: PageModel<TicketMessage> }>({
        query: MY_TICKET_MESSAGES,
        variables: {
          page,
          limit,
          ticketId
        }
      }).valueChanges.pipe(
        map((res) => extractGqlData(res, 'myTicketMessages'))
      )
  }

  public createTicket(subject: string, contentHtml: string, contentDelta: JsonValue): Observable<ClientTicket> {
    return this.apollo
      .mutate<{ createTicket: ClientTicket }>({
        mutation: CREATE_TICKET,
        variables: {
          subject,
          contentHtml,
          contentDelta
        }
      }).pipe(
        map((res) => extractGqlData(res, 'createTicket'))
      )
  }

  public addTicketMessage(ticketId: string, contentDelta: JsonValue, contentHtml: string): Observable<boolean> {
    return this.apollo
      .mutate<{ addTicketMessage: boolean }>({
        mutation: ADD_TICKET_MESSAGE,
        variables: {
          ticketId,
          contentDelta,
          contentHtml
        }
      }).pipe(
        map((res) => extractGqlData(res, 'addTicketMessage'))
      )
  }

  public closeMyTicket(ticketId: string): Observable<boolean> {
    return this.apollo
      .mutate<{ closeMyTicket: boolean }>({
        mutation: CLOSE_MY_TICKET,
        variables: {
          ticketId
        }
      }).pipe(
        map((res) => extractGqlData(res, 'closeMyTicket'))
      )
  }

  public ticketDetailAsSupport(ticketId: string): Observable<Ticket> {
    return this.apollo
      .watchQuery<{ ticketDetailAsSupport: Ticket }>({
        query: TICKET_DETAIL_AS_SUPPORT,
        variables: {
          ticketId
        },
        fetchPolicy: 'network-only'
      }).valueChanges.pipe(
        map((res) => extractGqlData(res, 'ticketDetailAsSupport'))
      )
  }

  public ticketsAsSupport(page: number, limit: number): Observable<PageModel<Ticket>> {
    return this.apollo
      .watchQuery<{ ticketsAsSupport: PageModel<Ticket> }>({
        query: TICKETS_AS_SUPPORT,
        variables: {
          page,
          limit
        },
        fetchPolicy: 'network-only'
      }).valueChanges.pipe(
        map((res) => extractGqlData(res, 'ticketsAsSupport'))
      )
  }

  public ticketMessagesAsSupport(page: number, limit: number, ticketId: number): Observable<PageModel<TicketMessage>> {
    return this.apollo
      .watchQuery<{ ticketMessagesAsSupport: PageModel<TicketMessage> }>({
        query: TICKET_MESSAGES_AS_SUPPORT,
        variables: {
          page,
          limit,
          ticketId
        },
        fetchPolicy: 'network-only'
      }).valueChanges.pipe(
        map((res) => extractGqlData(res, 'ticketMessagesAsSupport'))
      )
  }

  public addSupportTicketMessage(ticketId: string, contentDelta: JsonValue, contentHtml: string): Observable<boolean> {
    return this.apollo
      .mutate<{ addSupportTicketMessage: boolean }>({
        mutation: ADD_SUPPORT_TICKET_MESSAGE,
        variables: {
          ticketId,
          contentDelta,
          contentHtml
        }
      }).pipe(
        map((res) => extractGqlData(res, 'addSupportTicketMessage'))
      )
  }

  public closeTicketAsSupport(ticketId: string): Observable<boolean> {
    return this.apollo
      .mutate<{ closeTicketAsSupport: boolean }>({
        mutation: CLOSE_TICKET_AS_SUPPORT,
        variables: {
          ticketId
        }
      }).pipe(
        map((res) => extractGqlData(res, 'closeTicketAsSupport'))
      )
  }

  public reopenTicketAsSupport(ticketId: string): Observable<boolean> {
    return this.apollo
      .mutate<{ reopenTicketAsSupport: boolean }>({
        mutation: REOPEN_TICKET_AS_SUPPORT,
        variables: {
          ticketId
        }
      }).pipe(
        map((res) => extractGqlData(res, 'reopenTicketAsSupport'))
      )
  }

}
