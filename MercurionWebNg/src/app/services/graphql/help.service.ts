import { inject, Injectable, signal } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { map, Observable } from 'rxjs';
import { ClientTicket, ClientTicketMessage, Ticket, TicketMessage } from '../../Models/graphql/help.models';
import { extractGqlData } from './graphql-helpers/v1/extract-gql-data.helper';
import { PageModel } from '../../Models/graphql/page.models';
import { JsonValue } from '../../Models/json.models';
import { extractGqlDataV2 } from './graphql-helpers/v2/extract-gql-data-v2.helper';
import {
  AddSupportTicketMessageDocument,
  AddSupportTicketMessageMutation,
  AddSupportTicketMessageMutationVariables,
  AddTicketMessageDocument,
  AddTicketMessageMutation,
  AddTicketMessageMutationVariables,
  CloseMyTicketDocument,
  CloseMyTicketMutation,
  CloseMyTicketMutationVariables,
  CloseTicketAsSupportDocument,
  CloseTicketAsSupportMutation,
  CloseTicketAsSupportMutationVariables,
  CreateTicketDocument,
  CreateTicketMutation,
  CreateTicketMutationVariables,
  ExistsUserTicketByIdDocument,
  ExistsUserTicketByIdQuery,
  ExistsUserTicketByIdQueryVariables,
  MyTicketDetailDocument,
  MyTicketDetailQuery,
  MyTicketDetailQueryVariables,
  MyTicketMessagesDocument,
  MyTicketMessagesQuery,
  MyTicketMessagesQueryVariables,
  MyTicketsDocument,
  MyTicketsQuery,
  MyTicketsQueryVariables,
  ReopenTicketAsSupportDocument,
  ReopenTicketAsSupportMutation,
  ReopenTicketAsSupportMutationVariables,
  TicketDetailAsSupportDocument,
  TicketDetailAsSupportQuery,
  TicketDetailAsSupportQueryVariables,
  TicketMessagesAsSupportDocument,
  TicketMessagesAsSupportQuery,
  TicketMessagesAsSupportQueryVariables,
  TicketsAsSupportDocument,
  TicketsAsSupportQuery,
  TicketsAsSupportQueryVariables
} from '../../generated/graphql';

@Injectable({
  providedIn: 'root'
})
export class HelpService {

  private readonly apollo = inject(Apollo)

  public myTicketDetail(ticketId: string): Observable<ClientTicket> {
    return this.apollo
      .watchQuery<MyTicketDetailQuery, MyTicketDetailQueryVariables>({
        query: MyTicketDetailDocument,
        variables: {
          ticketId
        },
        fetchPolicy: 'network-only'
      }).valueChanges.pipe(
        map((res) => extractGqlData<MyTicketDetailQuery, 'myTicketDetail'>(res, 'myTicketDetail')),
        map((res) => res.ticket),
        map((res) => ({
          ...res,
          triggerDisappear: signal<boolean>(false),
          collapse: signal<boolean>(false)
        }))
      )
  }

  public myTickets(page: number, limit: number): Observable<PageModel<ClientTicket>> {
    return this.apollo
      .watchQuery<MyTicketsQuery, MyTicketsQueryVariables>({
        query: MyTicketsDocument,
        variables: {
          page,
          limit
        },
        fetchPolicy: 'network-only'
      }).valueChanges.pipe(
        map((res) => extractGqlData<MyTicketsQuery, 'myTickets'>(res, 'myTickets')),
        map((res) => ({
          ...res,
          items: res.items.map((i) => ({
            ...i,
            triggerDisappear: signal<boolean>(false),
            collapse: signal<boolean>(false)
          }))
        }))
      )
  }

  public myTicketMessages(page: number, limit: number, ticketId: string): Observable<PageModel<ClientTicketMessage>> {
    return this.apollo
      .watchQuery<MyTicketMessagesQuery, MyTicketMessagesQueryVariables>({
        query: MyTicketMessagesDocument,
        variables: {
          page,
          limit,
          ticketId
        },
        fetchPolicy: 'network-only'
      }).valueChanges.pipe(
        map((res) => extractGqlData<MyTicketMessagesQuery, 'myTicketMessages'>(res, 'myTicketMessages')),
        map((p) => ({
          ...p,
          items: p.items.map((m) => ({
            ...m,
            triggerDisappear: signal<boolean>(false),
            collapse: signal<boolean>(false)
          }))
        }))
      )
  }

  public existsUserTicketById(ticketId: string): Observable<boolean> {
    return this.apollo
      .watchQuery<ExistsUserTicketByIdQuery, ExistsUserTicketByIdQueryVariables>({
        query: ExistsUserTicketByIdDocument,
        variables: {
          ticketId
        },
        fetchPolicy: 'network-only'
      }).valueChanges.pipe(
        map((res): boolean => extractGqlDataV2(res, 'existsUserTicketById'))
      )
  }

