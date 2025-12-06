import {
    Resolver, Query, Mutation, Args, Info, ID,
    Int
} from '@nestjs/graphql'
import { GraphQLResolveInfo } from 'graphql'
import { UUID } from 'crypto'
import { GraphQLUtils } from 'src/utils/graphql-utils/graphql-utils'
import { GraphQLFieldsMap } from 'src/utils/type-orm-utils/type-orm-utils'
import { Scope } from 'src/app_modules/user/Models/enums/scope.enum'
import { HelpService } from '../services/help.service'
import { Ticket } from '../Models/entities/ticket.entity'
import { TicketDetailDTO } from '../Models/DTO/ticket-detail.dto'
import { AuthenticatedUserId, HasScopes, Scopes } from 'src/metadata/metadata'
import { JsonValue } from 'src/Models/json.types'
import GraphQLJSON from 'graphql-type-json'
import { PaginatedTicket } from '../Models/DTO/paginated-ticket.type.gql'
import { GeneralUtils } from 'src/utils/general-utils/general-utils'
import { PaginatedTicketMessage } from '../Models/DTO/paginated-ticket-message.type.gql'


@Resolver(() => Ticket)
export class HelpResolver {

    constructor(private readonly helpService: HelpService) { }

    // --------------------------------
    // USER QUERIES (owner)
    // --------------------------------

    @Query(() => TicketDetailDTO)
    async myTicketDetail(
        @Args('ticketId', { type: () => ID }) ticketId: UUID,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo,
        @Scopes() scopes: Scope[]
    ): Promise<TicketDetailDTO> {
        const fieldsMap = GraphQLUtils.getFieldsMap(info)
        return this.helpService.getTicketDetail(
            ticketId,
            userId,
            fieldsMap as GraphQLFieldsMap,
            true,
            scopes.includes(Scope.ViewUsers)
        )
    }

    @Query(() => PaginatedTicket)
    async myTickets(
        @Args('page', { type: () => Int }) page: number = 1,
        @Args('limit', { type: () => Int }) limit: number = 20,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo,
        @Scopes() scopes: Scope[]
    ): Promise<PaginatedTicket> {
        const fieldsMap = GraphQLUtils.getFieldsMap(info)
        const pagination = await this.helpService.listTickets(
            userId,
            { page, limit },
            fieldsMap as GraphQLFieldsMap,
            true, 
            scopes.includes(Scope.ViewUsers)
        )
        const flat = GeneralUtils.paginationToFlatPaginationConverter(pagination)
        return {
            ...flat
        }
    }

    @Query(() => PaginatedTicketMessage)
    async myTicketMessages(
        @Args('page', { type: () => Int }) page: number = 1,
        @Args('limit', { type: () => Int }) limit: number = 20,
        @Args('ticketId', { type: () => ID }) ticketId: UUID,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo,
        @Scopes() scopes: Scope[]
    ): Promise<PaginatedTicketMessage> {
        const fieldsMap = GraphQLUtils.getFieldsMap(info)
        const pagination = await this.helpService.listTicketMessages(ticketId, userId, { page, limit }, fieldsMap, true, scopes.includes(Scope.ViewUsers))
        const flat = GeneralUtils.paginationToFlatPaginationConverter(pagination)
        return {
            ...flat
        }
    }

    // --------------------------------
    // USER MUTATIONS (owner)
    // --------------------------------

    @Mutation(() => Ticket)
    async createTicket(
        @AuthenticatedUserId() userId: UUID,
        @Args('subject') subject: string,
        @Args('contentDelta', { type: () => GraphQLJSON }) contentDelta: string | JsonValue,
        @Args('contentHtml') contentHtml: string,
        @Scopes() scopes: Scope[]
    ): Promise<Ticket> {
        return this.helpService.createTicket({ userId, subject, contentDelta, contentHtml }, scopes.includes(Scope.ViewUsers))
    }

    @Mutation(() => Boolean)
    async addTicketMessage(
        @AuthenticatedUserId() userId: UUID,
        @Args('ticketId', { type: () => ID }) ticketId: UUID,
        @Args('contentDelta', { type: () => GraphQLJSON }) contentDelta: JsonValue,
        @Args('contentHtml') contentHtml: string,
    ): Promise<boolean> {
        await this.helpService.addUserMessage({ ticketId, userId, contentDelta, contentHtml })
        return true
    }

