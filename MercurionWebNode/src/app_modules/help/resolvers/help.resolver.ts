import {
    Resolver, Query, Mutation, Args, Info, ID,
} from '@nestjs/graphql'
import { GraphQLResolveInfo } from 'graphql'
import { UUID } from 'crypto'
import { GraphQLUtils } from 'src/utils/graphql-utils/graphql-utils'
import { GraphQLFieldsMap } from 'src/utils/type-orm-utils/type-orm-utils'
import { Scope } from 'src/app_modules/user/models/enums/scope.enum'
import { HelpService } from '../services/help.service'
import { TicketResponse } from '../models/dto/help-response.dto'
import { TicketDetailDTO } from '../models/dto/ticket-detail.dto'
import { AuthenticatedUserId, HasScopes, Scopes, SoftAuthorization } from 'src/metadata/metadata'
import { JsonValue } from 'src/models/json.types'
import GraphQLJSON from 'graphql-type-json'
import { PaginatedTicket } from '../models/dto/paginated-ticket.type.gql'
import { GeneralUtils } from 'src/utils/general-utils/general-utils'
import { assertMercurionPublicId } from 'src/identifiers/mercurion-public-id'
import { PaginatedTicketMessage } from '../models/dto/paginated-ticket-message.type.gql'
import { PaginationArgs } from 'src/models/pagination/pagination.args'
import { toFlatPagination } from 'src/models/pagination/pagination.utils'
import { ownerActor, supportActor } from '../authorization/help-authorization.policy'