  public createTicket(subject: string, contentHtml: string, contentDelta: JsonValue): Observable<ClientTicket> {
    return this.apollo
      .mutate<CreateTicketMutation, CreateTicketMutationVariables>({
        mutation: CreateTicketDocument,
        variables: {
          subject,
          contentHtml,
          contentDelta
        }
      }).pipe(
        map((res) => extractGqlData<CreateTicketMutation, 'createTicket'>(res, 'createTicket')),
        map((res) => ({
          ...res,
          triggerDisappear: signal<boolean>(false),
          collapse: signal<boolean>(false)
        }))
      )
  }

  public addTicketMessage(ticketId: string, contentDelta: JsonValue, contentHtml: string): Observable<boolean> {
    return this.apollo
      .mutate<AddTicketMessageMutation, AddTicketMessageMutationVariables>({
        mutation: AddTicketMessageDocument,
        variables: {
          ticketId,
          contentDelta,
          contentHtml
        }
      }).pipe(
        map((res) => extractGqlData<AddTicketMessageMutation, 'addTicketMessage'>(res, 'addTicketMessage'))
      )
  }

  public closeMyTicket(ticketId: string): Observable<boolean> {
    return this.apollo
      .mutate<CloseMyTicketMutation, CloseMyTicketMutationVariables>({
        mutation: CloseMyTicketDocument,
        variables: {
          ticketId
        }
      }).pipe(
        map((res) => extractGqlData<CloseMyTicketMutation, 'closeMyTicket'>(res, 'closeMyTicket'))
      )
  }

  public ticketDetailAsSupport(ticketId: string): Observable<Ticket> {
    return this.apollo
      .watchQuery<TicketDetailAsSupportQuery, TicketDetailAsSupportQueryVariables>({
        query: TicketDetailAsSupportDocument,
        variables: {
          ticketId
        },
        fetchPolicy: 'network-only'
      }).valueChanges.pipe(
        map((res) => extractGqlData<TicketDetailAsSupportQuery, 'ticketDetailAsSupport'>(res, 'ticketDetailAsSupport')),
        map((res) => res.ticket),
        map((res) => ({
          ...res,
          triggerDisappear: signal<boolean>(false),
          collapse: signal<boolean>(false)
        }))
      )
  }

  public ticketsAsSupport(page: number, limit: number): Observable<PageModel<Ticket>> {
    return this.apollo
      .watchQuery<TicketsAsSupportQuery, TicketsAsSupportQueryVariables>({
        query: TicketsAsSupportDocument,
        variables: {
          page,
          limit
        },
        fetchPolicy: 'network-only'
      }).valueChanges.pipe(
        map((res) => extractGqlData<TicketsAsSupportQuery, 'ticketsAsSupport'>(res, 'ticketsAsSupport')),
        map((res) => ({
          ...res,
          items: res.items.map((i) => ({
            ...i,
            collapse: signal<boolean>(false),
            triggerDisappear: signal<boolean>(false)
          }))
        }))
      )
  }

  public ticketMessagesAsSupport(page: number, limit: number, ticketId: string): Observable<PageModel<TicketMessage>> {
    return this.apollo
      .watchQuery<TicketMessagesAsSupportQuery, TicketMessagesAsSupportQueryVariables>({
        query: TicketMessagesAsSupportDocument,
        variables: {
          page,
          limit,
          ticketId
        },
        fetchPolicy: 'network-only'
      }).valueChanges.pipe(
        map((res) => extractGqlData<TicketMessagesAsSupportQuery, 'ticketMessagesAsSupport'>(res, 'ticketMessagesAsSupport')),
        map((res) => ({
          ...res,
          items: res.items.map((i) => ({
            ...i,
            triggerDisappear: signal<boolean>(false),
            collapse: signal<boolean>(false)
          }))
        }))
      )
  }

  public addSupportTicketMessage(ticketId: string, contentDelta: JsonValue, contentHtml: string): Observable<boolean> {
    return this.apollo
      .mutate<AddSupportTicketMessageMutation, AddSupportTicketMessageMutationVariables>({
        mutation: AddSupportTicketMessageDocument,
        variables: {
          ticketId,
          contentDelta,
          contentHtml
        }
      }).pipe(
        map((res) => extractGqlData<AddSupportTicketMessageMutation, 'addSupportTicketMessage'>(res, 'addSupportTicketMessage'))
      )
  }

  public closeTicketAsSupport(ticketId: string): Observable<boolean> {
    return this.apollo
      .mutate<CloseTicketAsSupportMutation, CloseTicketAsSupportMutationVariables>({
        mutation: CloseTicketAsSupportDocument,
        variables: {
          ticketId
        }
      }).pipe(
        map((res) => extractGqlData<CloseTicketAsSupportMutation, 'closeTicketAsSupport'>(res, 'closeTicketAsSupport'))
      )
  }

  public reopenTicketAsSupport(ticketId: string): Observable<boolean> {
    return this.apollo
      .mutate<ReopenTicketAsSupportMutation, ReopenTicketAsSupportMutationVariables>({
        mutation: ReopenTicketAsSupportDocument,
        variables: {
          ticketId
        }
      }).pipe(
        map((res) => extractGqlData<ReopenTicketAsSupportMutation, 'reopenTicketAsSupport'>(res, 'reopenTicketAsSupport'))
      )
  }

}
