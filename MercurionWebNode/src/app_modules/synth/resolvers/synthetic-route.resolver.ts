import { Resolver, Query, Mutation, Args, ID, Info } from "@nestjs/graphql";
import { AuthenticatedUserId } from "src/metadata/metadata";
import { UUID } from "crypto";
import { GraphQLResolveInfo } from 'graphql';
import { GraphQLUtils } from "src/utils/graphql-utils/graphql-utils";
import { Synthesis } from "../Models/entities/synthesis.entity";
import { SynthesisService } from "../services/synthesis.service";
import { SynthesisInput } from "../Models/DTO/synthesis.input";
import { GeneralUtils } from "src/utils/general-utils/general-utils";

@Resolver(() => Synthesis)
export class SyntheticRouteResolver {

    constructor(private readonly routeService: SynthesisService) { }

    private ensureUuid(value: string, field: string): void {
        GeneralUtils.ensureValidUUIDv7(value, `GraphQLInvalid::Invalid ${field}`)
    }

    @Query(() => [Synthesis])
    async mySyntheticRoutes(
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo
    ) {
        const fieldsMap = GraphQLUtils.getFieldsMap(info)
        return this.routeService.findAllByUser(userId, fieldsMap)
    }

    @Query(() => Synthesis, { nullable: true })
    async syntheticRoute(
        @Args('id', { type: () => ID }) id: UUID,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo
    ) {
        this.ensureUuid(id, 'id')
        const fieldsMap = GraphQLUtils.getFieldsMap(info);
        return this.routeService.findOne(id, userId, fieldsMap);
    }

    @Mutation(() => Synthesis)
    async createSyntheticRoute(
        @AuthenticatedUserId() userId: UUID,
        @Args('input') input: SynthesisInput
    ) {
        return this.routeService.create(userId, input);
    }

    @Mutation(() => Synthesis)
    async updateSyntheticRoute(
        @AuthenticatedUserId() userId: UUID,
        @Args('id', { type: () => ID }) id: UUID,
        @Args('input') input: SynthesisInput,
        @Info() info: GraphQLResolveInfo
    ) {
        this.ensureUuid(id, 'id')
        const fieldsMap = GraphQLUtils.getFieldsMap(info)
        return this.routeService.update(id, userId, input, fieldsMap)
    }

    @Mutation(() => Boolean)
    async deleteSyntheticRoute(
        @AuthenticatedUserId() userId: UUID,
        @Args('id', { type: () => ID }) id: UUID
    ) {
        this.ensureUuid(id, 'id')
        return this.routeService.delete(id, userId)
    }
}