    @Mutation(() => Boolean)
    async closeMyTicket(
        @AuthenticatedUserId() userId: UUID,
        @Args('ticketId', { type: () => ID }) ticketId: UUID,
    ): Promise<boolean> {
        // ownership check implicito: se non è tuo, TicketNotFound
        await this.helpService.getTicketDetail(
            ticketId,
            userId,
            { ticket: { id: {} } },
            true
        )
        await this.helpService.closeTicket(ticketId)
        return true
    }

    // --------------------------------
    // SUPPORT QUERIES (HandleTickets)
    // --------------------------------

    @HasScopes(Scope.HandleTickets)
    @Query(() => TicketDetailDTO)
    async ticketDetailAsSupport(
        @Args('ticketId', { type: () => ID }) ticketId: UUID,
        @AuthenticatedUserId() userId: UUID, 
        @Info() info: GraphQLResolveInfo,
        @Scopes() scopes: Scope[]
    ): Promise<TicketDetailDTO> {
        const fieldsMap = GraphQLUtils.getFieldsMap(info)
        return this.helpService.getTicketDetail(
            ticketId,
            userId,
            fieldsMap as GraphQLFieldsMap,
            false,
            scopes.includes(Scope.ViewUsers)
        )
    }

    @HasScopes(Scope.HandleTickets) // Se non ha lo scope HandleTickets viene restituito un errore 403
    @Query(() => PaginatedTicket)
    async ticketsAsSupport(
        @Args('page', { type: () => Int }) page: number = 1,
        @Args('limit', { type: () => Int }) limit: number = 20,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo,
        @Scopes() scopes: Scope[]
    ): Promise<PaginatedTicket> {
        const fieldsMap = GraphQLUtils.getFieldsMap(info)
        const pagination = await this.helpService.listTickets(
            userId,
            { page, limit },
            fieldsMap as GraphQLFieldsMap,
            false,
            scopes.includes(Scope.ViewUsers) /* Se ha lo scope HandleTickets ma non ha lo scope ViewUsers, allora potrà vedere 
                tutti i ticket di supporto presenti nel sistema, ma gli userId avranno valore null, se invece ha anche lo scope
                ViewUsers, allora potrà vedere tutti i ticket di supporto del sistema e gli userId saranno valorizzati  */
        )
        const flat = GeneralUtils.paginationToFlatPaginationConverter(pagination)
        return {
            ...flat
        }
    }

    @HasScopes(Scope.HandleTickets)
    @Query(() => PaginatedTicketMessage)
    async ticketMessagesAsSupport(
        @Args('page', { type: () => Int }) page: number = 1,
        @Args('limit', { type: () => Int }) limit: number = 20,
        @Args('ticketId', { type: () => ID }) ticketId: UUID,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo,
        @Scopes() scopes: Scope[]
    ): Promise<PaginatedTicketMessage> {
        const fieldsMap = GraphQLUtils.getFieldsMap(info)
        const pagination = await this.helpService.listTicketMessages(ticketId, userId, { page, limit }, fieldsMap, false, scopes.includes(Scope.ViewUsers))
        const flat = GeneralUtils.paginationToFlatPaginationConverter(pagination)
        return {
            ...flat
        }
    }

    // --------------------------------
    // SUPPORT MUTATIONS (HandleTickets)
    // --------------------------------

    @HasScopes(Scope.HandleTickets)
    @Mutation(() => Boolean)
    async addSupportTicketMessage(
        @Args('ticketId', { type: () => ID }) ticketId: UUID,
        @Args('contentDelta', { type: () => GraphQLJSON }) contentDelta: JsonValue,
        @Args('contentHtml') contentHtml: string,
    ): Promise<boolean> {
        await this.helpService.addSupportMessage({ ticketId, contentDelta, contentHtml })
        return true
    }

    @HasScopes(Scope.HandleTickets)
    @Mutation(() => Boolean)
    async closeTicketAsSupport(
        @Args('ticketId', { type: () => ID }) ticketId: UUID,
    ): Promise<boolean> {
        await this.helpService.closeTicket(ticketId)
        return true
    }

    @HasScopes(Scope.HandleTickets)
    @Mutation(() => Boolean)
    async reopenTicketAsSupport(
        @Args('ticketId', { type: () => ID }) ticketId: UUID,
    ): Promise<boolean> {
        await this.helpService.reopenTicket(ticketId)
        return true
    }

}