@Resolver(() => TicketResponse)
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
        assertMercurionPublicId(ticketId, 'ticketId')
        const fieldsMap = GraphQLUtils.getFieldsMap(info)
        return this.helpService.getTicketDetail(
            ticketId,
            ownerActor(userId, scopes),
            fieldsMap as GraphQLFieldsMap,
        )
    }

    @Query(() => PaginatedTicket)
    async myTickets(
        @Args() pagination: PaginationArgs,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo,
        @Scopes() scopes: Scope[]
    ): Promise<PaginatedTicket> {
        const fieldsMap = GraphQLUtils.getFieldsMap(info)
        const result = await this.helpService.listTickets(
            ownerActor(userId, scopes),
            pagination,
            fieldsMap as GraphQLFieldsMap,
        )
        return toFlatPagination(result)
    }

    @Query(() => PaginatedTicketMessage)
    async myTicketMessages(
        @Args() pagination: PaginationArgs,
        @Args('ticketId', { type: () => ID }) ticketId: UUID,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo,
        @Scopes() scopes: Scope[]
    ): Promise<PaginatedTicketMessage> {
        assertMercurionPublicId(ticketId, 'ticketId')
        const fieldsMap = GraphQLUtils.getFieldsMap(info)
        const result = await this.helpService.listTicketMessages(ticketId, ownerActor(userId, scopes), pagination, fieldsMap)
        return toFlatPagination(result)
    }

    @SoftAuthorization()
    @Query(() => Boolean)
    async existsUserTicketById(
        @AuthenticatedUserId() userId: UUID,
        @Args('ticketId', { type: () => ID }) ticketId: UUID
    ): Promise<boolean> {
        assertMercurionPublicId(ticketId, 'ticketId')
        return this.helpService.existsUserTicketById(ownerActor(userId), ticketId)
    }

    // --------------------------------
    // USER MUTATIONS (owner)
    // --------------------------------

    @Mutation(() => TicketResponse)
    async createTicket(
        @AuthenticatedUserId() userId: UUID,
        @Args('subject') subject: string,
        @Args('contentDelta', { type: () => GraphQLJSON }) contentDelta: string | JsonValue,
        @Args('contentHtml') contentHtml: string,
        @Scopes() scopes: Scope[]
    ): Promise<TicketResponse> {
        const normalizedSubject = GeneralUtils.normalizeSpaces(subject)
        return this.helpService.createTicket(ownerActor(userId, scopes), { subject: normalizedSubject, contentDelta, contentHtml })
    }

    @Mutation(() => Boolean)
    async addTicketMessage(
        @AuthenticatedUserId() userId: UUID,
        @Args('ticketId', { type: () => ID }) ticketId: UUID,
        @Args('contentDelta', { type: () => GraphQLJSON }) contentDelta: JsonValue,
        @Args('contentHtml') contentHtml: string,
    ): Promise<boolean> {
        assertMercurionPublicId(ticketId, 'ticketId')
        await this.helpService.addUserMessage(ownerActor(userId), { ticketId, contentDelta, contentHtml })
        return true
    }

    @Mutation(() => Boolean)
    async closeMyTicket(
        @AuthenticatedUserId() userId: UUID,
        @Args('ticketId', { type: () => ID }) ticketId: UUID,
    ): Promise<boolean> {
        assertMercurionPublicId(ticketId, 'ticketId')
        await this.helpService.closeTicket(ownerActor(userId), ticketId)
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
        assertMercurionPublicId(ticketId, 'ticketId')
        const fieldsMap = GraphQLUtils.getFieldsMap(info)
        return this.helpService.getTicketDetail(
            ticketId,
            supportActor(userId, scopes),
            fieldsMap as GraphQLFieldsMap,
        )
    }

    @HasScopes(Scope.HandleTickets) // Se non ha lo scope HandleTickets viene restituito un errore 403
    @Query(() => PaginatedTicket)
    async ticketsAsSupport(
        @Args() pagination: PaginationArgs,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo,
        @Scopes() scopes: Scope[]
    ): Promise<PaginatedTicket> {
        const fieldsMap = GraphQLUtils.getFieldsMap(info)
        const result = await this.helpService.listTickets(
            supportActor(userId, scopes),
            pagination,
            fieldsMap as GraphQLFieldsMap,
        )
        return toFlatPagination(result)
    }

    @HasScopes(Scope.HandleTickets)
    @Query(() => PaginatedTicketMessage)
    async ticketMessagesAsSupport(
        @Args() pagination: PaginationArgs,
        @Args('ticketId', { type: () => ID }) ticketId: UUID,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo,
        @Scopes() scopes: Scope[]
    ): Promise<PaginatedTicketMessage> {
        assertMercurionPublicId(ticketId, 'ticketId')
        const fieldsMap = GraphQLUtils.getFieldsMap(info)
        const result = await this.helpService.listTicketMessages(ticketId, supportActor(userId, scopes), pagination, fieldsMap)
        return toFlatPagination(result)
    }

    // --------------------------------
    // SUPPORT MUTATIONS (HandleTickets)
    // --------------------------------

    @HasScopes(Scope.HandleTickets)
    @Mutation(() => Boolean)
    async addSupportTicketMessage(
        @AuthenticatedUserId() userId: UUID,
        @Scopes() scopes: Scope[],
        @Args('ticketId', { type: () => ID }) ticketId: UUID,
        @Args('contentDelta', { type: () => GraphQLJSON }) contentDelta: JsonValue,
        @Args('contentHtml') contentHtml: string,
    ): Promise<boolean> {
        assertMercurionPublicId(ticketId, 'ticketId')
        await this.helpService.addSupportMessage(supportActor(userId, scopes), { ticketId, contentDelta, contentHtml })
        return true
    }

    @HasScopes(Scope.HandleTickets)
    @Mutation(() => Boolean)
    async closeTicketAsSupport(
        @AuthenticatedUserId() userId: UUID,
        @Scopes() scopes: Scope[],
        @Args('ticketId', { type: () => ID }) ticketId: UUID,
    ): Promise<boolean> {
        assertMercurionPublicId(ticketId, 'ticketId')
        await this.helpService.closeTicket(supportActor(userId, scopes), ticketId)
        return true
    }

    @HasScopes(Scope.HandleTickets)
    @Mutation(() => Boolean)
    async reopenTicketAsSupport(
        @AuthenticatedUserId() userId: UUID,
        @Scopes() scopes: Scope[],
        @Args('ticketId', { type: () => ID }) ticketId: UUID,
    ): Promise<boolean> {
        assertMercurionPublicId(ticketId, 'ticketId')
        await this.helpService.reopenTicket(supportActor(userId, scopes), ticketId)
        return true
    }

}
