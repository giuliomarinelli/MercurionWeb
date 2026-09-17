import { Args, ID, Info, Mutation, Query, Resolver } from "@nestjs/graphql";
import { AuthenticatedUserId } from "src/metadata/metadata";
import { UUID } from "crypto";
import { GraphQLResolveInfo } from "graphql";
import { GraphQLUtils } from "src/utils/graphql-utils/graphql-utils";
import { SynthStep } from "../models/entities/synth-step.entity";
import { SyntheticStepService } from "../services/synthetic-step.service";
import { SynthStepInput } from "../models/dto/synth-step.input";
import { assertMercurionPublicId } from "src/identifiers/mercurion-public-id";
import { SynthCommandResult } from "../models/dto/synth-command-result";

@Resolver(() => SynthStep)
export class SyntheticStepResolver {

    constructor(private readonly service: SyntheticStepService) { }

    @Query(() => [SynthStep])
    async syntheticStepsByRoute(
        @Args('routeId', { type: () => ID }) routeId: UUID,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo
    ) {
        assertMercurionPublicId(routeId, 'routeId')
        const fieldsMap = GraphQLUtils.getFieldsMap(info)
        return this.service.findByRoute(userId, routeId, fieldsMap)
    }

    @Query(() => SynthStep, { nullable: true })
    async syntheticStepById(
        @Args('id', { type: () => ID }) id: UUID,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo
    ) {
        assertMercurionPublicId(id, 'id')
        const fieldsMap = GraphQLUtils.getFieldsMap(info)
        return this.service.findOneById(userId, id, fieldsMap)
    }

    @Mutation(() => SynthStep)
    async createSyntheticStep(
        @AuthenticatedUserId() userId: UUID,
        @Args('input') input: SynthStepInput
    ) {
        assertMercurionPublicId(input.synthId, 'synthId')
        return this.service.create(userId, input)
    }

    @Mutation(() => SynthStep)
    async updateSyntheticStep(
        @AuthenticatedUserId() userId: UUID,
        @Args('id', { type: () => ID }) id: UUID,
        @Args('input') input: SynthStepInput,
        @Info() info: GraphQLResolveInfo
    ) {
        assertMercurionPublicId(id, 'id')
        assertMercurionPublicId(input.synthId, 'synthId')
        const fieldsMap = GraphQLUtils.getFieldsMap(info)
        return this.service.update(userId, id, input, fieldsMap)
    }

    @Mutation(() => SynthCommandResult)
    async deleteSyntheticStep(
        @AuthenticatedUserId() userId: UUID,
        @Args('id', { type: () => ID }) id: UUID
    ) {
        assertMercurionPublicId(id, 'id')
        return this.service.delete(userId, id)
    }
}
