import { Args, ID, Info, Mutation, Query, Resolver } from "@nestjs/graphql";
import { AuthenticatedUserId } from "src/metadata/metadata";
import { UUID } from "crypto";
import { GraphQLResolveInfo } from "graphql";
import { GraphQLUtils } from "src/utils/graphql-utils/graphql-utils";
import { SynthStep } from "../Models/entities/synth-step.entity";
import { SyntheticStepService } from "../services/synthetic-step.service";
import { SynthStepInput } from "../Models/DTO/synth-step.input";
import { GeneralUtils } from "src/utils/general-utils/general-utils";

@Resolver(() => SynthStep)
export class SyntheticStepResolver {

    constructor(private readonly service: SyntheticStepService) { }

    private ensureUuid(value: string, field: string): void {
        GeneralUtils.ensureValidUUIDv7(value, `GraphQLInvalid::Invalid ${field}`)
    }

    @Query(() => [SynthStep])
    async syntheticStepsByRoute(
        @Args('routeId', { type: () => ID }) routeId: UUID,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo
    ) {
        this.ensureUuid(routeId, 'routeId')
        const fieldsMap = GraphQLUtils.getFieldsMap(info)
        return this.service.findByRoute(userId, routeId, fieldsMap)
    }

    @Query(() => SynthStep, { nullable: true })
    async syntheticStepById(
        @Args('id', { type: () => ID }) id: UUID,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo
    ) {
        this.ensureUuid(id, 'id')
        const fieldsMap = GraphQLUtils.getFieldsMap(info)
        return this.service.findOneById(userId, id, fieldsMap)
    }

    @Mutation(() => SynthStep)
    async createSyntheticStep(
        @AuthenticatedUserId() userId: UUID,
        @Args('input') input: SynthStepInput
    ) {
        return this.service.create(userId, input)
    }

    @Mutation(() => SynthStep)
    async updateSyntheticStep(
        @AuthenticatedUserId() userId: UUID,
        @Args('id', { type: () => ID }) id: UUID,
        @Args('input') input: SynthStepInput,
        @Info() info: GraphQLResolveInfo
    ) {
        this.ensureUuid(id, 'id')
        const fieldsMap = GraphQLUtils.getFieldsMap(info)
        return this.service.update(userId, id, input, fieldsMap)
    }

    @Mutation(() => Boolean)
    async deleteSyntheticStep(
        @AuthenticatedUserId() userId: UUID,
        @Args('id', { type: () => ID }) id: UUID
    ) {
        this.ensureUuid(id, 'id')
        return this.service.delete(userId, id)
    }
}
