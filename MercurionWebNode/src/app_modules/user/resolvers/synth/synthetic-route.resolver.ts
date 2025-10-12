import { Resolver, Query, Mutation, Args, ID, Info } from "@nestjs/graphql";
import { AuthenticatedUserId } from "src/metadata/metadata";
import { UUID } from "crypto";
import { GraphQLResolveInfo } from 'graphql';
import { GraphqlUtils } from "src/utils/graphql-utils/graphql-utils";
import { SyntheticRouteEntity } from "../../Models/entities/synth/synthetic-route.entity";
import { SyntheticRouteService } from "../../services/synth/synthetic-route.service";
import { SyntheticRouteInput } from "../../Models/DTO/synth/synthetic-route.input";

@Resolver(() => SyntheticRouteEntity)
export class SyntheticRouteResolver {

    constructor(private readonly routeService: SyntheticRouteService) { }

    @Query(() => [SyntheticRouteEntity])
    async mySyntheticRoutes(
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo
    ) {
        const fieldsMap = GraphqlUtils.getFieldsMap(info)
        return this.routeService.findAllByUser(userId, fieldsMap)
    }

    @Query(() => SyntheticRouteEntity, { nullable: true })
    async syntheticRoute(
        @Args('id', { type: () => ID }) id: UUID,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo
    ) {
        const fieldsMap = GraphqlUtils.getFieldsMap(info);
        return this.routeService.findOne(id, userId, fieldsMap);
    }

    @Mutation(() => SyntheticRouteEntity)
    async createSyntheticRoute(
        @AuthenticatedUserId() userId: UUID,
        @Args('input') input: SyntheticRouteInput
    ) {
        return this.routeService.create(userId, input);
    }

    @Mutation(() => SyntheticRouteEntity)
    async updateSyntheticRoute(
        @AuthenticatedUserId() userId: UUID,
        @Args('id', { type: () => ID }) id: UUID,
        @Args('input') input: SyntheticRouteInput,
        @Info() info: GraphQLResolveInfo
    ) {
        const fieldsMap = GraphqlUtils.getFieldsMap(info)
        return this.routeService.update(id, userId, input, fieldsMap)
    }

    @Mutation(() => Boolean)
    async deleteSyntheticRoute(
        @AuthenticatedUserId() userId: UUID,
        @Args('id', { type: () => ID }) id: UUID
    ) {
        return this.routeService.delete(id, userId)
    }
}
